// src/whatsapp/whatsapp.service.ts
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Client, RemoteAuth, MessageMedia } from 'whatsapp-web.js';
import { MongoStore } from 'wwebjs-mongo';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import path from 'path';
import qrImage from 'qr-image';

// 👇 IMPORTAR COMO DEFAULT para tener connection/connect/disconnect
import wppMongoose from 'mongoose';

@Injectable()
export class WhatsAppService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppService.name);
  private client: Client | null = null;
  private latestQR: string | null = null;
  private qrReady = false;

  constructor(@InjectConnection() private readonly conn: Connection) {}

  async onModuleInit() {
    await this.ensureClient();
  }

  async onModuleDestroy() {
    try { if (this.client) await this.client.destroy(); } catch {}
    try { await wppMongoose.disconnect(); } catch {}
  }

  getQR() { return { latestQR: this.latestQR, qrReady: this.qrReady }; }
  getClient() { return this.client; }

  private async ensureClient() {
    if (this.client && (this.client as any).info) return;

    // Asegura que la conexión Nest esté lista (opcional)
    await this.conn.asPromise();

    // 👉 Conecta el singleton dedicado de mongoose para wwebjs-mongo
    // Usa el patrón “try-connect”: si no está conectado, conecta.
    if (!wppMongoose.connection || wppMongoose.connection.readyState !== 1) {
      await wppMongoose.connect(process.env.MONGODB_URI as string);
    }

    const store = new MongoStore({ mongoose: wppMongoose }); // ← clave

    const dataPath = path.resolve(process.env.WPP_DATA_DIR ?? './.wpp');

    this.client = new Client({
      authStrategy: new RemoteAuth({
        store,
        clientId: process.env.WPP_CLIENT_ID ?? 'Active',
        dataPath,
        backupSyncIntervalMs: 120000,
      }),
      puppeteer: {
        args: [
          '--disable-gpu',
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-setuid-sandbox',
        ],
        timeout: 60000,
      },
    });

    this.client.on('remote_session_saved', () => this.logger.log('💾 Sesión guardada en Mongo'));
    this.client.on('qr', (qrText: string) => {
      const qrPng = qrImage.imageSync(qrText, { type: 'png' });
      this.latestQR = 'data:image/png;base64,' + qrPng.toString('base64');
      this.qrReady = true;
    });
    this.client.on('authenticated', () => {
      this.logger.log('✅ Autenticado');
      this.latestQR = null;
      this.qrReady = false;
    });

    try {
      this.logger.log('🟢 Inicializando WhatsApp...');
      await this.client.initialize();
      this.logger.log('✅ Cliente WhatsApp listo');
    } catch (e: any) {
      this.logger.error(`❌ Error al inicializar WhatsApp: ${e.message}`);
      this.client = null;
    }
  }

  async maybeReinit() {
    if (!this.client) return null;
    if (!(this.client as any).info) {
      try { await this.client.initialize(); }
      catch (e: any) { this.logger.error('❌ Falló re-inicialización: ' + e.message); return null; }
    }
    return this.client;
  }

  async mediaFromUrl(url: string, filename?: string) { return await MessageMedia.fromUrl(url, { filename }); }
  async mediaFromFile(pathFile: string) { return await MessageMedia.fromFilePath(pathFile); }
}
