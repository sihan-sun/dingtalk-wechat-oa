// 导入示例数据文件
import { readFileSync } from 'fs';

const BASE = 'http://localhost:3001/api/dev/mock-dingtalk-event';

const data = JSON.parse(readFileSync('./sample-data.json', 'utf-8'));
const events = data.filter((e) => !e._comment); // 跳过注释字段

console.log(`导入 ${events.length} 条示例数据...\n`);

for (const ev of events) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(ev),
  });
  const result = await res.json();
  const label = `${ev.eventType} ${ev.name || ev.userId}`;
  console.log(`  ${result.eventId}: ${label} → ${result.success ? 'OK' : 'FAIL'}`);
}

console.log('\n完成。预期结果：');
console.log('  staffs: 6 条平台记录（dt-zhangsan离职, dt-lisi, wc-lisi, dt-wangwu, wc-wangwu, dt-zhaoliu）');
console.log('  staff_unions: 4 条（张三、李四、王五、赵六，其中李四和王五是跨平台合并的）');
console.log('  event_logs: 7 条事件');
