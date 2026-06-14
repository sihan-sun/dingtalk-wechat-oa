import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type StaffUnionDocument = StaffUnion & Document;

@Schema({ timestamps: true })
export class StaffUnion {
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

// 单字段索引已在 @Prop({ index: true }) 中声明，此处不重复声明
