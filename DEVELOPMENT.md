# 开发文档 — 系统架构与实现

> 面向接手开发的工程师，记录当前系统架构、模块设计、数据流、安全措施和运维指南。
> 功能需求文档见 `staff_sync_requirement_doc.md`，早期设计文档见 `staff_sync_development_doc.md`。

---

## 1. 系统架构

```
┌─────────────┐     ┌──────────────┐     ┌───────────┐
│  钉钉 Stream │────▶│  NestJS 后端  │────▶│ MongoDB   │
│  (长连接)    │     │  :3001        │     │ :27018    │
└─────────────┘     │               │     └───────────┘
                    │  ┌─────────┐  │
┌─────────────┐     │  │ Sync    │  │     ┌───────────┐
│ 企业微信      │────▶│  │ Service │──│────▶│ Vue 3 前端 │
│ Callback     │     │  └─────────┘  │     │ :5173     │
└─────────────┘     └──────────────┘     └───────────┘
```

**数据流**：平台事件 → 幂等检查 → upsert staff → 匹配/创建 union → 刷新 union 状态

两个平台的员工事件走统一入口 `SyncService`，不区分来源。

---

## 2. 技术栈

| 层级 | 选型 | 版本 |
|------|------|------|
| 运行时 | Node.js | 18+ |
| 后端框架 | NestJS | 10.3 |
| 语言 | TypeScript | 5.3 |
| 数据库 | MongoDB | 7 (Docker) |
| ODM | Mongoose | 8.0 |
| 前端框架 | Vue 3 | 3.4 |
| 构建工具 | Vite | 5.4 |
| UI 库 | Element Plus | 2.7 |
| 状态管理 | Pinia | 2.1 |
| 钉钉 SDK | dingtalk-stream | 2.1 |
| XML 解析 | fast-xml-parser | 5.8 |
| 定时任务 | @nestjs/schedule | 4.0 |

---

## 3. 后端目录结构

```
backend-nest/src/
├── main.ts                      # 入口：ValidationPipe + CORS + ExceptionFilter
├── app.module.ts                # 根模块（12 个子模块）
├── health.controller.ts         # GET /health
├── config/
│   ├── database.config.ts       # MongoDB 连接
│   └── platform.config.ts       # 钉钉/企微配置（预留，当前读 process.env）
├── common/
│   ├── dto/pagination.dto.ts    # 通用分页 DTO（含 skip/limit getter）
│   ├── enums/                   # 6 个枚举
│   │   ├── platform-type.enum.ts
│   │   ├── staff-status.enum.ts
│   │   ├── union-status.enum.ts
│   │   ├── handle-status.enum.ts
│   │   ├── event-source.enum.ts
│   │   └── sync-status.enum.ts
│   ├── filters/
│   │   └── all-exceptions.filter.ts  # 全局异常过滤器（生产不泄露堆栈）
│   └── utils/
│       └── sanitize.util.ts     # ReDoS 防护 + 错误消息脱敏
├── schemas/
│   ├── staff.schema.ts          # 平台员工（唯一索引 platformType+corpId+platformUserId）
│   ├── staff-union.schema.ts    # 统一员工（稀疏唯一索引 mobile/email/jobNumber）
│   ├── event-log.schema.ts      # 事件日志（幂等索引 platformType+eventId）
│   ├── sync-task.schema.ts      # 同步任务（full/single/event/retry）
│   └── sync-error-log.schema.ts # 同步错误（关联 taskId/eventLogId）
└── modules/
    ├── platform/                # 钉钉/企微 API 封装
    │   ├── clients/dingtalk.client.ts
    │   ├── clients/wecom.client.ts
    │   ├── platform.service.ts
    │   ├── platform.types.ts     # PlatformStaffDTO
    │   └── platform.module.ts
    ├── dingtalk-stream/         # 钉钉 Stream 长连接消费
    ├── wecom-callback/          # 企业微信 HTTP Callback（加解密 + XML 解析）
    ├── event/                   # 统一事件处理（幂等检查 + 分发）
    ├── sync/                    # 核心同步（upsert → match → bind → refresh）
    ├── staff/                   # 平台员工 CRUD
    ├── staff-union/             # 统一员工 CRUD + 合并/拆分
    ├── task/                    # 定时补偿同步（Cron）
    ├── admin/                   # 管理 API（event-log, sync-error, sync-task 控制器）
    └── dev-mock/                # 开发环境模拟事件（仅 NODE_ENV !== production）
```

---

## 4. 前端目录结构

```
frontend-vue/src/
├── main.ts              # 入口（注册 Pinia + Element Plus + Router）
├── App.vue              # 根组件（<router-view />）
├── router/index.ts      # 6 个路由（Layout 下 5 个子路由 + 1 个详情路由）
├── store/index.ts       # Pinia store（activeMenu 状态）
├── api/
│   ├── request.ts       # Axios 封装（baseURL: /api, 统一错误提示）
│   ├── staff.ts         # 平台员工 API
│   ├── staffUnion.ts    # 统一员工 API（含 merge/unmerge）
│   ├── syncTask.ts      # 同步任务 + 触发同步 API
│   ├── eventLog.ts      # 事件日志 API（含 retry）
│   └── syncError.ts     # 同步错误 API
├── views/
│   ├── Layout.vue       # 侧边栏布局
│   ├── staff-union/     # 统一员工列表 + 详情
│   ├── staff/           # 平台员工列表
│   ├── sync-task/       # 同步任务列表
│   ├── event-log/       # 事件日志列表
│   └── sync-error/      # 同步错误列表
├── components/
│   ├── StatusTag.vue    # 状态标签（支持 staff/syncTask/custom 三种模式）
│   ├── SearchForm.vue   # 通用搜索表单
│   └── JsonViewer.vue   # JSON 数据展示弹窗
├── composables/
│   └── useListPage.ts   # 通用列表页逻辑（分页+搜索+重置）
└── types/
    ├── staff.ts         # 员工类型 + 状态映射
    └── sync.ts          # 同步类型 + 状态映射
```

---

## 5. 数据库设计

### 5.1 集合与索引

| 集合 | 关键索引 | 说明 |
|------|---------|------|
| `staffs` | `{platformType,corpId,platformUserId}` UNIQUE | 平台员工 |
| `staffs` | `unionId`, `mobile`, `email`, `jobNumber` | 关联查询 |
| `staffunions` | `mobile` UNIQUE SPARSE | 同名稀疏唯一索引 |
| `staffunions` | `email` UNIQUE SPARSE | 同名稀疏唯一索引 |
| `staffunions` | `jobNumber` UNIQUE SPARSE | 同名稀疏唯一索引 |
| `eventlogs` | `{platformType,eventId}` | 幂等去重 |
| `synctasks` | `{platformType,syncType,status}` | 任务查询 |
| `syncerrorlogs` | `{status,nextRetryAt}` | 重试队列 |

### 5.2 关联设计

`staff.unionId → staff_union._id` 单向引用。union 不存 staffIds，所有查询从 staff 侧发起。

```
staff_union 1 : N staff (via staff.unionId)
```

### 5.3 union 状态派生

union 状态不由自身字段决定，而是实时从其关联的 staffs 计算：
- 任一 staff 为 active → union 为 active
- 全部 staff 非 active → union 为 resigned

---

## 6. 同步逻辑详解

### 6.1 事件处理流程

```
平台事件到达
  → 幂等检查（eventId + platformType 查 event_logs）
  → 已处理？跳过
  → 创建 event_log（status=pending）
  → 通过平台 API 获取员工详情
  → API 失败？使用事件数据作为降级 DTO
  → upsertStaff（存在更新、不存在创建）
  → 有 unionId？refreshUnion
  → 无 unionId？matchAndBindUnion
  → 成功：event_log → success
  → 失败：event_log → failed + sync_error_log
```

### 6.2 自动合并规则

优先级从高到低：

1. **mobile** — 手机号相同
2. **jobNumber** — 工号相同
3. **email** — 邮箱相同

仅姓名相同不自动合并。匹配冲突标记为 `conflictStatus: pending`。

### 6.3 upsert 实现

使用 MongoDB `findOneAndUpdate` + 唯一复合索引实现原子 upsert：

```ts
this.staffModel.findOneAndUpdate(
  { platformType, corpId, platformUserId },
  { $set: updateData },
  { new: true, upsert: true },
);
```

### 6.4 竞态防护

`createUnionFromStaff` 使用 MongoDB 稀疏唯一索引 + 捕获 `E11000` 重复键错误的策略。并发创建同一 mobile 的 union 时，后者捕获冲突后重新查询已有记录并绑定。

---

## 7. 定时任务

| Cron | 任务 | 说明 |
|------|------|------|
| `7 2 * * *` | 钉钉全量补偿同步 | 每天 02:07 |
| `7 3 * * *` | 企微全量补偿同步 | 每天 03:07 |

补偿同步包含两阶段离职检测：
1. 从 API 列表中消失 → `inactive_pending`
2. 持续 24h 未恢复 → `resigned`

---

## 8. 安全措施

### 8.1 已实施

| 措施 | 实现 |
|------|------|
| 输入校验 | `ValidationPipe`（whitelist + transform） |
| NoSQL 注入防护 | `sanitizeSearch()` 转义正则特殊字符 |
| ReDoS 防护 | 转义 + 最大长度限制（50字符） |
| 凭证保护 | `.env` 被 `.gitignore` 排除，源码无硬编码密钥 |
| 错误消息脱敏 | `sanitizeErrorMessage()` 移除 URL 中的 token 参数 |
| 堆栈泄露防护 | 全局异常过滤器：生产环境返回通用消息 |
| CORS | 开发环境允许所有来源，生产环境限制 `CORS_ORIGIN` |
| 模拟接口保护 | `DevMockGuard`：生产环境返回 403 |

### 8.2 待实施（生产部署前）

| 措施 | 建议 |
|------|------|
| 管理后台认证 | 添加 JWT/SSO 登录 |
| Rate Limiting | `@nestjs/throttler` 限流 |
| Helmet | `helmet` 安全头 |
| MongoDB 认证 | docker-compose 中配置用户名密码 |
| HTTPS | 反向代理配置 SSL 证书 |
| 审计日志 | 记录敏感操作（合并/拆分/删除） |

---

## 9. 环境变量

```env
# 服务端口
PORT=3001
NODE_ENV=development

# MongoDB（开发：localhost:27018，生产：替换为实际地址）
MONGO_URI=mongodb://localhost:27018/staff-sync

# 钉钉 Stream
DINGTALK_CLIENT_ID=your_app_key
DINGTALK_CLIENT_SECRET=your_app_secret

# 企业微信
WECOM_CORP_ID=your_corp_id
WECOM_SECRET=your_secret
WECOM_CALLBACK_TOKEN=your_token
WECOM_ENCODING_AES_KEY=your_aes_key

# 生产环境 CORS（可选）
CORS_ORIGIN=https://your-frontend-domain.com
```

---

## 10. API 完整参考

### 10.1 统一员工

| 方法 | 路径 | 请求体/参数 | 说明 |
|------|------|-----------|------|
| GET | `/api/staff-unions` | `?page&pageSize&name&mobile&status` | 列表 |
| GET | `/api/staff-unions/:id` | — | 详情（含关联 staffs） |
| POST | `/api/staff-unions/merge` | `{targetUnionId, staffIds[]}` | 手动合并 |
| POST | `/api/staff-unions/unmerge` | `{staffId}` | 手动拆分 |

### 10.2 平台员工

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/staffs` | 列表 `?platformType&status&name&mobile` |
| GET | `/api/staffs/:id` | 详情 |

### 10.3 事件日志

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/event-logs` | 列表 `?platformType&eventSource&handleStatus` |
| GET | `/api/event-logs/:id` | 详情 |
| POST | `/api/event-logs/:id/retry` | 重试失败事件 |

### 10.4 同步错误

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/sync-errors` | 列表 `?platformType&status` |
| GET | `/api/sync-errors/:id` | 详情 |
| POST | `/api/sync-errors/:id/retry` | 重试 |

### 10.5 同步任务

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/sync-tasks` | 列表 `?syncType&status&platformType` |
| GET | `/api/sync-tasks/:id` | 详情 |

### 10.6 同步触发

| 方法 | 路径 | 请求体 | 说明 |
|------|------|------|------|
| POST | `/api/sync/dingtalk/full` | — | 钉钉全量 |
| POST | `/api/sync/wecom/full` | — | 企微全量 |
| POST | `/api/sync/staff/one` | `{platformType,corpId,platformUserId}` | 单员工 |

### 10.7 健康检查

| 方法 | 路径 | 响应 |
|------|------|------|
| GET | `/health` | `{status, timestamp, mongodb}` |

### 10.8 开发模拟

| 方法 | 路径 | 请求体 | 说明 |
|------|------|------|------|
| POST | `/api/dev/mock-dingtalk-event` | 见下方 | 仅非生产 |

模拟事件请求体：
```json
{
  "eventSource": "dingtalk_stream",
  "eventType": "user_add_org",
  "userId": "emp-001",
  "name": "张三",
  "mobile": "13800001111",
  "email": "z3@example.com",
  "jobNumber": "EMP001",
  "departmentIds": ["D001"],
  "position": "前端工程师"
}
```

---

## 11. 本地开发

### 启动

```bash
# MongoDB
docker compose up -d

# 后端（热重载）
cd backend-nest && npm run start:dev

# 前端（热重载）
cd frontend-vue && npm run dev
```

### 导入测试数据

```bash
node seed-100.mjs       # 110 人虚拟数据
node import-sample.mjs  # 示例数据（跨平台合并演示）
```

### 查看数据库

```bash
docker exec -it staff-sync-mongodb mongosh "mongodb://localhost:27017/staff-sync"
```

### 构建

```bash
cd backend-nest && npm run build     # 编译 TypeScript
cd frontend-vue && npm run build     # 构建前端
```

---

## 12. 部署清单

生产部署前确认：

- [ ] `.env` 配置真实钉钉/企微凭证
- [ ] `NODE_ENV=production`
- [ ] `CORS_ORIGIN` 设置为前端域名
- [ ] MongoDB 配置认证（用户名/密码）
- [ ] 反向代理配置 HTTPS
- [ ] 企业管理后台添加登录认证
- [ ] 企微后台配置回调 URL（`/api/events/wecom/callback`）
- [ ] 钉钉后台订阅通讯录事件
- [ ] 配置日志收集（ELK / 云日志服务）
- [ ] 设置监控告警（health endpoint + 同步失败通知）
