import { Controller, Get, Param, Query } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Staff, StaffDocument } from '../../schemas/staff.schema';
import {
  StaffUnion,
  StaffUnionDocument,
} from '../../schemas/staff-union.schema';

@Controller('api/staff-unions')
export class StaffUnionController {
  constructor(
    @InjectModel(StaffUnion.name)
    private staffUnionModel: Model<StaffUnionDocument>,
    @InjectModel(Staff.name)
    private staffModel: Model<StaffDocument>,
  ) {}

  /**
   * GET /api/staff-unions
   * 分页列表，支持按姓名/手机号/状态筛选
   */
  @Get()
  async list(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('name') name?: string,
    @Query('mobile') mobile?: string,
    @Query('status') status?: string,
  ): Promise<any> {
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const size = Math.min(100, Math.max(1, parseInt(pageSize as string, 10) || 20));
    const skip = (pageNum - 1) * size;

    const filter: any = {};
    if (name) filter.name = { $regex: name, $options: 'i' };
    if (mobile) filter.mobile = { $regex: mobile, $options: 'i' };
    if (status) filter.status = status;

    const [items, total] = await Promise.all([
      this.staffUnionModel
        .find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(size)
        .lean()
        .exec(),
      this.staffUnionModel.countDocuments(filter).exec(),
    ]);

    // 查询每个 union 关联的平台数量
    const unionIds = items.map((u) => u._id);
    const platformCounts = await this.staffModel
      .aggregate([
        { $match: { unionId: { $in: unionIds } } },
        {
          $group: {
            _id: '$unionId',
            count: { $sum: 1 },
            platforms: { $addToSet: '$platformType' },
          },
        },
      ])
      .exec();

    const countMap = new Map(
      platformCounts.map((pc) => [pc._id.toString(), pc]),
    );

    const enriched = items.map((u) => {
      const pc = countMap.get(u._id.toString());
      return {
        ...u,
        platformCount: pc?.count || 0,
        platforms: pc?.platforms || [],
      };
    });

    return { items: enriched, total, page: pageNum, pageSize: size };
  }

  /**
   * GET /api/staff-unions/:id
   * 详情，包含关联的 staffs 列表
   */
  @Get(':id')
  async detail(@Param('id') id: string): Promise<any> {
    const union = await this.staffUnionModel.findById(id).lean().exec();
    if (!union) return null;

    const staffs = await this.staffModel
      .find({ unionId: new Types.ObjectId(id) })
      .sort({ platformType: 1 })
      .lean()
      .exec();

    return { ...union, staffs };
  }
}
