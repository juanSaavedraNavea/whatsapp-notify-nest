import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ collection: 'LogReadWhatsAppNotification' })
export class LogReadWhatsAppNotification {
  @Prop() username?: string;
  @Prop() phone?: string;   // +56...
  @Prop({ default: Date.now }) timestampSent!: Date;
}
export const LogReadWhatsAppNotificationSchema = SchemaFactory.createForClass(LogReadWhatsAppNotification);
