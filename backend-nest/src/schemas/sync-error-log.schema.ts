import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PlatformType } from '../common/enums/platform-type.enum';
import { HandleStatus } from '../common/enums/handle-status.enum';

export type SyncErrorLogDocument = SyncErrorLog & Document;

@Schema({ timestamps: true })
export class SyncErrorLog {
  @Prop({ type: Types.ObjectId, ref: 'SyncTask' })
  taskId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'EventLog' })
  eventLogId?: Types.ObjectId;

  @Prop({ required: true, enum: PlatformType, index: true })
  platformType: PlatformType;

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
    enum: [...Object.values(HandleStatus), 'ignored'],
    default: HandleStatus.PENDING,
    index: true,
  })
  status: string;
}

export const SyncErrorLogSchema = SchemaFactory.createForClass(SyncErrorLog);

SyncErrorLogSchema.index({ status: 1, nextRetryAt: 1 });
SyncErrorLogSchema.index({ createdAt: -1 });
