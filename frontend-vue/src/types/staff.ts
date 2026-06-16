export interface StaffItem {
  _id: string;
  unionId?: string;
  platformType: 'dingtalk' | 'wecom';
  corpId: string;
  platformUserId: string;
  name?: string;
  mobile?: string;
  email?: string;
  jobNumber?: string;
  departmentNames?: string[];
  position?: string;
  status: StaffStatus;
  isDeleted: boolean;
  lastEventAt?: string;
  lastSyncAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type StaffStatus = 'active' | 'inactive' | 'inactive_pending' | 'resigned' | 'deleted';

export const staffStatusLabels: Record<StaffStatus, string> = {
  active: '在职',
  inactive: '停用',
  inactive_pending: '待确认',
  resigned: '离职',
  deleted: '已删除',
};

export const staffStatusColors: Record<StaffStatus, '' | 'success' | 'warning' | 'danger' | 'info'> = {
  active: 'success',
  inactive: 'warning',
  inactive_pending: 'warning',
  resigned: 'danger',
  deleted: 'info',
};

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
  staffs: StaffItem[];
  createdAt: string;
  updatedAt: string;
}
