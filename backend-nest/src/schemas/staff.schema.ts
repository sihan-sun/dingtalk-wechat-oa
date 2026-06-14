import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type StaffDocument = Staff & Document;

@Schema({ timestamps: true })
export class Staff {
  @Prop({ type: Types.ObjectId, ref: 'StaffUnion', index: true })
  unionId?: Types.ObjectId;

  @Prop({ required: true, enum: ['dingtalk', 'wecom'], index: true })
  platformType: string;

  @Prop({ required: true, index: true })
  corpId: string;

  @Prop({ required: true })
  platformUserId: string;

  @Prop()
  platformUnionId?: string;

  @Prop()
  name?: string;

  @Prop({ index: true })
  mobile?: string;

  @Prop({ index: true })
  email?: string;

  @Prop({ index: true })
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
    enum: ['active', 'inactive', 'inactive_pending', 'resigned', 'deleted'],
    default: 'active',
    index: true,
  })
  status: string;

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

// 单字段索引已在 @Prop({ index: true }) 中声明，此处不重复声明
// 仅保留复合索引
