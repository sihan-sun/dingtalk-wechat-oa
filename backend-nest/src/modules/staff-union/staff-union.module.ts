import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StaffUnion, StaffUnionSchema } from '../../schemas/staff-union.schema';
import { Staff, StaffSchema } from '../../schemas/staff.schema';
import { StaffUnionController } from '../admin/staff-union.controller';
import { StaffUnionService } from './staff-union.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StaffUnion.name, schema: StaffUnionSchema },
      { name: Staff.name, schema: StaffSchema },
    ]),
  ],
  controllers: [StaffUnionController],
  providers: [StaffUnionService],
  exports: [StaffUnionService],
})
export class StaffUnionModule {}
