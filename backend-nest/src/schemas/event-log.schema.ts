import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EventLogDocument = EventLog & Document;

@Schema({ timestamps: true })
export class EventLog {
  @Prop({ required: true, enum: ['dingtalk', 'wecom'], index: true })
  platformType: string;

  @Prop({
    required: true,
    enum: ['dingtalk_stream', 'wecom_callback'],
    index: true,
  })
  eventSource: string;

  @Prop()
  corpId?: string;

  @Prop({ index: true })
  eventType?: string;

  @Prop({ index: true })
  eventId?: string;

  @Prop({ index: true })
  platformUserId?: string;

  @Prop({ type: Object, required: true })
  rawPayload: Record<string, any>;

  @Prop({
    enum: ['pending', 'success', 'failed'],
    default: 'pending',
    index: true,
  })
  handleStatus: string;

  @Prop()
  errorMessage?: string;

  @Prop({ default: Date.now })
  receivedAt: Date;

  @Prop()
  handledAt?: Date;
}

export const EventLogSchema = SchemaFactory.createForClass(EventLog);

// eventId 用于幂等：同一个平台 + 同一个事件ID 不应重复处理
EventLogSchema.index({ platformType: 1, eventId: 1 });
// handleStatus 索引已在 @Prop({ index: true }) 中声明
EventLogSchema.index({ createdAt: -1 });
