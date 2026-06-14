import request from './request';

export interface EventLogItem {
  _id: string;
  platformType: string;
  eventSource: string;
  corpId?: string;
  eventType?: string;
  eventId?: string;
  platformUserId?: string;
  handleStatus: string;
  errorMessage?: string;
  rawPayload?: any;
  receivedAt: string;
  handledAt?: string;
  createdAt: string;
}

export function getEventLogList(params: Record<string, any>) {
  return request.get('/event-logs', { params }) as Promise<{
    items: EventLogItem[];
    total: number;
    page: number;
    pageSize: number;
  }>;
}
