import request from './request';
import type { SyncErrorItem } from '../types/sync';

export type { SyncErrorItem };

export function getSyncErrorList(params: Record<string, any>) {
  return request.get('/sync-errors', { params }) as Promise<{
    items: SyncErrorItem[];
    total: number;
    page: number;
    pageSize: number;
  }>;
}
