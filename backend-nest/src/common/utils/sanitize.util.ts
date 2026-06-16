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
