import request from './request';

export interface SyncErrorItem {
  _id: string;
  platformType: string;
  platformUserId?: string;
  errorType?: string;
  errorMessage: string;
  retryCount: number;
  nextRetryAt?: string;
  status: string;
  createdAt: string;
}

export function getSyncErrorList(params: Record<string, any>) {
  return request.get('/sync-errors', { params }) as Promise<{
    items: SyncErrorItem[];
    total: number;
    page: number;
    pageSize: number;
  }>;
}
