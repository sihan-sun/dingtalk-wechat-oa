import request from './request';
import type { StaffUnionItem, StaffUnionDetail } from '../types/staff';

export type { StaffUnionItem, StaffUnionDetail };

export function getStaffUnionList(params: Record<string, any>) {
  return request.get('/staff-unions', { params }) as Promise<{
    items: StaffUnionItem[];
    total: number;
    page: number;
    pageSize: number;
  }>;
}

export function getStaffUnionDetail(id: string) {
  return request.get(`/staff-unions/${id}`) as Promise<StaffUnionDetail>;
}

export function mergeStaffUnion(data: {
  targetUnionId: string;
  staffIds: string[];
}) {
  return request.post('/staff-unions/merge', data);
}

export function unmergeStaffUnion(data: { staffId: string }) {
  return request.post('/staff-unions/unmerge', data);
}
