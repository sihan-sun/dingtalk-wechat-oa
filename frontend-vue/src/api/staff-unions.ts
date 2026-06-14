import request from './request';

export interface StaffUnionItem {
  _id: string;
  name?: string;
  mobile?: string;
  email?: string;
  jobNumber?: string;
  status: string;
  platformCount: number;
  platforms: string[];
  updatedAt: string;
}

export interface StaffUnionDetail {
  _id: string;
  name?: string;
  mobile?: string;
  email?: string;
  jobNumber?: string;
  status: string;
  matchKey?: string;
  matchRule?: string;
  conflictStatus: string;
  staffs: Array<{
    _id: string;
    platformType: string;
    platformUserId: string;
    name?: string;
    mobile?: string;
    email?: string;
    jobNumber?: string;
    status: string;
    departmentNames?: string[];
    position?: string;
    rawData?: any;
    lastEventAt?: string;
    lastSyncAt?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

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
