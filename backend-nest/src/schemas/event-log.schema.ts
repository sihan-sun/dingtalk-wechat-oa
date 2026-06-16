import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { PlatformType } from '../common/enums/platform-type.enum';
import { HandleStatus } from '../common/enums/handle-status.enum';

export type EventLogDocument = EventLog & Document;

export enum EventSource {
  DINGTALK_STREAM = 'dingtalk_stream',
  WECOM_CALLBACK = 'wecom_callback',
}

@Schema({ timestamps: true })
export class EventLog {
  @Prop({ required: true, enum: PlatformType, index: true })
  platformType: PlatformType;

  @Prop({
    required: true,
    enum: EventSource,
    index: true,
  })
  eventSource: EventSource;

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
    enum: HandleStatus,
    default: HandleStatus.PENDING,
    index: true,
  })
  handleStatus: HandleStatus;

  @Prop()
  errorMessage?: string;

  @Prop({ default: Date.now })
  receivedAt: Date;

  @Prop()
  handledAt?: Date;
}

export const EventLogSchema = SchemaFactory.createForClass(EventLog);

// eventId 幂等索引
EventLogSchema.index({ platformType: 1, eventId: 1 });
EventLogSchema.index({ createdAt: -1 });
