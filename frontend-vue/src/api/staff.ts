import request from './request';
import type { StaffItem } from '../types/staff';

export type { StaffItem };

export function getStaffList(params: Record<string, any>) {
  return request.get('/staffs', { params }) as Promise<{
    items: StaffItem[];
    total: number;
    page: number;
    pageSize: number;
  }>;
}
