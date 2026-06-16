// 清空数据库并导入 100+ 条虚拟员工数据
const BASE = 'http://localhost:3001/api/dev/mock-dingtalk-event';

const FIRST_NAMES = '赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜戚谢邹喻柏水窦章云苏潘葛奚范彭郎鲁韦昌马苗凤花方俞任袁柳丰鲍史唐费廉岑薛雷贺倪汤滕殷罗毕郝邬安常乐于时傅皮下齐康伍余元卜顾孟平黄和穆萧尹姚邵湛汪祁毛禹狄米贝明臧计伏成戴谈宋茅庞熊纪舒屈项祝董梁杜阮蓝闵席季麻强贾路娄危江童颜郭梅盛林刁钟徐邱骆高夏蔡田樊胡凌霍虞万支柯昝管卢莫经房裘缪干解应宗丁宣贲邓郁单杭洪包诸左石崔吉钮龚程嵇邢滑裴陆荣翁荀羊於惠甄曲家封芮羿储靳汲邴糜松井段富巫乌焦巴弓牧隗山谷车侯宓蓬全郗班仰秋仲伊宫宁仇栾暴甘钭厉戎祖武符刘景詹束龙叶幸司韶郜黎蓟薄印宿白怀蒲邰从鄂索';

const MALE_NAMES = '伟强勇涛磊军杰斌超明辉鹏浩亮刚峰毅俊帅凯飞龙健志文博华平'.split('');
const FEMALE_NAMES = '芳敏静丽婷雪娟霞秀兰玲燕红梅萍艳慧琴娜琳佳瑶'.split('');

const DEPARTMENTS = [
  { id: 'D001', name: '技术部' },
  { id: 'D002', name: '产品部' },
  { id: 'D003', name: '市场部' },
  { id: 'D004', name: '销售部' },
  { id: 'D005', name: '人力资源部' },
  { id: 'D006', name: '财务部' },
  { id: 'D007', name: '运营部' },
  { id: 'D008', name: '设计部' },
  { id: 'D009', name: '法务部' },
  { id: 'D010', name: '行政部' },
];

const POSITIONS = {
  D001: ['高级前端工程师', '高级后端工程师', '架构师', 'DevOps工程师', '测试工程师', '中级Java工程师', '中级前端工程师', '数据工程师'],
  D002: ['产品总监', '产品经理', '产品助理', 'UX研究员'],
  D003: ['市场总监', '市场经理', '品牌专员', 'SEO专家', '投放优化师'],
  D004: ['销售总监', '大客户经理', '销售代表', '渠道经理'],
  D005: ['HR总监', '招聘经理', '培训专员', '薪酬专员'],
  D006: ['财务总监', '会计', '出纳', '审计专员'],
  D007: ['运营总监', '运营经理', '内容运营', '社群运营'],
  D008: ['设计总监', 'UI设计师', '视觉设计师', '交互设计师'],
  D009: ['法务总监', '法务专员', '合规专员'],
  D010: ['行政总监', '行政专员', '前台'],
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomMobile() {
  const prefixes = ['138', '139', '137', '136', '158', '159', '186', '188', '177', '150'];
  const suffix = String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
  return pick(prefixes) + suffix;
}

function randomEmail(name, jobNumber) {
  const domains = ['company.com', 'corp.cn', 'work.cn', 'example.com', 'staff.cn'];
  const pinyin = name.toLowerCase().replace(/[^\x00-\x7F]/g, '');
  if (pinyin.length >= 2) {
    return `${pinyin}${jobNumber}@${pick(domains)}`;
  }
  return `emp${jobNumber}@${pick(domains)}`;
}

// ============ Step 0: 清空数据库 ============
console.log('正在连接 MongoDB 清空数据...');

// 通过 dev mock 接口无法清空，改用直接操作
const collections = ['staffs', 'staff_unions', 'event_logs', 'sync_tasks', 'sync_error_logs'];

async function clearDB() {
  for (const col of collections) {
    try {
      const res = await fetch(`http://localhost:3001/api/dev/clear-${col}`, { method: 'DELETE' });
    } catch {
      // 如果没有直接清空接口，通过 admin API 逐条删除
    }
  }
}

// 由于没有直接清空接口，我们用另一种方式：通过健康检查确认连接，然后直接操作
console.log('提示：请先手动清空 MongoDB 集合，或在 MongoDB Compass 中删除所有文档。');
console.log('快速清空命令（在 MongoDB Shell 中执行）：');
console.log('  use staff-sync');
console.log('  db.staffs.deleteMany({})');
console.log('  db.staff_unions.deleteMany({})');
console.log('  db.event_logs.deleteMany({})');
console.log('  db.sync_tasks.deleteMany({})');
console.log('  db.sync_error_logs.deleteMany({})');
console.log('');

// 如果不支持清空，直接导入新数据（会覆盖同ID的staff）
// 先生成员工列表
const employees = [];
const usedMobiles = new Set();
const usedNames = new Set();
let jobCounter = 1001;

for (let i = 0; i < 110; i++) {
  const lastName = FIRST_NAMES[i % FIRST_NAMES.length];
  // 混合使用男名和女名
  const firstNameChars = [];
  const namePool = i % 2 === 0 ? MALE_NAMES : FEMALE_NAMES;
  firstNameChars.push(pick(namePool));
  // 约50%概率双字名
  if (i % 3 !== 0) {
    firstNameChars.push(pick(namePool));
  }
  const fullName = lastName + firstNameChars.join('');

  // 避免重名
  if (usedNames.has(fullName)) continue;
  usedNames.add(fullName);

  const dept = pick(DEPARTMENTS);
  const position = pick(POSITIONS[dept.id] || ['员工']);
  const jobNumber = `EMP${String(jobCounter).padStart(4, '0')}`;
  jobCounter++;

  let mobile;
  do {
    mobile = randomMobile();
  } while (usedMobiles.has(mobile));
  usedMobiles.add(mobile);

  const email = randomEmail(fullName, jobNumber);

  // 决定平台：70%钉钉, 50%企微（部分员工双平台）
  const platforms = [];
  platforms.push('dingtalk');
  if (Math.random() < 0.5) {
    platforms.push('wecom');
  }

  employees.push({
    name: fullName,
    mobile,
    email,
    jobNumber,
    position,
    departments: [dept.id],
    departmentName: dept.name,
    platforms,
  });
}

// 额外添加一些会跨平台合并的（同一手机号两个平台都有）
const crossPlatformEmployees = [];
for (let i = 0; i < 15; i++) {
  const base = employees[i + 20]; // 取已有的员工
  if (base.platforms.length === 1) {
    // 标记为双平台（后续导入时会在两边都创建）
    base.platforms = ['dingtalk', 'wecom'];
  }
}

console.log(`生成 ${employees.length} 名虚拟员工`);
console.log('开始导入...\n');

let successCount = 0;
let failCount = 0;
let eventCount = 0;

for (const emp of employees) {
  for (const platform of emp.platforms) {
    const isWeCom = platform === 'wecom';

    const body = {
      eventSource: isWeCom ? 'wecom_callback' : 'dingtalk_stream',
      eventType: isWeCom ? 'create_user' : 'user_add_org',
      userId: `${isWeCom ? 'wc' : 'dt'}-${emp.jobNumber}`,
      name: emp.name,
      mobile: emp.mobile,
      email: isWeCom ? emp.email.replace('@', '@wc-') : emp.email,
      jobNumber: emp.jobNumber,
      departmentIds: emp.departments,
      position: emp.position,
    };

    try {
      const res = await fetch(BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      eventCount++;
      if (data.success) {
        successCount++;
      } else {
        failCount++;
        console.log(`  FAIL: ${emp.name} (${platform}) - ${data.message || 'unknown'}`);
      }
    } catch (err) {
      failCount++;
      console.log(`  ERROR: ${emp.name} (${platform}) - ${err.message}`);
    }

    // 每秒10个请求，避免压垮服务
    if (eventCount % 10 === 0) {
      await new Promise(r => setTimeout(r, 100));
    }
  }
}

console.log(`\n============================`);
console.log(`导入完成:`);
console.log(`  员工数: ${employees.length}`);
console.log(`  事件数: ${eventCount}`);
console.log(`  成功: ${successCount}`);
console.log(`  失败: ${failCount}`);
console.log(`  预计 union 数: ~${employees.length - crossPlatformEmployees.length} (部分因跨平台自动合并)`);
console.log(`============================`);
console.log('\n刷新浏览器 http://localhost:5173 查看结果');
