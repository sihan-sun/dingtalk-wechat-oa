import { Controller, Get, Param, Query } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Staff, StaffDocument } from '../../schemas/staff.schema';

@Controller('api/staffs')
export class StaffController {
  constructor(
    @InjectModel(Staff.name)
    private staffModel: Model<StaffDocument>,
  ) {}

  /**
   * GET /api/staffs
   * 分页列表，支持按平台/状态/姓名/手机号筛选
   */
  @Get()
  async list(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('platformType') platformType?: string,
    @Query('status') status?: string,
    @Query('name') name?: string,
    @Query('mobile') mobile?: string,
  ): Promise<any> {
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const size = Math.min(100, Math.max(1, parseInt(pageSize as string, 10) || 20));
    const skip = (pageNum - 1) * size;

    const filter: any = {};
    if (platformType) filter.platformType = platformType;
    if (status) filter.status = status;
    if (name) filter.name = { $regex: name, $options: 'i' };
    if (mobile) filter.mobile = { $regex: mobile, $options: 'i' };

    const [items, total] = await Promise.all([
      this.staffModel
        .find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(size)
        .lean()
        .exec(),
      this.staffModel.countDocuments(filter).exec(),
    ]);

    return { items, total, page: pageNum, pageSize: size };
  }

  /**
   * GET /api/staffs/:id
   * 员工详情
   */
  @Get(':id')
  async detail(@Param('id') id: string): Promise<any> {
    const staff = await this.staffModel.findById(id).lean().exec();
    return staff || null;
  }
}
