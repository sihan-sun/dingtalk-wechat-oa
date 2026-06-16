import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type StaffUnionDocument = StaffUnion & Document;

@Schema({ timestamps: true })
export class StaffUnion {
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

  @Prop({
    enum: ['active', 'inactive', 'resigned'],
    default: 'active',
    index: true,
  })
  status: string;

  @Prop()
  matchKey?: string;

  @Prop()
  matchRule?: string;

  @Prop({
    enum: ['none', 'pending', 'resolved'],
    default: 'none',
    index: true,
  })
  conflictStatus: string;
}

export const StaffUnionSchema = SchemaFactory.createForClass(StaffUnion);

// 稀疏唯一索引：防止同一手机号/邮箱/工号创建重复 union
StaffUnionSchema.index({ mobile: 1 }, { unique: true, sparse: true });
StaffUnionSchema.index({ email: 1 }, { unique: true, sparse: true });
StaffUnionSchema.index({ jobNumber: 1 }, { unique: true, sparse: true });
