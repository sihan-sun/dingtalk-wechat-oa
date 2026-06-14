# 钉钉 / 企业微信员工信息同步系统需求文档

## 1. 项目概述

本项目建设一个员工信息同步系统，用于对接钉钉和企业微信，将第三方办公平台中的员工信息同步到本系统中。

当钉钉或企业微信中发生员工入职、离职、信息修改、删除员工、部门调整等操作时，本系统需要感知这些变化，并更新本地员工数据。

系统不能只依赖第三方平台的事件通知，因为离职、删除、权限变化、网络异常、事件消费失败等场景都可能导致员工数据没有及时同步。因此，本系统需要同时支持事件驱动同步和主动同步。

本系统采用以下技术栈：

- 数据库：MongoDB
- 后端：Node.js、NestJS、Mongoose
- 前端：Vue 3、Vue Router、Pinia、Axios、Element Plus、Vite

## 2. 建设目标

本系统的目标是实现钉钉、企业微信与本系统之间的员工数据同步，并将同一个员工在不同平台中的账号合并为本系统中的统一员工。

具体目标如下：

1. 支持钉钉员工事件同步。
2. 支持企业微信员工事件同步。
3. 支持主动同步钉钉员工信息。
4. 支持主动同步企业微信员工信息。
5. 支持定时全量同步，用于修复事件丢失或同步失败造成的数据不一致。
6. 支持手动触发全量同步。
7. 支持单个员工重新同步。
8. 支持同一个员工在钉钉和企业微信中存在时，合并为一条统一员工数据。
9. 支持员工离职状态同步，避免离职员工仍显示为在职。
10. 支持员工合并冲突识别。
11. 支持管理员手动合并和拆分员工。
12. 支持事件日志、同步任务日志、错误日志和失败重试。
13. 支持前端后台查看员工、同步任务、事件日志和异常数据。

## 3. 系统范围

### 3.1 包含范围

本系统包含以下功能：

1. 钉钉 Stream 模式事件消费。
2. 企业微信通讯录变更回调接收。
3. 钉钉员工主动同步。
4. 企业微信员工主动同步。
5. 平台员工 staff 数据管理。
6. 统一员工 staff_union 数据管理。
7. 员工自动合并。
8. 员工手动合并和拆分。
9. 离职员工状态识别和同步。
10. 同步任务管理。
11. 事件日志管理。
12. 同步错误日志管理。
13. Vue 3 后台管理页面。

### 3.2 不包含范围

本系统不负责以下内容：

1. 不负责钉钉、企业微信平台内部员工数据维护。
2. 不负责企业内部审批、考勤、绩效等业务流程。
3. 不负责统一认证登录，除非后续项目单独扩展。
4. 不负责作为人事系统的完整替代，只负责员工基础数据同步和合并。

## 4. 术语定义

| 术语 | 含义 |
|---|---|
| staff | 平台员工数据，表示员工在钉钉或企业微信中的一个账号身份 |
| union / staff_union | 统一员工数据，表示本系统中合并后的员工主数据 |
| platformType | 平台类型，取值为 dingtalk 或 wecom |
| corpId | 企业 ID，用于区分不同企业或租户 |
| platformUserId | 第三方平台中的员工唯一 ID |
| unionId | staff 表中保存的统一员工 ID |
| Stream 模式 | 钉钉事件订阅的一种模式，系统通过长连接方式消费钉钉事件 |
| Callback 模式 | 第三方平台通过 HTTP 请求将事件推送到本系统的方式 |
| 全量同步 | 系统主动拉取某个平台下全部员工信息 |
| 单个同步 | 系统主动同步某一个员工信息 |
| 补偿同步 | 通过定时全量同步修复事件丢失或同步失败的数据 |

## 5. 总体业务流程

系统员工同步分为三条主线：

1. 事件同步。
2. 主动同步。
3. 员工合并。

### 5.1 事件同步

钉钉使用 Stream 模式消费员工变更事件。

企业微信使用 HTTP Callback 接收通讯录变更事件。

事件同步主要用于处理实时变化，例如员工新增、员工信息修改、员工离职、员工删除、部门变更等。

### 5.2 主动同步

主动同步由本系统调用钉钉或企业微信接口，拉取员工列表和员工详情。

主动同步包括：

1. 全量同步。
2. 单个员工同步。
3. 定时补偿同步。

主动同步用于修复事件丢失、离职未同步、员工数据不完整等问题。

### 5.3 员工合并

同一个员工可能同时存在于钉钉和企业微信中。

系统需要根据手机号、工号、邮箱等唯一性较强的字段，将不同平台的 staff 合并到同一个 staff_union 下。

## 6. 核心数据设计

系统使用 MongoDB，核心 collection 包括：

1. staffs
2. staff_unions
3. event_logs
4. sync_tasks
5. sync_error_logs

### 6.1 数据关联原则

staff 和 staff_union 之间采用单向关联。

只在 staff 中保存 unionId。

staff_union 中不保存 staffIds，也不保存 mainStaffId。

这样可以避免双向引用导致的数据冗余和数据不一致问题。

关系如下：

```text
staff_union 1 : N staffs

staffs.unionId -> staff_unions._id
```

当需要查询某个统一员工对应的平台账号时，通过 staffs.unionId 查询：

```js
db.staffs.find({ unionId: unionId })
```

### 6.2 staff 表说明

staff 表用于存储员工在钉钉或企业微信中的平台身份信息。

一个平台账号对应一条 staff 记录。

如果同一个员工同时存在于钉钉和企业微信中，则 staff 表中会存在两条记录，两条记录的 unionId 指向同一个 staff_union。

#### staff 字段设计

| 字段名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| _id | ObjectId | 是 | 主键 |
| unionId | ObjectId | 否 | 关联 staff_union 的 ID |
| platformType | String | 是 | 平台类型：dingtalk / wecom |
| corpId | String | 是 | 企业 ID |
| platformUserId | String | 是 | 平台员工唯一 ID |
| platformUnionId | String | 否 | 平台 unionId，如平台提供则保存 |
| name | String | 否 | 员工姓名 |
| mobile | String | 否 | 手机号 |
| email | String | 否 | 邮箱 |
| jobNumber | String | 否 | 工号 |
| avatar | String | 否 | 头像 |
| departmentIds | Array | 否 | 部门 ID 列表 |
| departmentNames | Array | 否 | 部门名称列表 |
| position | String | 否 | 职位 |
| status | String | 是 | 平台员工状态 |
| isDeleted | Boolean | 是 | 是否已从平台删除 |
| joinTime | Date | 否 | 入职时间 |
| resignTime | Date | 否 | 离职时间 |
| rawData | Object | 否 | 平台返回的原始员工数据 |
| lastEventAt | Date | 否 | 最近一次事件同步时间 |
| lastSyncAt | Date | 否 | 最近一次主动同步时间 |
| createdAt | Date | 是 | 创建时间 |
| updatedAt | Date | 是 | 更新时间 |

#### staff 状态

| 状态 | 含义 |
|---|---|
| active | 在职 |
| inactive | 停用或不可用 |
| inactive_pending | 疑似离职，等待二次确认 |
| resigned | 已离职 |
| deleted | 已从平台删除 |

#### staff 唯一约束

staff 表需要建立唯一索引：

```text
platformType + corpId + platformUserId 唯一
```

用于保证同一个平台、同一个企业、同一个平台员工不会重复创建。

### 6.3 staff_union 表说明

staff_union 表用于存储本系统中的统一员工数据。

staff_union 不直接存储 staffIds，不直接存储 mainStaffId。

统一员工与平台员工的关系由 staff.unionId 表达。

#### staff_union 字段设计

| 字段名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| _id | ObjectId | 是 | 主键 |
| name | String | 否 | 统一员工姓名 |
| mobile | String | 否 | 统一手机号 |
| email | String | 否 | 统一邮箱 |
| jobNumber | String | 否 | 统一工号 |
| avatar | String | 否 | 统一头像 |
| status | String | 是 | 统一员工状态 |
| matchKey | String | 否 | 合并依据值，例如手机号、工号、邮箱 |
| matchRule | String | 否 | 合并规则，例如 mobile、jobNumber、email、manual |
| conflictStatus | String | 是 | 冲突状态 |
| createdAt | Date | 是 | 创建时间 |
| updatedAt | Date | 是 | 更新时间 |

#### staff_union 状态

| 状态 | 含义 |
|---|---|
| active | 统一员工在职 |
| inactive | 统一员工不可用 |
| resigned | 统一员工已离职 |

#### staff_union 冲突状态

| 状态 | 含义 |
|---|---|
| none | 无冲突 |
| pending | 待人工确认 |
| resolved | 已处理 |

### 6.4 event_logs 表说明

event_logs 用于保存平台事件数据。

钉钉 Stream 事件和企业微信 Callback 事件都统一记录到 event_logs 中。

该表不限定事件来源一定是 HTTP Callback，因此命名为 event_logs，而不是 callback_logs。

#### event_logs 字段设计

| 字段名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| _id | ObjectId | 是 | 主键 |
| platformType | String | 是 | dingtalk / wecom |
| eventSource | String | 是 | dingtalk_stream / wecom_callback |
| corpId | String | 否 | 企业 ID |
| eventType | String | 否 | 事件类型 |
| eventId | String | 否 | 事件唯一 ID |
| platformUserId | String | 否 | 平台员工 ID |
| rawPayload | Object | 是 | 原始事件内容 |
| handleStatus | String | 是 | pending / success / failed |
| errorMessage | String | 否 | 错误信息 |
| receivedAt | Date | 是 | 接收时间 |
| handledAt | Date | 否 | 处理时间 |
| createdAt | Date | 是 | 创建时间 |
| updatedAt | Date | 是 | 更新时间 |

### 6.5 sync_tasks 表说明

sync_tasks 用于记录主动同步任务。

#### sync_tasks 字段设计

| 字段名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| _id | ObjectId | 是 | 主键 |
| platformType | String | 是 | dingtalk / wecom |
| syncType | String | 是 | full / single / event / retry |
| status | String | 是 | pending / running / success / failed / partial_success |
| totalCount | Number | 是 | 总数量 |
| successCount | Number | 是 | 成功数量 |
| failCount | Number | 是 | 失败数量 |
| startTime | Date | 否 | 开始时间 |
| endTime | Date | 否 | 结束时间 |
| errorMessage | String | 否 | 错误信息 |
| createdBy | String | 否 | 创建人 |
| createdAt | Date | 是 | 创建时间 |
| updatedAt | Date | 是 | 更新时间 |

### 6.6 sync_error_logs 表说明

sync_error_logs 用于记录同步失败数据。

#### sync_error_logs 字段设计

| 字段名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| _id | ObjectId | 是 | 主键 |
| taskId | ObjectId | 否 | 关联 sync_tasks |
| eventLogId | ObjectId | 否 | 关联 event_logs |
| platformType | String | 是 | dingtalk / wecom |
| platformUserId | String | 否 | 平台员工 ID |
| errorType | String | 否 | 错误类型 |
| errorMessage | String | 是 | 错误信息 |
| retryCount | Number | 是 | 重试次数 |
| nextRetryAt | Date | 否 | 下次重试时间 |
| status | String | 是 | pending / success / failed / ignored |
| createdAt | Date | 是 | 创建时间 |
| updatedAt | Date | 是 | 更新时间 |

## 7. 员工合并规则

员工合并是本系统的核心逻辑。

当系统同步到一条 staff 数据时，需要判断该 staff 是否应绑定到已有 staff_union。

### 7.1 自动合并优先级

自动合并优先级如下：

1. 手机号 mobile。
2. 工号 jobNumber。
3. 邮箱 email。

### 7.2 自动合并规则

1. 如果 mobile 一致，则自动合并。
2. 如果 mobile 为空，但 jobNumber 一致，则自动合并。
3. 如果 mobile 和 jobNumber 为空，但 email 一致，则自动合并。
4. 如果 staff 已经存在 unionId，则优先更新原绑定关系，不重复创建 union。
5. 自动合并后，需要更新 staff.unionId。
6. staff_union 不保存 staffIds。

### 7.3 不自动合并规则

以下情况不自动合并：

1. 只有姓名相同。
2. 姓名相同但手机号不同。
3. 手机号、工号、邮箱均为空。
4. 根据一个字段匹配到多个候选 union。
5. 员工数据明显冲突，例如手机号相同但姓名完全不同，需要按业务规则进入待确认。

### 7.4 人工处理规则

如果系统无法自动判断是否为同一员工，需要将 staff_union 或相关记录标记为 conflictStatus = pending。

管理员可以在前端执行：

1. 手动合并。
2. 手动拆分。
3. 标记忽略。
4. 重新同步。

## 8. 员工状态规则

### 8.1 staff 状态规则

staff.status 表示员工在某一个平台中的状态。

例如：

1. 员工在钉钉在职，则钉钉 staff 为 active。
2. 员工在企业微信在职，则企业微信 staff 为 active。
3. 员工在钉钉离职，则钉钉 staff 为 resigned。
4. 员工在企业微信删除，则企业微信 staff 为 deleted。

### 8.2 staff_union 状态规则

staff_union.status 表示员工在本系统中的统一状态。

统一状态根据该 union 下所有 staff 计算。

规则如下：

1. 如果任意 staff.status = active，则 staff_union.status = active。
2. 如果所有 staff.status 都不是 active，则 staff_union.status = resigned。
3. 如果员工在钉钉离职，但企业微信仍在职，则 staff_union.status = active。
4. 如果员工在钉钉和企业微信都离职，则 staff_union.status = resigned。

## 9. 事件同步需求

### 9.1 钉钉事件同步

钉钉员工事件通过 Stream 模式消费。

系统不提供钉钉 HTTP Callback 接口。

钉钉 Stream 消费服务负责：

1. 建立钉钉 Stream 连接。
2. 订阅通讯录员工相关事件。
3. 接收员工新增、修改、离职、删除、部门变更等事件。
4. 将原始事件保存到 event_logs。
5. 根据事件类型处理 staff 数据。
6. 执行员工合并。
7. 刷新 staff_union 状态。
8. 处理失败时记录 sync_error_logs。

### 9.2 企业微信事件同步

企业微信员工事件通过 HTTP Callback 接口接收。

系统需要提供企业微信回调地址：

```text
POST /api/events/wecom/callback
GET  /api/events/wecom/callback
```

其中 GET 用于企业微信回调 URL 验证，POST 用于接收通讯录变更事件。

企业微信事件同步流程：

1. 企业微信推送通讯录变更事件。
2. 系统校验 msg_signature、timestamp、nonce。
3. 系统解密事件内容。
4. 系统保存原始事件到 event_logs。
5. 系统解析事件类型。
6. 系统处理员工新增、修改、离职、删除等事件。
7. 系统更新 staff。
8. 系统执行员工合并。
9. 系统刷新 staff_union 状态。
10. 失败时记录 sync_error_logs。

## 10. 主动同步需求

### 10.1 全量同步

系统需要支持钉钉和企业微信全量同步。

全量同步用于拉取某个平台下所有员工信息，并与本地数据比对。

触发方式包括：

1. 管理员手动触发。
2. 系统定时任务触发。

全量同步流程：

1. 创建 sync_tasks。
2. 获取平台 access_token。
3. 拉取部门列表。
4. 拉取员工列表。
5. 拉取员工详情。
6. 新增或更新 staff。
7. 自动合并到 staff_union。
8. 记录本次同步到的 platformUserId。
9. 比对本地 active 员工与平台当前员工列表。
10. 将本地存在但平台列表不存在的员工标记为 inactive_pending。
11. 二次确认后改为 resigned 或 deleted。
12. 刷新 staff_union 状态。
13. 更新同步任务结果。

### 10.2 单个员工同步

系统需要支持单个员工同步。

适用场景：

1. 个别员工状态异常。
2. 个别员工信息缺失。
3. 管理员需要立即修复某个员工。
4. 失败任务重试。

单个员工同步入参包括：

1. platformType。
2. corpId。
3. platformUserId。
4. mobile。

### 10.3 定时补偿同步

系统需要每天定时执行全量同步。

建议执行时间：

1. 每天 02:00 执行钉钉全量同步。
2. 每天 03:00 执行企业微信全量同步。

定时补偿同步用于保证员工数据最终一致。

## 11. 离职员工同步需求

离职员工同步是本系统重点。

离职同步不能只依赖事件，因为事件可能丢失或处理失败。

### 11.1 离职事件处理

如果收到离职或删除事件：

1. 根据 platformType、corpId、platformUserId 查询 staff。
2. 如果 staff 存在，将 staff.status 改为 resigned 或 deleted。
3. 设置 isDeleted。
4. 设置 resignTime。
5. 刷新 staff_union 状态。
6. 保存事件处理结果。

### 11.2 主动同步补偿离职

如果全量同步时发现：

1. 本地 staff 是 active。
2. 平台当前员工列表中不存在该 platformUserId。

则先将 staff.status 改为 inactive_pending。

之后进行二次确认：

1. 如果平台查询不到该员工，则改为 resigned 或 deleted。
2. 如果平台仍能查询到该员工，则恢复为 active。

### 11.3 离职数据保留

离职员工不做物理删除。

系统保留 staff 和 staff_union 数据，只修改状态。

## 12. 前端功能需求

前端使用 Vue 3 实现后台管理系统。

### 12.1 统一员工列表

展示 staff_union 数据。

字段包括：

1. 姓名。
2. 手机号。
3. 邮箱。
4. 工号。
5. 统一状态。
6. 关联平台数量。
7. 关联平台。
8. 更新时间。

说明：关联平台和关联平台数量由后端根据 staff.unionId 查询统计后返回。

支持筛选：

1. 姓名。
2. 手机号。
3. 状态。
4. 平台类型。
5. 更新时间。

支持操作：

1. 查看详情。
2. 手动合并。
3. 手动拆分。
4. 重新同步。

### 12.2 统一员工详情

展示某个 staff_union 的详情。

内容包括：

1. 统一员工基本信息。
2. 关联的 staff 列表。
3. 钉钉平台员工信息。
4. 企业微信平台员工信息。
5. 最近事件时间。
6. 最近同步时间。
7. 平台原始数据。

### 12.3 平台员工列表

展示 staff 数据。

字段包括：

1. 平台类型。
2. 平台员工 ID。
3. 姓名。
4. 手机号。
5. 邮箱。
6. 工号。
7. 部门。
8. 职位。
9. 平台状态。
10. 是否删除。
11. 最近同步时间。

### 12.4 同步任务页面

展示 sync_tasks 数据。

字段包括：

1. 平台类型。
2. 同步类型。
3. 任务状态。
4. 总数量。
5. 成功数量。
6. 失败数量。
7. 开始时间。
8. 结束时间。
9. 错误信息。

支持操作：

1. 查看详情。
2. 重新执行。
3. 查看失败记录。

### 12.5 事件日志页面

展示 event_logs 数据。

字段包括：

1. 平台类型。
2. 事件来源。
3. 事件类型。
4. 平台员工 ID。
5. 处理状态。
6. 错误信息。
7. 接收时间。
8. 处理时间。

支持操作：

1. 查看原始事件。
2. 重新处理失败事件。

### 12.6 同步错误日志页面

展示 sync_error_logs 数据。

字段包括：

1. 平台类型。
2. 平台员工 ID。
3. 错误类型。
4. 错误信息。
5. 重试次数。
6. 下次重试时间。
7. 状态。

支持操作：

1. 重新同步。
2. 标记忽略。
3. 查看关联任务或事件。

### 12.7 手动同步

前端需要提供以下操作：

1. 同步钉钉全部员工。
2. 同步企业微信全部员工。
3. 同步单个员工。
4. 重试失败任务。
5. 重试失败事件。

### 12.8 手动合并和拆分

管理员可以手动将多个 staff 绑定到同一个 staff_union。

管理员可以将错误绑定的 staff 从原 staff_union 中拆出，并创建新的 staff_union。

## 13. 后端接口需求

### 13.1 企业微信事件接口

```text
GET  /api/events/wecom/callback
POST /api/events/wecom/callback
```

说明：

GET 用于企业微信 URL 验证。

POST 用于接收企业微信通讯录变更事件。

### 13.2 同步接口

```text
POST /api/sync/dingtalk/full
POST /api/sync/wecom/full
POST /api/sync/staff/one
POST /api/sync-errors/:id/retry
POST /api/event-logs/:id/retry
```

### 13.3 员工接口

```text
GET /api/staffs
GET /api/staffs/:id
GET /api/staff-unions
GET /api/staff-unions/:id
POST /api/staff-unions/merge
POST /api/staff-unions/unmerge
```

### 13.4 日志接口

```text
GET /api/sync-tasks
GET /api/sync-tasks/:id
GET /api/event-logs
GET /api/event-logs/:id
GET /api/sync-errors
GET /api/sync-errors/:id
```

## 14. 非功能需求

### 14.1 数据一致性

系统需要保证员工数据最终一致。

事件同步负责实时性，主动同步和定时补偿负责一致性修复。

### 14.2 幂等性

事件可能重复推送，主动同步也可能重复执行。

系统必须保证重复处理不会重复创建 staff 或 staff_union。

### 14.3 可追踪性

系统需要保存事件日志、同步任务日志和错误日志。

### 14.4 可扩展性

平台对接需要通过适配层实现。

当前支持钉钉和企业微信，后续可以扩展飞书或其他办公平台。

### 14.5 安全性

1. 企业微信 Callback 需要校验签名并解密。
2. 同步接口需要管理员权限。
3. 平台密钥不能写死在代码中。
4. access_token、appSecret、EncodingAESKey 等敏感信息需要放在环境变量或配置中心。

### 14.6 容错性

单个员工同步失败不应导致整个全量同步任务失败。

系统应记录失败原因，并继续同步其他员工。

## 15. 验收标准

1. 钉钉员工新增事件可以通过 Stream 模式被系统消费。
2. 企业微信员工新增事件可以通过 Callback 被系统接收。
3. 钉钉新增员工后，本系统可以创建 staff。
4. 企业微信新增员工后，本系统可以创建 staff。
5. 员工手机号相同时，可以合并到同一条 staff_union。
6. staff 中保存 unionId。
7. staff_union 中不保存 staffIds。
8. staff_union 中不保存 mainStaffId。
9. 员工信息修改后，本系统可以更新 staff 和 staff_union。
10. 员工在钉钉离职后，钉钉 staff 状态可以变为 resigned。
11. 员工在企业微信仍在职时，staff_union 状态仍为 active。
12. 员工在所有平台都离职后，staff_union 状态变为 resigned。
13. 即使离职事件丢失，定时全量同步也能发现并修复员工状态。
14. 管理员可以手动触发钉钉全量同步。
15. 管理员可以手动触发企业微信全量同步。
16. 管理员可以同步单个员工。
17. 管理员可以手动合并员工。
18. 管理员可以手动拆分员工。
19. 管理员可以查看事件日志。
20. 管理员可以查看同步任务。
21. 管理员可以查看同步错误日志。
22. 管理员可以重试失败同步。
