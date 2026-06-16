# Staff Sync 使用教程

钉钉/企业微信 OA 员工信息同步系统 — 使用指南

---

## 1. 快速启动

### 前置要求
- [Docker Desktop](https://www.docker.com/products/docker-desktop)（运行 MongoDB）
- [Node.js](https://nodejs.org/) 18+ （运行前后端）

### 一键启动（Windows）

双击项目根目录的 `start.bat`，脚本会自动：
1. 检查 Docker 运行状态
2. 构建后端（如未构建）
3. 启动 MongoDB（端口 27018）
4. 启动后端 NestJS（端口 3001）
5. 启动前端 Vite（端口 5173）
6. 打开浏览器访问 `http://localhost:5173`

### 手动启动

```bash
# 终端 1: MongoDB
docker compose up -d

# 终端 2: 后端
cd backend-nest
npm install
npm run build
npm run start:dev    # 开发模式（热重载）

# 终端 3: 前端
cd frontend-vue
npm install
npm run dev
```

浏览器访问 `http://localhost:5173`

---

## 2. 环境配置

`backend-nest/.env` 配置示例：

```env
NODE_ENV=development
PORT=3001
MONGO_URI=mongodb://localhost:27018/staff-sync

# 钉钉（Stream 模式，不需要 Callback URL）
DINGTALK_CLIENT_ID=your_dingtalk_app_key
DINGTALK_CLIENT_SECRET=your_dingtalk_app_secret

# 企业微信（Callback 模式，需要在企微后台配置回调 URL）
WECOM_CORP_ID=your_wecom_corp_id
WECOM_SECRET=your_wecom_secret
WECOM_CALLBACK_TOKEN=your_callback_token
WECOM_ENCODING_AES_KEY=your_encoding_aes_key
```

> **安全提示**：`.env` 文件包含密钥，已被 `.gitignore` 排除，不会提交到 Git。

---

## 3. 导入测试数据

### 方式一：运行种子脚本（推荐）

项目提供了 110 人虚拟员工数据：

```bash
node seed-100.mjs
```

这会通过模拟事件接口导入：
- 110 名虚拟员工
- 约 55 人同时存在于钉钉和企业微信（测试跨平台自动合并）
- 约 55 人仅存在于单一平台

### 方式二：手动逐条导入

```bash
curl -X POST http://localhost:3001/api/dev/mock-dingtalk-event \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{
    "eventType": "user_add_org",
    "userId": "emp-001",
    "name": "张三",
    "mobile": "13800001111",
    "email": "zhangsan@example.com",
    "jobNumber": "EMP001",
    "departmentIds": ["D001"],
    "position": "前端工程师"
  }'
```

企业微信事件：

```bash
curl -X POST http://localhost:3001/api/dev/mock-dingtalk-event \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{
    "eventSource": "wecom_callback",
    "eventType": "create_user",
    "userId": "wc-001",
    "name": "李四",
    "mobile": "13900002222",
    "email": "lisi@wecom.com",
    "jobNumber": "EMP002",
    "position": "后端工程师"
  }'
```

### 方式三：批量导入自定义数据

复制 `seed-100.mjs` 为 `my-seed.mjs`，修改员工列表后运行：

```bash
node my-seed.mjs
```

---

## 4. 功能页面说明

| 页面 | 路径 | 功能 |
|------|------|------|
| 统一员工 | `/staff-unions` | 查看合并后的员工列表，按姓名/手机号/状态筛选 |
| 统一员工详情 | `/staff-unions/:id` | 查看某员工详情及关联的所有平台记录 |
| 平台员工 | `/staffs` | 查看各平台原始员工数据，按平台/状态筛选 |
| 事件日志 | `/event-logs` | 查看所有平台事件（钉钉Stream/企微Callback） |
| 同步错误 | `/sync-errors` | 查看同步失败记录，支持重试 |
| 同步任务 | `/sync-tasks` | 查看全量/单员工同步任务执行情况 |

---

## 5. API 接口

### 管理接口

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/staff-unions` | 统一员工列表 |
| GET | `/api/staff-unions/:id` | 统一员工详情 |
| POST | `/api/staff-unions/merge` | 手动合并员工 |
| POST | `/api/staff-unions/unmerge` | 手动拆分员工 |
| GET | `/api/staffs` | 平台员工列表 |
| GET | `/api/staffs/:id` | 平台员工详情 |
| GET | `/api/event-logs` | 事件日志列表 |
| GET | `/api/event-logs/:id` | 事件详情 |
| POST | `/api/event-logs/:id/retry` | 重试失败事件 |
| GET | `/api/sync-errors` | 同步错误列表 |
| GET | `/api/sync-errors/:id` | 错误详情 |
| POST | `/api/sync-errors/:id/retry` | 重试失败同步 |
| GET | `/api/sync-tasks` | 同步任务列表 |
| GET | `/api/sync-tasks/:id` | 任务详情 |

### 同步接口

| Method | Path | 说明 |
|--------|------|------|
| POST | `/api/sync/dingtalk/full` | 钉钉全量同步 |
| POST | `/api/sync/wecom/full` | 企业微信全量同步 |
| POST | `/api/sync/staff/one` | 单员工同步 |

### 开发调试

| Method | Path | 说明 |
|--------|------|------|
| POST | `/api/dev/mock-dingtalk-event` | 模拟平台事件（仅非生产环境） |
| GET | `/health` | 健康检查 |

---

## 6. 核心同步逻辑

### 匹配规则（自动合并）

同一员工在不同平台的记录按以下优先级自动合并：

1. **手机号相同** → 自动合并
2. **工号相同** → 自动合并
3. **邮箱相同** → 自动合并
4. 姓名相同不自动合并（防止重名误合并）

### 状态联动

- 任一平台在职 → 统一记录为"在职"
- 全部平台离职 → 统一记录为"离职"

### 补偿同步

每天凌晨自动执行：
- **02:07** 钉钉全量同步
- **03:07** 企业微信全量同步

补偿同步会检测"离职丢失"场景：
1. 标记为 `inactive_pending`（待确认）
2. 24 小时后确认 → `resigned`（已离职）

---

## 7. 数据管理

### 清空数据库

在 MongoDB Shell 中：

```js
use staff-sync
db.staffs.deleteMany({})
db.staffunions.deleteMany({})
db.eventlogs.deleteMany({})
db.synctasks.deleteMany({})
db.syncerrorlogs.deleteMany({})
```

### 导出数据

```bash
docker exec staff-sync-mongodb mongodump --db staff-sync --out /tmp/backup
docker cp staff-sync-mongodb:/tmp/backup ./mongo-backup
```

---

## 8. 常见问题

**Q: 启动后页面无数据？**
A: 先运行 `node seed-100.mjs` 导入测试数据。

**Q: 钉钉事件收不到？**
A: 确认 `.env` 中 `DINGTALK_CLIENT_ID` 和 `DINGTALK_CLIENT_SECRET` 已配置。开发阶段可用 `/api/dev/mock-dingtalk-event` 接口模拟。

**Q: 企业微信回调 URL 验证失败？**
A: 生产环境需在企微后台配置回调 URL `https://your-domain/api/events/wecom/callback`。开发环境无需配置。

**Q: 如何区分"工号"和"职位"？**
A: 工号是 `jobNumber`（如 EMP001），职位是 `position`（如"前端工程师"），两个独立字段。
