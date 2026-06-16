import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PlatformType } from '../common/enums/platform-type.enum';
import { StaffStatus } from '../common/enums/staff-status.enum';

export type StaffDocument = Staff & Document;

@Schema({ timestamps: true })
export class Staff {
  @Prop({ type: Types.ObjectId, ref: 'StaffUnion', index: true })
  unionId?: Types.ObjectId;

  @Prop({ required: true, enum: PlatformType, index: true })
  platformType: PlatformType;

  @Prop({ required: true, index: true })
  corpId: string;

  @Prop({ required: true })
  platformUserId: string;

  @Prop()
  platformUnionId?: string;

  @Prop()
  name?: string;

  @Prop({ index: true, sparse: true })
  mobile?: string;

  @Prop({ index: true, sparse: true })
  email?: string;

  @Prop({ index: true, sparse: true })
  jobNumber?: string;

  @Prop()
  avatar?: string;

  @Prop({ type: [String], default: [] })
  departmentIds: string[];

  @Prop({ type: [String], default: [] })
  departmentNames: string[];

  @Prop()
  position?: string;

  @Prop({
    enum: StaffStatus,
    default: StaffStatus.ACTIVE,
    index: true,
  })
  status: StaffStatus;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  joinTime?: Date;

  @Prop()
  resignTime?: Date;

  @Prop({ type: Object })
  rawData?: Record<string, any>;

  @Prop()
  lastEventAt?: Date;

  @Prop()
  lastSyncAt?: Date;
}

export const StaffSchema = SchemaFactory.createForClass(Staff);

// 唯一复合索引：同一平台、同一企业、同一员工ID 不重复
StaffSchema.index(
  { platformType: 1, corpId: 1, platformUserId: 1 },
  { unique: true },
);
