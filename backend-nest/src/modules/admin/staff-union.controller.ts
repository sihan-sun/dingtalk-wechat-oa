import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  BadRequestException,
} from '@nestjs/common';
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

  /**
   * POST /api/staff-unions/merge
   * 手动合并：将多个 staffIds 合并到 targetUnionId
   */
  @Post('merge')
  async merge(@Body() body: { targetUnionId: string; staffIds: string[] }) {
    const { targetUnionId, staffIds } = body;

    if (!targetUnionId || !staffIds || staffIds.length === 0) {
      throw new BadRequestException('targetUnionId 和 staffIds 为必填项');
    }

    const targetObjectId = new Types.ObjectId(targetUnionId);
    const union = await this.staffUnionModel.findById(targetUnionId);
    if (!union) {
      throw new BadRequestException('目标 union 不存在');
    }

    // 将所有 staff 绑定到 targetUnion
    const result = await this.staffModel.updateMany(
      { _id: { $in: staffIds.map((id) => new Types.ObjectId(id)) } },
      { $set: { unionId: targetObjectId } },
    );

    if (result.modifiedCount === 0) {
      throw new BadRequestException('未找到可合并的 staff 记录');
    }

    // 刷新目标 union 状态
    const staffs = await this.staffModel.find({ unionId: targetObjectId });
    const activeStaffs = staffs.filter((s) => s.status === 'active');
    const selectedStaff = activeStaffs[0] || staffs[0];

    await this.staffUnionModel.findByIdAndUpdate(targetUnionId, {
      name: selectedStaff.name,
      mobile: selectedStaff.mobile,
      email: selectedStaff.email,
      jobNumber: selectedStaff.jobNumber,
      status: activeStaffs.length > 0 ? 'active' : 'resigned',
      conflictStatus: 'resolved',
    });

    return {
      success: true,
      modifiedCount: result.modifiedCount,
      message: `已将 ${result.modifiedCount} 个员工合并到统一记录`,
    };
  }

  /**
   * POST /api/staff-unions/unmerge
   * 手动拆分：将指定 staff 从 union 解绑，为其创建新的 union
   */
  @Post('unmerge')
  async unmerge(@Body() body: { staffId: string }) {
    const { staffId } = body;

    if (!staffId) {
      throw new BadRequestException('staffId 为必填项');
    }

    const staff = await this.staffModel.findById(staffId);
    if (!staff) {
      throw new BadRequestException('staff 不存在');
    }

    if (!staff.unionId) {
      throw new BadRequestException('该员工尚未绑定到任何统一记录');
    }

    const oldUnionId = staff.unionId;

    // 创建新的 union
    const newUnion = await this.staffUnionModel.create({
      name: staff.name,
      mobile: staff.mobile,
      email: staff.email,
      jobNumber: staff.jobNumber,
      status: staff.status === 'active' ? 'active' : 'resigned',
      matchKey: staff.mobile || staff.jobNumber || staff.email || '',
      matchRule: 'manual_split',
      conflictStatus: 'none',
    });

    // 将 staff 绑定到新 union
    await this.staffModel.findByIdAndUpdate(staffId, {
      unionId: newUnion._id,
    });

    // 刷新旧 union
    const oldUnionStaffs = await this.staffModel.find({ unionId: oldUnionId });
    if (oldUnionStaffs.length === 0) {
      await this.staffUnionModel.findByIdAndDelete(oldUnionId);
    } else {
      const activeStaffs = oldUnionStaffs.filter((s) => s.status === 'active');
      const selected = activeStaffs[0] || oldUnionStaffs[0];
      await this.staffUnionModel.findByIdAndUpdate(oldUnionId, {
        name: selected.name,
        mobile: selected.mobile,
        email: selected.email,
        jobNumber: selected.jobNumber,
        status: activeStaffs.length > 0 ? 'active' : 'resigned',
      });
    }

    return {
      success: true,
      newUnionId: newUnion._id,
      oldUnionId,
      message: '已拆分并创建新的统一记录',
    };
  }
}
