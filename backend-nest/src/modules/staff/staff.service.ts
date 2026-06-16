import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Staff, StaffDocument } from '../../schemas/staff.schema';

@Injectable()
export class StaffService {
  constructor(
    @InjectModel(Staff.name) private staffModel: Model<StaffDocument>,
  ) {}

  async findById(id: string) {
    return this.staffModel.findById(id).lean().exec();
  }

  async findByPlatform(platformType: string, corpId: string, platformUserId: string) {
    return this.staffModel.findOne({ platformType, corpId, platformUserId }).exec();
  }

  async findByUnionId(unionId: string) {
    return this.staffModel.find({ unionId: new Types.ObjectId(unionId) }).exec();
  }

  async updateStatus(id: string, status: string) {
    return this.staffModel.findByIdAndUpdate(id, { $set: { status } }, { new: true }).exec();
  }

  async find(filter: any, skip: number, limit: number) {
    const [items, total] = await Promise.all([
      this.staffModel.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.staffModel.countDocuments(filter).exec(),
    ]);
    return { items, total };
  }
}
