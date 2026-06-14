import request from './request';

export interface StaffItem {
  _id: string;
  unionId?: string;
  platformType: string;
  corpId: string;
  platformUserId: string;
  name?: string;
  mobile?: string;
  email?: string;
  jobNumber?: string;
  departmentNames?: string[];
  position?: string;
  status: string;
  isDeleted: boolean;
  lastEventAt?: string;
  lastSyncAt?: string;
  updatedAt: string;
}

export function getStaffList(params: Record<string, any>) {
  return request.get('/staffs', { params }) as Promise<{
    items: StaffItem[];
    total: number;
    page: number;
    pageSize: number;
  }>;
}
