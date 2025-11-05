import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ collection: 'LogNotification' })
export class LogNotification {
  @Prop() client?: string;
  @Prop({ default: Date.now }) date!: Date;
  @Prop({ default: 'WhatsApp' }) type!: string;
  @Prop() reportId!: string;
  @Prop({ default: 0 }) totalSend!: number;
  @Prop({ type: Array, default: [] }) detailSend!: any[];
  @Prop({ default: 0 }) totalSendError!: number;
  @Prop({ type: Array, default: [] }) detailSendError!: any[];
}
export const LogNotificationSchema = SchemaFactory.createForClass(LogNotification);
