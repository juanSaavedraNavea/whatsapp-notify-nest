import { Controller, Get } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly wpp: WhatsAppService) {}

  @Get('start-session')
  async startSession() {
    const { qrReady, latestQR } = this.wpp.getQR();
    if (!qrReady || !latestQR) return { message: 'QR aún no generado' };
    return { message: 'Escanea este QR para iniciar sesión', qr: latestQR };
  }
}
