import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { PlatformType } from '../common/enums/platform-type.enum';
import { SyncTaskStatus } from '../common/enums/sync-status.enum';

export type SyncTaskDocument = SyncTask & Document;

export enum SyncType {
  FULL = 'full',
  SINGLE = 'single',
  EVENT = 'event',
  RETRY = 'retry',
}

@Schema({ timestamps: true })
export class SyncTask {
  @Prop({ required: true, enum: PlatformType, index: true })
  platformType: PlatformType;

  @Prop({ required: true, enum: SyncType, index: true })
  syncType: SyncType;

  @Prop({ enum: SyncTaskStatus, default: SyncTaskStatus.PENDING, index: true })
  status: SyncTaskStatus;

  @Prop({ default: 0 })
  totalCount: number;

  @Prop({ default: 0 })
  successCount: number;

  @Prop({ default: 0 })
  failCount: number;

  @Prop()
  startTime?: Date;

  @Prop()
  endTime?: Date;

  @Prop()
  errorMessage?: string;

  @Prop()
  createdBy?: string;
}

export const SyncTaskSchema = SchemaFactory.createForClass(SyncTask);

SyncTaskSchema.index({ platformType: 1, syncType: 1, status: 1 });
SyncTaskSchema.index({ createdAt: -1 });
