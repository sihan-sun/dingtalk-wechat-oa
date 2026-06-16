import request from './request';
import type { SyncTaskItem } from '../types/sync';

export type { SyncTaskItem };

export function getSyncTaskList(params: Record<string, any>) {
  return request.get('/sync-tasks', { params }) as Promise<{
    items: SyncTaskItem[];
    total: number;
    page: number;
    pageSize: number;
  }>;
}

export function getSyncTaskDetail(id: string) {
  return request.get(`/sync-tasks/${id}`) as Promise<SyncTaskItem>;
}

export function syncDingTalkFull() {
  return request.post('/sync/dingtalk/full');
}

export function syncWeComFull() {
  return request.post('/sync/wecom/full');
}

export function syncOneStaff(data: {
  platformType?: string;
  corpId?: string;
  platformUserId: string;
}) {
  return request.post('/sync/staff/one', data);
}

export function retrySyncError(id: string) {
  return request.post(`/sync-errors/${id}/retry`);
}
