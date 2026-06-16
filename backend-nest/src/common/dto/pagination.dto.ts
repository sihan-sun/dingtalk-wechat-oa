import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 通用分页查询 DTO
 * 所有列表查询的 Controller 继承此 DTO
 */
export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  get skip(): number {
    const page = this.page ?? 1;
    const pageSize = this.pageSize ?? 20;
    return (page - 1) * pageSize;
  }

  get limit(): number {
    return this.pageSize ?? 20;
  }
}
