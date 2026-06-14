// 用 Node.js 以正确 UTF-8 编码插入测试数据，避免 curl/终端编码问题
const baseUrl = 'http://localhost:3001/api/dev/mock-dingtalk-event';

const events = [
  // 钉钉员工
  { eventType: 'user_add_org', userId: 'dt-zhangsan', name: '张三', mobile: '13800001111', email: 'zhangsan@example.com', jobNumber: 'EMP001', departmentIds: ['D001'], position: '前端工程师' },
  { eventType: 'user_add_org', userId: 'dt-lisi', name: '李四', mobile: '13900002222', email: 'lisi@example.com', jobNumber: 'EMP002', departmentIds: ['D001', 'D002'], position: '后端工程师' },
  // 企业微信员工（与李四同一手机号，测试跨平台合并）
  { eventSource: 'wecom_callback', eventType: 'create_user', userId: 'wc-lisi', name: '李四', mobile: '13900002222', email: 'lisi@wecom.com', position: '后端工程师' },
  // 企业微信独立员工
  { eventSource: 'wecom_callback', eventType: 'create_user', userId: 'wc-wangwu', name: '王五', mobile: '13700003333', email: 'wangwu@wecom.com', jobNumber: 'EMP003', departmentIds: ['D003'], position: '产品经理' },
  // 钉钉员工（与王五同一手机号，测试跨平台合并）
  { eventType: 'user_add_org', userId: 'dt-wangwu', name: '王五', mobile: '13700003333', email: 'wangwu@dingtalk.com', jobNumber: 'EMP003', position: '产品经理' },
  // 离职
  { eventType: 'user_leave_org', userId: 'dt-zhangsan' },
];

for (const ev of events) {
  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(ev),
  });
  const data = await res.json();
  console.log(`${data.eventId}: ${ev.eventType} ${ev.name || ev.userId} → ${data.success ? 'OK' : 'FAIL'}`);
}
console.log('\nDone. 请刷新浏览器查看。');
