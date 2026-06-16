/**
 * 输入安全工具
 */

/** 转义正则特殊字符，防止 ReDoS 攻击 */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 限制搜索字符串长度，超过则截断 */
export function sanitizeSearch(input: string, maxLen = 50): string {
  const trimmed = input.trim().slice(0, maxLen);
  return escapeRegex(trimmed);
}

/**
 * 脱敏错误消息，移除可能泄露的 access_token 等凭证信息。
 * Axios 错误消息可能包含完整 URL（含 token 参数）。
 */
export function sanitizeErrorMessage(error: unknown, maxLen = 200): string {
  if (!(error instanceof Error)) return '未知错误';
  const raw = error.message || '';
  // 移除 URL 中的 access_token、corpsecret、appSecret 等参数值
  const cleaned = raw
    .replace(/(access_token|corpsecret|appsecret|client_secret|app_secret)=[^&\s]+/gi, '$1=***')
    .replace(/(key|secret|token|password)=([^&\s]{4})[^&\s]*/gi, '$1=$2***');
  return cleaned.slice(0, maxLen);
}
