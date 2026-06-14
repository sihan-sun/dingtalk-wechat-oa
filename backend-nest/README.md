# 钉钉 / 企业微信员工信息同步系统

## 项目简介

本项目实现钉钉、企业微信与本系统之间的员工数据同步，将同一个员工在不同平台中的账号合并为统一员工。

## 技术栈

- **后端**: NestJS + TypeScript + MongoDB + Mongoose
- **前端**: Vue 3 + Vite + Element Plus (待开发)
- **钉钉接入**: Stream 模式长连接（非 HTTP Callback）
- **企业微信接入**: HTTP Callback（GET 验证 + POST 解密接收）

## 快速开始

### 1. 启动 MongoDB

```bash
docker compose up -d
```

### 2. 配置环境变量

```bash
cd backend-nest
cp .env.example .env
# 编辑 .env，填入真实钉钉凭据（或保留占位符使用模拟模式）
```

### 3. 启动后端

```bash
cd backend-nest
npm install
npm run start:dev
```

## 两种运行模式

### 模式一：真实钉钉 Stream 接入（需企业资质）

1. 在 [钉钉开放平台](https://open.dingtalk.com/) 创建**企业内部应用**。
2. 获取 **AppKey**（即 `DINGTALK_CLIENT_ID`）和 **AppSecret**（即 `DINGTALK_CLIENT_SECRET`）。
3. 在「事件与回调」页面勾选通讯录事件。
4. 将 AppKey/AppSecret 填入 `.env`，重启服务。

### 模式二：真实企业微信 Callback 接入（需企业资质）

1. 在 [企业微信管理后台](https://work.weixin.qq.com/) 创建自建应用。
2. 获取 **CorpID**、**Secret**，并在「接收消息」中配置回调 URL：
   - URL: `https://your-domain/api/events/wecom/callback`
   - Token: 随机字符串
   - EncodingAESKey: 随机 43 位字符
3. 订阅通讯录变更事件。
4. 将配置填入 `.env`：
   ```
   WECOM_CORP_ID=wwxxx
   WECOM_SECRET=xxx
   WECOM_CALLBACK_TOKEN=xxx
   WECOM_ENCODING_AES_KEY=xxx
   ```
5. 重启服务，企业微信会 GET 验证 URL → POST 推送事件。

**注意**: 企业微信回调要求服务有公网可达的域名。本地开发可用 [cpolar](https://www.cpolar.com/) 等内网穿透工具。

### 模式三：本地模拟事件（无需企业资质，当前开发模式）

由于测试账号无企业主体，无法创建企业内部应用。使用模拟接口完成开发验证。

### 模式一：真实钉钉 Stream 接入（需企业资质）

1. 在 [钉钉开放平台](https://open.dingtalk.com/) 创建**企业内部应用**。
2. 获取 **AppKey**（即 `DINGTALK_CLIENT_ID`）和 **AppSecret**（即 `DINGTALK_CLIENT_SECRET`）。
3. 在「事件与回调」页面勾选通讯录事件。
4. 将 AppKey/AppSecret 填入 `.env`，重启服务。

### 模式二：真实企业微信 Callback 接入（需企业资质）

1. 在 [企业微信管理后台](https://work.weixin.qq.com/) 创建自建应用。
2. 获取 **CorpID**、**Secret**，并在「接收消息」中配置回调 URL：
   - URL: `https://your-domain/api/events/wecom/callback`
   - Token: 随机字符串
   - EncodingAESKey: 随机 43 位字符
3. 订阅通讯录变更事件。
4. 将配置填入 `.env`：
   ```
   WECOM_CORP_ID=wwxxx
   WECOM_SECRET=xxx
   WECOM_CALLBACK_TOKEN=xxx
   WECOM_ENCODING_AES_KEY=xxx
   ```
5. 重启服务，企业微信会 GET 验证 URL → POST 推送事件。

**注意**: 企业微信回调要求服务有公网可达的域名。本地开发可用 [cpolar](https://www.cpolar.com/) 等内网穿透工具。

### 模式三：本地模拟事件（无需企业资质，当前开发模式）

由于测试账号无企业主体，无法创建企业内部应用。使用模拟接口完成开发验证。

```bash
# ===== 钉钉模拟事件 =====
# 入职
curl -X POST http://localhost:3000/api/dev/mock-dingtalk-event \
  -H "Content-Type: application/json" \
  -d '{"eventType":"user_add_org","userId":"emp-001","name":"张三","mobile":"13800001111"}'
# 离职
curl -X POST http://localhost:3000/api/dev/mock-dingtalk-event \
  -H "Content-Type: application/json" \
  -d '{"eventType":"user_leave_org","userId":"emp-001"}'

# ===== 企业微信模拟事件 =====
# 入职
curl -X POST http://localhost:3000/api/dev/mock-dingtalk-event \
  -H "Content-Type: application/json" \
  -d '{"eventSource":"wecom_callback","eventType":"create_user","userId":"wc-001","name":"李四","mobile":"13900002222"}'
# 修改
curl -X POST http://localhost:3000/api/dev/mock-dingtalk-event \
  -H "Content-Type: application/json" \
  -d '{"eventSource":"wecom_callback","eventType":"update_user","userId":"wc-001","name":"李四(已改名)","position":"总监"}'
# 离职
curl -X POST http://localhost:3000/api/dev/mock-dingtalk-event \
  -H "Content-Type: application/json" \
  -d '{"eventSource":"wecom_callback","eventType":"delete_user","userId":"wc-001"}'

# ===== 跨平台合并验证 =====
# 钉钉入职 (mobile=13700001111)
curl -X POST http://localhost:3000/api/dev/mock-dingtalk-event \
  -H "Content-Type: application/json" \
  -d '{"eventType":"user_add_org","userId":"dt-cross","name":"王五","mobile":"13700001111"}'
# 企微入职 (同一手机号 → 自动合并)
curl -X POST http://localhost:3000/api/dev/mock-dingtalk-event \
  -H "Content-Type: application/json" \
  -d '{"eventSource":"wecom_callback","eventType":"create_user","userId":"wc-cross","name":"王五","mobile":"13700001111"}'
# 企微离职 (钉钉仍在职 → union 仍为 active)
curl -X POST http://localhost:3000/api/dev/mock-dingtalk-event \
  -H "Content-Type: application/json" \
  -d '{"eventSource":"wecom_callback","eventType":"delete_user","userId":"wc-cross"}'
```

> **注意**: 模拟接口仅在 `NODE_ENV !== 'production'` 时可用。生产环境返回 403。

## 模拟接口说明

| 项目 | 说明 |
|------|------|
| 路径 | `POST /api/dev/mock-dingtalk-event` |
| 环境限制 | `NODE_ENV !== 'production'`，否则返回 403 |
| 复用逻辑 | 直接调用 `SyncService.handleDingTalkEvent()`，与真实 Stream 事件走完全相同的处理管道 |
| 验证目标 | event_logs、staffs、staff_unions 写入，union 自动合并，幂等去重 |

## 数据验证

```bash
# 连接到 MongoDB
docker exec -it staff-sync-mongodb mongosh staff-sync

# 查看事件日志
db.eventlogs.find().sort({createdAt:-1}).limit(10).pretty()

# 查看平台员工
db.staffs.find().pretty()

# 查看统一员工
db.staffunions.find().pretty()

# 查看同步错误日志
db.syncerrorlogs.find().pretty()

# 验证合并结果：同一手机号的 staff 是否指向同一个 unionId
db.staffs.aggregate([
  { $group: { _id: "$unionId", staffCount: { $sum: 1 }, staffs: { $push: { platformUserId: "$platformUserId", mobile: "$mobile" } } } }
]).pretty()
```

## 目录结构

```
backend-nest/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── config/                  # 数据库和平台配置
│   ├── common/enums/            # 枚举定义
│   ├── schemas/                 # Mongoose Schema
│   │   ├── staff.schema.ts      # 平台员工
│   │   ├── staff-union.schema.ts # 统一员工
│   │   ├── event-log.schema.ts  # 事件日志
│   │   └── sync-error-log.schema.ts # 错误日志
│   └── modules/
│       ├── platform/            # 平台适配层（DingTalkClient）
│       ├── dingtalk-stream/     # 钉钉 Stream 长连接
│       ├── dev-mock/            # 开发环境模拟事件入口
│       └── sync/                # 核心同步逻辑
├── .env.example                 # 环境变量模板
└── package.json
```

## 开发阶段

当前处于第一阶段：钉钉 Stream 接入 + 本地模拟验证。

后续待开发：
- 企业微信 Callback 接入
- 主动全量同步 + 定时补偿同步
- 手动合并 / 拆分
- Vue 3 后台管理页面
