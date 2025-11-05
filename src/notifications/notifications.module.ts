import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { WhatsAppNotification, WhatsAppNotificationSchema } from '../schemas/whatsapp-notification.schema';
import { LogNotification, LogNotificationSchema } from '../schemas/log-notification.schema';
import { LogReadWhatsAppNotification, LogReadWhatsAppNotificationSchema } from '../schemas/logread-whatsapp.schema';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [
    WhatsAppModule,
    MongooseModule.forFeature([
      { name: WhatsAppNotification.name, schema: WhatsAppNotificationSchema },
      { name: LogNotification.name, schema: LogNotificationSchema },
      { name: LogReadWhatsAppNotification.name, schema: LogReadWhatsAppNotificationSchema },
    ]),
  ],
  providers: [NotificationsService],
  controllers: [NotificationsController],
})
export class NotificationsModule {}
