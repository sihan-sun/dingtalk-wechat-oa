import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  StaffUnion,
  StaffUnionDocument,
} from '../../schemas/staff-union.schema';
import { Staff, StaffDocument } from '../../schemas/staff.schema';

@Injectable()
export class StaffUnionService {
  constructor(
    @InjectModel(StaffUnion.name)
    private staffUnionModel: Model<StaffUnionDocument>,
    @InjectModel(Staff.name)
    private staffModel: Model<StaffDocument>,
  ) {}

  async findById(id: string) {
    return this.staffUnionModel.findById(id).lean().exec();
  }

  async find(filter: any, skip: number, limit: number) {
    const [items, total] = await Promise.all([
      this.staffUnionModel.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.staffUnionModel.countDocuments(filter).exec(),
    ]);
    return { items, total };
  }

  async refreshUnion(unionId: string): Promise<void> {
    const staffs = await this.staffModel.find({
      unionId: new Types.ObjectId(unionId),
    });

    if (staffs.length === 0) return;

    const activeStaffs = staffs.filter((s) => s.status === 'active');
    const selectedStaff = activeStaffs[0] || staffs[0];
    const status = activeStaffs.length > 0 ? 'active' : 'resigned';

    await this.staffUnionModel.findByIdAndUpdate(unionId, {
      name: selectedStaff.name,
      mobile: selectedStaff.mobile,
      email: selectedStaff.email,
      jobNumber: selectedStaff.jobNumber,
      avatar: selectedStaff.avatar,
      status,
    });
  }
}
