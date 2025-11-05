import { Body, Controller, Get, Post, Query  } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get('start-session')
  async startSession() {
    const { qrReady, latestQR } = await this.service.startSessionQR();
    if (!qrReady || !latestQR) return { message: 'QR aún no generado' };
    return { message: 'Escanea este QR para iniciar sesión', qr: latestQR };
  }

  @Post('send')
  async send(@Body() body: { cod: string; alert?: boolean }) {
    return await this.service.sendCod(body.cod, body.alert ?? false);
  }

  @Get('groups')
  async listGroups(@Query('invite') invite?: string) {
    const includeInviteCode = invite === 'true' || invite === '1';
    const groups = await this.service.listGroups({ includeInviteCode });
    return { count: groups.length, groups };
  }
}
