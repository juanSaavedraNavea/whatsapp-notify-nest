import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WhatsAppNotification } from '../schemas/whatsapp-notification.schema';
import { LogNotification } from '../schemas/log-notification.schema';
import { LogReadWhatsAppNotification } from '../schemas/logread-whatsapp.schema';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import * as ExcelJS from 'exceljs';
import type { GroupChat } from 'whatsapp-web.js';
import * as os from 'os';
import * as path from 'path';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly wpp: WhatsAppService,
    @InjectModel(WhatsAppNotification.name) private notifModel: Model<WhatsAppNotification>,
    @InjectModel(LogNotification.name) private logModel: Model<LogNotification>,
    @InjectModel(LogReadWhatsAppNotification.name) private logReadModel: Model<LogReadWhatsAppNotification>,
  ) {}

  private getAttachmentField(typeMessage?: string, msg?: any) {
    switch (typeMessage) {
      case 'File':   return msg?.url ?? '';
      case 'Image':  return msg?.url ?? '';
      case 'Gif':    return msg?.url ?? '';
      case 'Files':  return (msg?.documens ?? []).join('\n');
      case 'Images': return (msg?.images ?? []).join('\n');
      default:       return '';
    }
  }

  async startSessionQR() {
    return this.wpp.getQR();
  }

  async sendCod(cod: string, alert = false) {
    // 1) Traer notificaciones pendientes como en tu aggregate (lo simplifico a dos queries)
    const pending = await this.notifModel.aggregate([
      { $match: { cod, statusSend: false } },
      { $unwind: '$contacts' },
      {
        $group: {
          _id: '$contacts.client',
          contacts: { $push: {
            id: '$_id',
            typeMessage: '$typeMessage',
            type: '$type',
            message: '$message',
            statusSend: '$statusSend',
            name: '$contacts.name',
            number: '$contacts.number',
            username: '$contacts.username',
            profile: '$contacts.profile',
            group: '$contacts.group',
            orchard: '$contacts.orchard',
            client: '$contacts.client',
          } }
        }
      }
    ]);

    if (!pending.length) return { msg: 'No se encontraron mensajes' };

    const client = await this.wpp.maybeReinit();
    if (!client) return { message: 'Cliente no ha iniciado sesión' };

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('DetalleEnvios');
    sheet.columns = [
      { header: 'Codigo de Transacción', key: 'cod' },
      { header: 'Nombre', key: 'name' },
      { header: 'Teléfono', key: 'phone' },
      { header: 'Cliente', key: 'client' },
      { header: 'Huerto', key: 'orchard' },
      { header: 'Usuario', key: 'username' },
      { header: 'Mensaje', key: 'mensaje' },
      { header: 'Adjunto', key: 'adjunto' },
    ];

    for (const group of pending) {
      const log = new this.logModel({
        client: group._id,
        date: new Date(),
        type: 'WhatsApp',
        reportId: cod,
        totalSend: 0,
        detailSend: [],
        totalSendError: 0,
        detailSendError: [],
      });

      for (const phone of group.contacts) {
        try {
          const contactType = phone.group ? '@g.us' : '@c.us';
          const jid = `${phone.number}${contactType}`;
          const msgText: string = (phone?.message?.message ?? '').toString();
          let messageToSend: any = msgText;
          const configMessage: any = {};

          switch (phone.typeMessage) {
            case 'File': {
              const media = await this.wpp.mediaFromUrl(phone.message.url, phone.message.nameFile);
              messageToSend = media;
              configMessage.caption = phone.message.message;
              break;
            }
            case 'Files': {
              for (let i = 0; i < (phone.message.documens ?? []).length; i++) {
                const url = phone.message.documens[i];
                const media = await this.wpp.mediaFromUrl(url, `${phone.message.nameFile} - ${i + 1}`);
                await client.sendMessage(jid, media, configMessage);
              }
              await client.sendMessage(jid, phone.message.message, configMessage);
              await this.notifModel.updateOne({ _id: phone.id }, { statusSend: true });
              continue;
            }
            case 'Gif': {
              // si tienes tu helper gifUrlToMp4Media, intégralo aquí
              const media = await this.wpp.mediaFromUrl(phone.message.url, phone.message.nameFile);
              messageToSend = media;
              configMessage.caption = phone.message.message;
              break;
            }
            case 'Image': {
              const media = await this.wpp.mediaFromUrl(phone.message.url, phone.message.nameFile);
              messageToSend = media;
              configMessage.caption = phone.message.message;
              break;
            }
            case 'Images': {
              for (let i = 0; i < (phone.message.images ?? []).length; i++) {
                const url = phone.message.images[i];
                const media = await this.wpp.mediaFromUrl(url, `${phone.message.nameFile} - ${i + 1}`);
                configMessage.caption = phone.message.message;
                await client.sendMessage(jid, media, configMessage);
              }
              continue;
            }
            case 'LOL': {
              for (let i = 0; i < 10; i++) {
                await client.sendMessage(jid, phone.message.message, configMessage);
              }
              continue;
            }
            default:
              // 'Text' o undefined -> mensaje simple
              messageToSend = msgText || 'Mensaje Principal';
          }

          await client.sendMessage(jid, messageToSend, configMessage);

          sheet.addRow({
            cod,
            name: phone.name ?? '',
            phone: phone.number,
            client: phone.client ?? '',
            orchard: Array.isArray(phone.orchard) ? phone.orchard.join(', ') : (phone.orchard ?? ''),
            username: phone.username ?? '',
            mensaje: msgText,
            adjunto: this.getAttachmentField(phone.typeMessage, phone.message),
          });

          await this.notifModel.updateOne({ _id: phone.id }, { statusSend: true });
          log.totalSend += 1;
          log.detailSend.push({
            orchard: phone.orchard,
            client: phone.client,
            username: phone.username,
            phone: phone.number,
          });

        } catch (err: any) {
          this.logger.error(`❌ Error enviando a ${phone.number}: ${err.message}`);
          log.totalSendError += 1;
          log.detailSendError.push({
            orchard: phone.orchard,
            client: phone.client,
            username: phone.username,
            phone: phone.number,
            error: err.message,
          });
          await this.notifModel.updateOne({ _id: phone.id }, { statusSend: false, errorMessage: err.message });
        }
      }

      await log.save();
    }

    // Aviso al grupo con Excel adjunto (si no alert)
    if (!alert) {
      const filename = `DetalleEnvio_${cod}_${Date.now()}.xlsx`;
      const filepath = path.join(os.tmpdir(), filename);
      await workbook.xlsx.writeFile(filepath);

      const clientReady = this.wpp.getClient();
      const groupId = process.env.WPP_GROUP_CONFIRMATION!;
      if (clientReady && groupId) {
        await clientReady.sendMessage(groupId, `✅ Se han enviado los mensajes del código: *"${cod}"*. \n📎 Revisa el archivo adjunto.`);
        const fileMedia = await this.wpp.mediaFromFile(filepath);
        await clientReady.sendMessage(groupId, fileMedia);
      }
    }

    return { message: 'La notificación fue enviada con éxito' };
  }

  async listGroups(options?: { includeInviteCode?: boolean }) {
    const includeInviteCode = !!options?.includeInviteCode;
  
    const client = await this.wpp.maybeReinit();
    if (!client){
      throw new Error('WhatsApp client no inicializado / no autenticado');
    };
  
    // Trae todos los chats y filtra solo grupos
    const chats = await client.getChats();
    const groups = chats.filter((c: any) => c.isGroup) as GroupChat[];
  
    // Mapea la información relevante; intenta getInviteCode() si se pidió
    const data = await Promise.all(
      groups.map(async (g) => {
        let inviteCode: string | null = null;
        if (includeInviteCode) {
          try {
            // Requiere que seas admin del grupo
            inviteCode = await g.getInviteCode();
          } catch {
            inviteCode = null; // no eres admin o no disponible
          }
        }
  
        return {
          id: g.id?._serialized ?? null,      // JID completo del grupo (lo que usarás para enviar mensajes)
          name: (g as any).name ?? null,       // nombre visible del grupo
          isReadOnly: (g as any).isReadOnly ?? false,
          participantsCount: Array.isArray((g as any).participants)
            ? (g as any).participants.length
            : undefined,
          inviteCode, // puede ser null si no eres admin o no se pidió
        };
      })
    );
  
    // Orden por nombre, solo por comodidad
    return data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }
}
