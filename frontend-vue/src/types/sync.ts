export interface SyncTaskItem {
  _id: string;
  platformType: 'dingtalk' | 'wecom';
  syncType: 'full' | 'single' | 'event' | 'retry';
  status: 'pending' | 'running' | 'success' | 'failed' | 'partial_success';
  totalCount: number;
  successCount: number;
  failCount: number;
  errorMessage?: string;
  startTime?: string;
  endTime?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export const syncTaskTypeLabels: Record<string, string> = {
  full: '全量同步',
  single: '单员工同步',
  event: '事件同步',
  retry: '重试',
};

export const syncTaskStatusLabels: Record<string, string> = {
  pending: '待执行',
  running: '执行中',
  success: '成功',
  partial_success: '部分成功',
  failed: '失败',
};

export const syncTaskStatusColors: Record<string, '' | 'success' | 'warning' | 'danger' | 'info'> = {
  pending: 'info',
  running: 'warning',
  success: 'success',
  partial_success: 'warning',
  failed: 'danger',
};

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

export interface SyncErrorItem {
  _id: string;
  taskId?: string;
  eventLogId?: string;
  platformType: string;
  platformUserId?: string;
  errorType?: string;
  errorMessage: string;
  retryCount: number;
  nextRetryAt?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}
