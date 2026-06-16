# 钉钉 / 企业微信 OA 员工同步系统

自动同步钉钉和企业微信的员工数据到本地 OA，支持跨平台智能合并、实时事件消费和定时补偿同步。

## 功能概览

- **双平台对接** — 钉钉 Stream 模式 + 企业微信 Callback 模式，实时接收通讯录变更
- **智能合并** — 同一员工在多个平台的记录按手机号 → 工号 → 邮箱自动合并
- **手动干预** — 支持手动合并/拆分，处理自动匹配冲突
- **补偿同步** — 每天凌晨自动全量同步，检测离职丢失等异常
- **管理后台** — Vue 3 可视化界面，员工管理、事件日志、同步任务一应俱全

## 快速开始

### 环境要求

- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [Node.js](https://nodejs.org/) 18+

### 一键启动（Windows）

```bash
start.bat
```

脚本自动完成：检查环境 → 启动 MongoDB → 启动后端 → 启动前端 → 打开浏览器。

### 手动启动

```bash
# MongoDB
docker compose up -d

# 后端
cd backend-nest
npm install && npm run build && npm run start:dev

# 前端
cd frontend-vue
npm install && npm run dev
```

浏览器访问 **http://localhost:5173**

### 配置平台凭证

编辑 `backend-nest/.env`：

```env
# 钉钉
DINGTALK_CLIENT_ID=your_app_key
DINGTALK_CLIENT_SECRET=your_app_secret

# 企业微信
WECOM_CORP_ID=your_corp_id
WECOM_SECRET=your_secret
WECOM_CALLBACK_TOKEN=your_token
WECOM_ENCODING_AES_KEY=your_aes_key
```

## 导入测试数据

```bash
# 方式一：110 人虚拟数据
node seed-100.mjs

# 方式二：示例数据（含跨平台合并演示）
node import-sample.mjs
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | NestJS + TypeScript + Mongoose + MongoDB |
| 前端 | Vue 3 + TypeScript + Vite + Element Plus + Pinia |
| 基础设施 | Docker Compose |

## 项目结构

```
├── backend-nest/          # NestJS 后端
│   └── src/
│       ├── schemas/       # 数据模型（staff, staff-union, event-log, sync-task, sync-error）
│       ├── modules/
│       │   ├── platform/  # 钉钉/企微 API 客户端
│       │   ├── dingtalk-stream/  # 钉钉 Stream 事件消费
│       │   ├── wecom-callback/   # 企业微信 Callback 事件接收
│       │   ├── event/     # 统一事件处理
│       │   ├── sync/      # 核心同步逻辑
│       │   ├── staff/     # 平台员工管理
│       │   ├── staff-union/  # 统一员工管理
│       │   └── task/      # 定时任务
│       └── common/        # 公共（枚举、DTO、过滤器、工具）
├── frontend-vue/          # Vue 3 前端
│   └── src/
│       ├── views/         # 页面（staff, staff-union, event-log, sync-error, sync-task）
│       ├── components/    # 共享组件
│       ├── composables/   # 组合式函数
│       ├── api/           # API 封装
│       ├── types/         # TypeScript 类型
│       └── store/         # Pinia 状态管理
├── docker-compose.yml     # MongoDB 容器
├── start.bat              # 一键启动脚本
├── seed-100.mjs           # 110 人测试数据生成器
└── sample-data.json       # 示例数据文件
```

## API 接口

### 管理接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/staff-unions` | 统一员工列表 |
| GET | `/api/staff-unions/:id` | 统一员工详情 |
| POST | `/api/staff-unions/merge` | 手动合并 |
| POST | `/api/staff-unions/unmerge` | 手动拆分 |
| GET | `/api/staffs` | 平台员工列表 |
| GET | `/api/staffs/:id` | 平台员工详情 |
| GET | `/api/event-logs` | 事件日志列表 |
| POST | `/api/event-logs/:id/retry` | 重试失败事件 |
| GET | `/api/sync-errors` | 错误日志列表 |
| POST | `/api/sync-errors/:id/retry` | 重试失败同步 |
| GET | `/api/sync-tasks` | 同步任务列表 |

### 同步接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/sync/dingtalk/full` | 钉钉全量同步 |
| POST | `/api/sync/wecom/full` | 企业微信全量同步 |
| POST | `/api/sync/staff/one` | 单员工同步 |

### 其他

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| POST | `/api/dev/mock-dingtalk-event` | 模拟事件（仅开发环境） |

## 员工合并规则

同一员工在不同平台（钉钉、企业微信）的记录，按以下优先级自动合并：

1. **手机号**相同 → 自动合并
2. **工号**相同 → 自动合并
3. **邮箱**相同 → 自动合并

仅姓名相同不会自动合并（防止重名误合并）。匹配冲突时标记为"待处理"供人工决策。

## 补偿同步

每天凌晨自动执行全量同步（钉钉 02:07，企微 03:07），包含离职检测：

1. 从平台 API 消失的员工标记为 `inactive_pending`
2. 持续 24 小时未恢复 → 标记为 `resigned`

## 数据管理

### 清空数据库

```bash
docker exec staff-sync-mongodb mongosh "mongodb://localhost:27017/staff-sync" \
  --eval "
    db.staffs.deleteMany({});
    db.staffunions.deleteMany({});
    db.eventlogs.deleteMany({});
    db.synctasks.deleteMany({});
    db.syncerrorlogs.deleteMany({});
  "
```

### 备份数据

```bash
docker exec staff-sync-mongodb mongodump --db staff-sync --out /tmp/backup
docker cp staff-sync-mongodb:/tmp/backup ./mongo-backup
```

## 常见问题

**Q: 启动后页面无数据？**
运行 `node seed-100.mjs` 导入测试数据。

**Q: 钉钉事件收不到？**
确认 `.env` 中已配置正确的 `DINGTALK_CLIENT_ID` 和 `DINGTALK_CLIENT_SECRET`。开发阶段可用模拟接口测试。

**Q: 企业微信回调验证失败？**
生产环境需在企微后台配置回调 URL `https://your-domain/api/events/wecom/callback`，Token 和 EncodingAESKey 需与 `.env` 一致。

**Q: 工号显示为职位名称？**
这是常见的配置问题。工号 (`jobNumber`) 和职位 (`position`) 是两个独立字段，请确认平台 API 映射正确。示例数据中工号格式为 `EMP0001`。

## License

MIT
