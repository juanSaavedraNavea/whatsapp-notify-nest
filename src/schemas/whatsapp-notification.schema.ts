import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ _id: false })
class Contact {
  @Prop() name?: string;
  @Prop({ required: true }) number!: string;
  @Prop() username?: string;
  @Prop() profile?: string;
  @Prop() group?: boolean;

  // 👇 clave del fix:
  @Prop({ type: [String], default: [] })
  orchard?: string[];

  @Prop() client?: string;
}

@Schema({ collection: 'WhatsAppNotification' })
export class WhatsAppNotification {
  @Prop({ required: true }) cod!: string;
  @Prop({ default: false }) statusSend!: boolean;
  @Prop({ type: Object }) message?: any;  // { message, url, nameFile, images, documens... }
  @Prop() typeMessage?: 'File'|'Files'|'Gif'|'Image'|'Images'|'LOL'|'Text';
  @Prop({ type: [Contact], default: [] }) contacts!: Contact[];
}
export type WhatsAppNotificationDocument = HydratedDocument<WhatsAppNotification>;
export const WhatsAppNotificationSchema = SchemaFactory.createForClass(WhatsAppNotification);
