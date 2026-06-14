import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SyncErrorLogDocument = SyncErrorLog & Document;

@Schema({ timestamps: true })
export class SyncErrorLog {
  @Prop({ type: Types.ObjectId, ref: 'SyncTask' })
  taskId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'EventLog' })
  eventLogId?: Types.ObjectId;

  @Prop({ required: true, enum: ['dingtalk', 'wecom'], index: true })
  platformType: string;

  @Prop({ index: true })
  platformUserId?: string;

  @Prop()
  errorType?: string;

  @Prop({ required: true })
  errorMessage: string;

  @Prop({ default: 0 })
  retryCount: number;

  @Prop()
  nextRetryAt?: Date;

  @Prop({
    enum: ['pending', 'success', 'failed', 'ignored'],
    default: 'pending',
    index: true,
  })
  status: string;
}

export const SyncErrorLogSchema = SchemaFactory.createForClass(SyncErrorLog);

SyncErrorLogSchema.index({ status: 1, nextRetryAt: 1 });
SyncErrorLogSchema.index({ createdAt: -1 });
