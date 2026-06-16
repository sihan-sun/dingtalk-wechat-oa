import request from './request';
import type { EventLogItem } from '../types/sync';

export type { EventLogItem };

export function getEventLogList(params: Record<string, any>) {
  return request.get('/event-logs', { params }) as Promise<{
    items: EventLogItem[];
    total: number;
    page: number;
    pageSize: number;
  }>;
}

export function retryEventLog(id: string) {
  return request.post(`/event-logs/${id}/retry`);
}
