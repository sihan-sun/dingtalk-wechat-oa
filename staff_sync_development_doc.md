# 钉钉 / 企业微信员工信息同步系统开发文档

## 1. 技术架构

本系统采用前后端分离架构。

后端使用 Node.js + NestJS，负责平台对接、事件消费、主动同步、员工合并、状态维护、日志记录和接口提供。

前端使用 Vue 3，负责后台管理页面，包括员工管理、同步任务、事件日志、错误日志、手动同步、手动合并和拆分等功能。

数据库使用 MongoDB，使用 Mongoose 进行数据建模和访问。

## 2. 技术栈

### 2.1 后端技术栈

- Node.js
- NestJS
- TypeScript
- MongoDB
- Mongoose
- Axios
- @nestjs/config
- @nestjs/schedule
- class-validator
- class-transformer

### 2.2 前端技术栈

- Vue 3
- TypeScript
- Vite
- Vue Router
- Pinia
- Axios
- Element Plus

### 2.3 开发与部署工具

- Docker
- Docker Compose
- Git
- VS Code
- Postman 或 Apifox

## 3. 后端目录结构

```text
backend-nest
├── src
│   ├── main.ts
│   ├── app.module.ts
│   ├── config
│   │   ├── database.config.ts
│   │   └── platform.config.ts
│   ├── common
│   │   ├── enums
│   │   │   ├── platform-type.enum.ts
│   │   │   ├── staff-status.enum.ts
│   │   │   ├── union-status.enum.ts
│   │   │   ├── event-source.enum.ts
│   │   │   └── sync-status.enum.ts
│   │   ├── dto
│   │   ├── utils
│   │   ├── filters
│   │   └── interceptors
│   ├── schemas
│   │   ├── staff.schema.ts
│   │   ├── staff-union.schema.ts
│   │   ├── event-log.schema.ts
│   │   ├── sync-task.schema.ts
│   │   └── sync-error-log.schema.ts
│   ├── modules
│   │   ├── platform
│   │   │   ├── platform.module.ts
│   │   │   ├── platform.service.ts
│   │   │   ├── platform.types.ts
│   │   │   └── clients
│   │   │       ├── dingtalk.client.ts
│   │   │       └── wecom.client.ts
│   │   ├── dingtalk-stream
│   │   │   ├── dingtalk-stream.module.ts
│   │   │   └── dingtalk-stream.service.ts
│   │   ├── event
│   │   │   ├── event.module.ts
│   │   │   ├── event.controller.ts
│   │   │   └── event.service.ts
│   │   ├── sync
│   │   │   ├── sync.module.ts
│   │   │   ├── sync.controller.ts
│   │   │   └── sync.service.ts
│   │   ├── staff
│   │   │   ├── staff.module.ts
│   │   │   ├── staff.controller.ts
│   │   │   └── staff.service.ts
│   │   ├── staff-union
│   │   │   ├── staff-union.module.ts
│   │   │   ├── staff-union.controller.ts
│   │   │   └── staff-union.service.ts
│   │   └── task
│   │       ├── task.module.ts
│   │       └── task.service.ts
└── package.json
```

## 4. 前端目录结构

```text
frontend-vue
├── src
│   ├── main.ts
│   ├── App.vue
│   ├── router
│   │   └── index.ts
│   ├── store
│   │   └── index.ts
│   ├── api
│   │   ├── request.ts
│   │   ├── staff.ts
│   │   ├── staffUnion.ts
│   │   ├── syncTask.ts
│   │   ├── eventLog.ts
│   │   └── syncError.ts
│   ├── views
│   │   ├── staff-union
│   │   │   ├── StaffUnionList.vue
│   │   │   └── StaffUnionDetail.vue
│   │   ├── staff
│   │   │   └── StaffList.vue
│   │   ├── sync-task
│   │   │   ├── SyncTaskList.vue
│   │   │   └── SyncTaskDetail.vue
│   │   ├── event-log
│   │   │   └── EventLogList.vue
│   │   └── sync-error
│   │       └── SyncErrorList.vue
│   ├── components
│   │   ├── SearchForm.vue
│   │   ├── StatusTag.vue
│   │   └── JsonViewer.vue
│   └── types
│       ├── staff.ts
│       └── sync.ts
├── package.json
└── vite.config.ts
```

## 5. 数据库设计

系统使用 MongoDB。

核心 collection：

- staffs
- staff_unions
- event_logs
- sync_tasks
- sync_error_logs

### 5.1 关联设计原则

staff 和 staff_union 之间采用单向引用。

只在 staff 中保存 unionId。

staff_union 中不保存 staffIds，也不保存 mainStaffId。

原因：

1. 避免双向引用。
2. 避免重复维护关系。
3. 避免员工合并、拆分时两边更新不一致。
4. 一对多关系中，外键放在多的一方更清晰。
5. 查询 union 下的 staff 可以通过 staff.unionId 索引完成。

关系如下：

```text
staff_union 1 : N staffs

staffs.unionId -> staff_unions._id
```

### 5.2 Staff Schema

```ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Staff extends Document {
  @Prop({ type: Types.ObjectId, ref: 'StaffUnion', index: true })
  unionId?: Types.ObjectId;

  @Prop({ required: true, enum: ['dingtalk', 'wecom'], index: true })
  platformType: string;

  @Prop({ required: true, index: true })
  corpId: string;

  @Prop({ required: true })
  platformUserId: string;

  @Prop()
  platformUnionId?: string;

  @Prop()
  name?: string;

  @Prop({ index: true })
  mobile?: string;

  @Prop({ index: true })
  email?: string;

  @Prop({ index: true })
  jobNumber?: string;

  @Prop()
  avatar?: string;

  @Prop({ type: [String], default: [] })
  departmentIds: string[];

  @Prop({ type: [String], default: [] })
  departmentNames: string[];

  @Prop()
  position?: string;

  @Prop({
    enum: ['active', 'inactive', 'inactive_pending', 'resigned', 'deleted'],
    default: 'active',
    index: true,
  })
  status: string;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  joinTime?: Date;

  @Prop()
  resignTime?: Date;

  @Prop({ type: Object })
  rawData?: Record<string, any>;

  @Prop()
  lastEventAt?: Date;

  @Prop()
  lastSyncAt?: Date;
}

export const StaffSchema = SchemaFactory.createForClass(Staff);

StaffSchema.index(
  { platformType: 1, corpId: 1, platformUserId: 1 },
  { unique: true },
);

StaffSchema.index({ unionId: 1 });
StaffSchema.index({ mobile: 1 });
StaffSchema.index({ jobNumber: 1 });
StaffSchema.index({ email: 1 });
```

### 5.3 StaffUnion Schema

staff_union 中不保存 staffIds，不保存 mainStaffId。

```ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class StaffUnion extends Document {
  @Prop()
  name?: string;

  @Prop({ index: true })
  mobile?: string;

  @Prop({ index: true })
  email?: string;

  @Prop({ index: true })
  jobNumber?: string;

  @Prop()
  avatar?: string;

  @Prop({
    enum: ['active', 'inactive', 'resigned'],
    default: 'active',
    index: true,
  })
  status: string;

  @Prop()
  matchKey?: string;

  @Prop()
  matchRule?: string;

  @Prop({
    enum: ['none', 'pending', 'resolved'],
    default: 'none',
    index: true,
  })
  conflictStatus: string;
}

export const StaffUnionSchema = SchemaFactory.createForClass(StaffUnion);

StaffUnionSchema.index({ mobile: 1 });
StaffUnionSchema.index({ jobNumber: 1 });
StaffUnionSchema.index({ email: 1 });
```

### 5.4 EventLog Schema

钉钉 Stream 事件和企业微信 Callback 事件统一保存到 event_logs。

```ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class EventLog extends Document {
  @Prop({ required: true, enum: ['dingtalk', 'wecom'], index: true })
  platformType: string;

  @Prop({ required: true, enum: ['dingtalk_stream', 'wecom_callback'], index: true })
  eventSource: string;

  @Prop()
  corpId?: string;

  @Prop({ index: true })
  eventType?: string;

  @Prop({ index: true })
  eventId?: string;

  @Prop({ index: true })
  platformUserId?: string;

  @Prop({ type: Object, required: true })
  rawPayload: Record<string, any>;

  @Prop({
    enum: ['pending', 'success', 'failed'],
    default: 'pending',
    index: true,
  })
  handleStatus: string;

  @Prop()
  errorMessage?: string;

  @Prop({ default: Date.now })
  receivedAt: Date;

  @Prop()
  handledAt?: Date;
}

export const EventLogSchema = SchemaFactory.createForClass(EventLog);

EventLogSchema.index({ platformType: 1, eventId: 1 });
EventLogSchema.index({ handleStatus: 1 });
EventLogSchema.index({ createdAt: -1 });
```

### 5.5 SyncTask Schema

```ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class SyncTask extends Document {
  @Prop({ required: true, enum: ['dingtalk', 'wecom'], index: true })
  platformType: string;

  @Prop({ required: true, enum: ['full', 'single', 'event', 'retry'], index: true })
  syncType: string;

  @Prop({
    enum: ['pending', 'running', 'success', 'failed', 'partial_success'],
    default: 'pending',
    index: true,
  })
  status: string;

  @Prop({ default: 0 })
  totalCount: number;

  @Prop({ default: 0 })
  successCount: number;

  @Prop({ default: 0 })
  failCount: number;

  @Prop()
  startTime?: Date;

  @Prop()
  endTime?: Date;

  @Prop()
  errorMessage?: string;

  @Prop()
  createdBy?: string;
}

export const SyncTaskSchema = SchemaFactory.createForClass(SyncTask);

SyncTaskSchema.index({ platformType: 1, syncType: 1, status: 1 });
SyncTaskSchema.index({ createdAt: -1 });
```

### 5.6 SyncErrorLog Schema

```ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class SyncErrorLog extends Document {
  @Prop({ type: Types.ObjectId, ref: 'SyncTask' })
  taskId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'EventLog' })
  eventLogId?: Types.ObjectId;

  @Prop({ required: true, enum: ['dingtalk', 'wecom'], index: true })
  platformType: string;

  @Prop({ index: true })
  platformUserId?: string;

  @Prop()
  errorType?: string;

  @Prop({ required: true })
  errorMessage: string;

  @Prop({ default: 0 })
  retryCount: number;

  @Prop()
  nextRetryAt?: Date;

  @Prop({
    enum: ['pending', 'success', 'failed', 'ignored'],
    default: 'pending',
    index: true,
  })
  status: string;
}

export const SyncErrorLogSchema = SchemaFactory.createForClass(SyncErrorLog);

SyncErrorLogSchema.index({ status: 1, nextRetryAt: 1 });
SyncErrorLogSchema.index({ createdAt: -1 });
```

## 6. 后端模块设计

### 6.1 PlatformModule

PlatformModule 用于封装钉钉和企业微信平台接口差异。

主要文件：

- dingtalk.client.ts
- wecom.client.ts
- platform.service.ts
- platform.types.ts

DingTalkClient 职责：

1. 获取 access_token。
2. 获取部门列表。
3. 获取员工列表。
4. 获取员工详情。
5. 检查员工是否存在。
6. 将钉钉员工数据转换为系统统一格式。

WeComClient 职责：

1. 获取 access_token。
2. 获取部门列表。
3. 获取员工列表。
4. 获取员工详情。
5. 检查员工是否存在。
6. 校验企业微信 Callback。
7. 解密企业微信事件。
8. 将企业微信员工数据转换为系统统一格式。

### 6.2 DingTalkStreamModule

DingTalkStreamModule 用于处理钉钉 Stream 模式事件。

系统不提供钉钉 HTTP Callback 接口。

DingTalkStreamService 职责：

1. 服务启动后建立钉钉 Stream 连接。
2. 监听钉钉通讯录事件。
3. 将原始事件保存到 event_logs。
4. 将事件交给 EventService 处理。
5. 消费失败时记录 sync_error_logs。
6. 保证事件处理幂等。

### 6.3 EventModule

EventModule 用于统一处理平台事件。

钉钉 Stream 事件和企业微信 Callback 事件都进入 EventService。

EventService 职责：

1. 保存事件日志。
2. 判断事件是否已经处理过。
3. 解析员工事件。
4. 根据事件类型调用 SyncService。
5. 更新 event_logs 处理状态。
6. 失败时写入 sync_error_logs。

企业微信 Callback 接口属于 EventController：

```text
GET  /api/events/wecom/callback
POST /api/events/wecom/callback
```

### 6.4 SyncModule

SyncModule 是员工同步核心模块。

职责：

1. 全量同步钉钉员工。
2. 全量同步企业微信员工。
3. 同步单个员工。
4. 处理事件触发的员工同步。
5. 执行 staff upsert。
6. 执行 staff_union 匹配和创建。
7. 执行离职比对。
8. 更新同步任务。
9. 记录同步错误。

### 6.5 StaffModule

StaffModule 负责平台员工数据管理。

职责：

1. 查询 staff 列表。
2. 查询 staff 详情。
3. 根据 platformType、corpId、platformUserId 查询 staff。
4. 创建或更新 staff。
5. 修改 staff 状态。
6. 查询某个 staff_union 下的全部 staff。

### 6.6 StaffUnionModule

StaffUnionModule 负责统一员工数据管理和合并逻辑。

职责：

1. 查询 staff_union 列表。
2. 查询 staff_union 详情。
3. 根据 staff 匹配 staff_union。
4. 创建 staff_union。
5. 将 staff 绑定到 staff_union。
6. 刷新 staff_union 状态。
7. 手动合并员工。
8. 手动拆分员工。
9. 处理合并冲突。

### 6.7 TaskModule

TaskModule 负责定时任务。

职责：

1. 定时执行钉钉全量同步。
2. 定时执行企业微信全量同步。
3. 定时重试失败同步。
4. 定时处理 inactive_pending 员工。

## 7. 统一数据格式

平台接口返回的数据格式不同，需要转换为系统统一 Staff DTO。

```ts
export interface PlatformStaffDTO {
  platformType: 'dingtalk' | 'wecom';
  corpId: string;
  platformUserId: string;
  platformUnionId?: string;
  name?: string;
  mobile?: string;
  email?: string;
  jobNumber?: string;
  avatar?: string;
  departmentIds?: string[];
  departmentNames?: string[];
  position?: string;
  status?: 'active' | 'inactive' | 'resigned' | 'deleted';
  joinTime?: Date;
  resignTime?: Date;
  rawData: Record<string, any>;
}
```

## 8. 核心同步逻辑

### 8.1 统一同步入口

无论是钉钉 Stream 事件、企业微信 Callback 事件，还是主动同步，最终都进入统一同步入口。

流程：

1. 获取平台员工数据。
2. 转换为 PlatformStaffDTO。
3. 根据 platformType、corpId、platformUserId 查询 staff。
4. 不存在则创建 staff。
5. 存在则更新 staff。
6. 如果 staff 已有 unionId，则刷新对应 staff_union。
7. 如果 staff 没有 unionId，则按手机号、工号、邮箱匹配 staff_union。
8. 匹配到则设置 staff.unionId。
9. 没匹配到则创建新的 staff_union，并设置 staff.unionId。
10. 刷新 staff_union 状态和主展示信息。

### 8.2 staff upsert 示例

```ts
async upsertStaff(dto: PlatformStaffDTO) {
  const updateData = {
    platformType: dto.platformType,
    corpId: dto.corpId,
    platformUserId: dto.platformUserId,
    platformUnionId: dto.platformUnionId,
    name: dto.name,
    mobile: dto.mobile,
    email: dto.email,
    jobNumber: dto.jobNumber,
    avatar: dto.avatar,
    departmentIds: dto.departmentIds || [],
    departmentNames: dto.departmentNames || [],
    position: dto.position,
    status: dto.status || 'active',
    isDeleted: dto.status === 'deleted',
    joinTime: dto.joinTime,
    resignTime: dto.resignTime,
    rawData: dto.rawData,
    lastSyncAt: new Date(),
  };

  return this.staffModel.findOneAndUpdate(
    {
      platformType: dto.platformType,
      corpId: dto.corpId,
      platformUserId: dto.platformUserId,
    },
    { $set: updateData },
    { new: true, upsert: true },
  );
}
```

### 8.3 staff_union 匹配逻辑

```ts
async findMatchedUnion(staff: Staff) {
  if (staff.mobile) {
    const union = await this.staffUnionModel.findOne({ mobile: staff.mobile });
    if (union) return { union, matchRule: 'mobile', matchKey: staff.mobile };
  }

  if (staff.jobNumber) {
    const union = await this.staffUnionModel.findOne({ jobNumber: staff.jobNumber });
    if (union) return { union, matchRule: 'jobNumber', matchKey: staff.jobNumber };
  }

  if (staff.email) {
    const union = await this.staffUnionModel.findOne({ email: staff.email });
    if (union) return { union, matchRule: 'email', matchKey: staff.email };
  }

  return null;
}
```

### 8.4 创建 staff_union

```ts
async createUnionFromStaff(staff: Staff, matchRule = 'self') {
  const union = await this.staffUnionModel.create({
    name: staff.name,
    mobile: staff.mobile,
    email: staff.email,
    jobNumber: staff.jobNumber,
    avatar: staff.avatar,
    status: staff.status === 'active' ? 'active' : 'resigned',
    matchKey: staff.mobile || staff.jobNumber || staff.email || '',
    matchRule,
    conflictStatus: 'none',
  });

  await this.staffModel.findByIdAndUpdate(staff._id, {
    unionId: union._id,
  });

  return union;
}
```

### 8.5 绑定 staff 到 staff_union

```ts
async bindStaffToUnion(staffId: string, unionId: string) {
  await this.staffModel.findByIdAndUpdate(staffId, {
    unionId,
  });

  await this.refreshUnion(unionId);
}
```

### 8.6 刷新 staff_union

staff_union 不保存 staffIds。

刷新时通过 staff.unionId 查询关联 staff。

```ts
async refreshUnion(unionId: string) {
  const staffs = await this.staffModel.find({ unionId });

  const activeStaffs = staffs.filter((item) => item.status === 'active');
  const selectedStaff = activeStaffs[0] || staffs[0];

  const status = activeStaffs.length > 0 ? 'active' : 'resigned';

  await this.staffUnionModel.findByIdAndUpdate(unionId, {
    name: selectedStaff?.name,
    mobile: selectedStaff?.mobile,
    email: selectedStaff?.email,
    jobNumber: selectedStaff?.jobNumber,
    avatar: selectedStaff?.avatar,
    status,
  });
}
```

## 9. 钉钉 Stream 事件开发

### 9.1 设计说明

钉钉使用 Stream 模式消费事件。

系统不开发钉钉 Callback HTTP 接口。

DingTalkStreamService 在服务启动后连接钉钉 Stream 服务，并监听通讯录相关事件。

### 9.2 处理流程

1. NestJS 服务启动。
2. DingTalkStreamService 建立连接。
3. 接收钉钉员工事件。
4. 保存 event_logs，eventSource = dingtalk_stream。
5. EventService 判断事件类型。
6. 如果是员工新增或修改，则调用钉钉接口获取员工详情。
7. 如果是员工离职或删除，则更新本地 staff 状态。
8. 执行 staff_union 刷新。
9. 更新 event_logs 状态。
10. 异常时记录 sync_error_logs。

### 9.3 示例代码结构

```ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventService } from '../event/event.service';

@Injectable()
export class DingTalkStreamService implements OnModuleInit {
  constructor(private readonly eventService: EventService) {}

  async onModuleInit() {
    await this.startStreamClient();
  }

  private async startStreamClient() {
    // 此处接入钉钉 Stream SDK
    // 监听通讯录事件后调用 handleDingTalkEvent
  }

  async handleDingTalkEvent(payload: any) {
    await this.eventService.handlePlatformEvent({
      platformType: 'dingtalk',
      eventSource: 'dingtalk_stream',
      rawPayload: payload,
    });
  }
}
```

## 10. 企业微信 Callback 开发

### 10.1 接口设计

企业微信需要 HTTP Callback 接口。

```text
GET  /api/events/wecom/callback
POST /api/events/wecom/callback
```

GET 用于企业微信配置 URL 时验证。

POST 用于接收通讯录变更事件。

### 10.2 Controller 示例

```ts
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { EventService } from './event.service';

@Controller('api/events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Get('wecom/callback')
  async verifyWeComCallback(@Query() query: any) {
    return this.eventService.verifyWeComCallback(query);
  }

  @Post('wecom/callback')
  async handleWeComCallback(@Query() query: any, @Body() body: any) {
    return this.eventService.handleWeComCallback(query, body);
  }
}
```

### 10.3 企业微信事件处理流程

1. 校验 msg_signature、timestamp、nonce。
2. 解密消息。
3. 保存 event_logs，eventSource = wecom_callback。
4. 根据事件类型处理员工新增、修改、离职、删除。
5. 新增或更新 staff。
6. 执行 staff_union 合并。
7. 刷新 staff_union 状态。
8. 更新事件处理结果。

## 11. 主动同步开发

### 11.1 全量同步接口

```text
POST /api/sync/dingtalk/full
POST /api/sync/wecom/full
```

Controller 示例：

```ts
import { Controller, Post } from '@nestjs/common';
import { SyncService } from './sync.service';

@Controller('api/sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('dingtalk/full')
  async syncDingTalkFull() {
    return this.syncService.syncFull('dingtalk');
  }

  @Post('wecom/full')
  async syncWeComFull() {
    return this.syncService.syncFull('wecom');
  }
}
```

### 11.2 全量同步流程

```ts
async syncFull(platformType: 'dingtalk' | 'wecom') {
  const task = await this.createSyncTask(platformType, 'full');

  const currentPlatformUserIds: string[] = [];

  try {
    const departments = await this.platformService.getDepartments(platformType);

    for (const dept of departments) {
      const users = await this.platformService.getUsersByDepartment(platformType, dept.id);

      for (const user of users) {
        try {
          const detail = await this.platformService.getUserDetail(
            platformType,
            user.platformUserId,
          );

          const staff = await this.syncPlatformStaff(detail);
          currentPlatformUserIds.push(staff.platformUserId);

          await this.increaseSuccessCount(task._id);
        } catch (error) {
          await this.recordSyncError(task._id, platformType, user.platformUserId, error);
        }
      }
    }

    await this.handleMissingStaffs(platformType, currentPlatformUserIds);
    await this.finishTask(task._id);
  } catch (error) {
    await this.failTask(task._id, error);
  }
}
```

### 11.3 单个员工同步接口

```text
POST /api/sync/staff/one
```

请求示例：

```json
{
  "platformType": "dingtalk",
  "corpId": "xxx",
  "platformUserId": "xxx",
  "mobile": "13800000000"
}
```

## 12. 离职员工处理

### 12.1 事件离职处理

```ts
async markStaffResigned(
  platformType: 'dingtalk' | 'wecom',
  corpId: string,
  platformUserId: string,
) {
  const staff = await this.staffModel.findOneAndUpdate(
    { platformType, corpId, platformUserId },
    {
      status: 'resigned',
      isDeleted: true,
      resignTime: new Date(),
      lastEventAt: new Date(),
    },
    { new: true },
  );

  if (staff?.unionId) {
    await this.staffUnionService.refreshUnion(staff.unionId.toString());
  }

  return staff;
}
```

### 12.2 全量同步离职比对

```ts
async handleMissingStaffs(
  platformType: 'dingtalk' | 'wecom',
  currentPlatformUserIds: string[],
) {
  const localActiveStaffs = await this.staffModel.find({
    platformType,
    status: 'active',
  });

  for (const staff of localActiveStaffs) {
    if (!currentPlatformUserIds.includes(staff.platformUserId)) {
      staff.status = 'inactive_pending';
      await staff.save();

      const exists = await this.platformService.checkStaffExists(
        platformType,
        staff.corpId,
        staff.platformUserId,
      );

      if (!exists) {
        staff.status = 'resigned';
        staff.isDeleted = true;
        staff.resignTime = new Date();
        await staff.save();
      } else {
        staff.status = 'active';
        await staff.save();
      }

      if (staff.unionId) {
        await this.staffUnionService.refreshUnion(staff.unionId.toString());
      }
    }
  }
}
```

## 13. 手动合并与拆分开发

### 13.1 手动合并

接口：

```text
POST /api/staff-unions/merge
```

请求：

```json
{
  "targetUnionId": "xxx",
  "staffIds": ["staffId1", "staffId2"]
}
```

处理逻辑：

1. 校验 targetUnionId 是否存在。
2. 校验 staffIds 是否存在。
3. 将 staffIds 对应 staff 的 unionId 更新为 targetUnionId。
4. 刷新 targetUnionId 对应的 staff_union。
5. 将相关冲突状态改为 resolved。

代码示例：

```ts
async mergeStaffs(targetUnionId: string, staffIds: string[]) {
  await this.staffModel.updateMany(
    { _id: { $in: staffIds } },
    { $set: { unionId: targetUnionId } },
  );

  await this.refreshUnion(targetUnionId);

  return { success: true };
}
```

### 13.2 手动拆分

接口：

```text
POST /api/staff-unions/unmerge
```

请求：

```json
{
  "staffId": "staffId1"
}
```

处理逻辑：

1. 查询 staff。
2. 记录原 unionId。
3. 根据该 staff 创建新的 staff_union。
4. 将该 staff.unionId 更新为新的 staff_union._id。
5. 刷新原 staff_union。
6. 刷新新的 staff_union。

代码示例：

```ts
async unmergeStaff(staffId: string) {
  const staff = await this.staffModel.findById(staffId);
  const oldUnionId = staff.unionId?.toString();

  const newUnion = await this.staffUnionModel.create({
    name: staff.name,
    mobile: staff.mobile,
    email: staff.email,
    jobNumber: staff.jobNumber,
    avatar: staff.avatar,
    status: staff.status === 'active' ? 'active' : 'resigned',
    matchRule: 'manual',
    matchKey: staff.mobile || staff.jobNumber || staff.email || '',
    conflictStatus: 'resolved',
  });

  await this.staffModel.findByIdAndUpdate(staffId, {
    unionId: newUnion._id,
  });

  if (oldUnionId) {
    await this.refreshUnion(oldUnionId);
  }

  await this.refreshUnion(newUnion._id.toString());

  return newUnion;
}
```

## 14. 定时任务开发

使用 @nestjs/schedule。

安装：

```bash
npm install @nestjs/schedule
```

AppModule 引入：

```ts
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
  ],
})
export class AppModule {}
```

任务示例：

```ts
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SyncService } from '../sync/sync.service';

@Injectable()
export class TaskService {
  constructor(private readonly syncService: SyncService) {}

  @Cron('0 2 * * *')
  async syncDingTalkEveryDay() {
    await this.syncService.syncFull('dingtalk');
  }

  @Cron('0 3 * * *')
  async syncWeComEveryDay() {
    await this.syncService.syncFull('wecom');
  }
}
```

## 15. 后端接口清单

### 15.1 企业微信事件接口

```text
GET  /api/events/wecom/callback
POST /api/events/wecom/callback
```

### 15.2 主动同步接口

```text
POST /api/sync/dingtalk/full
POST /api/sync/wecom/full
POST /api/sync/staff/one
POST /api/sync-errors/:id/retry
POST /api/event-logs/:id/retry
```

### 15.3 staff 接口

```text
GET /api/staffs
GET /api/staffs/:id
```

### 15.4 staff_union 接口

```text
GET /api/staff-unions
GET /api/staff-unions/:id
POST /api/staff-unions/merge
POST /api/staff-unions/unmerge
```

### 15.5 日志接口

```text
GET /api/sync-tasks
GET /api/sync-tasks/:id
GET /api/event-logs
GET /api/event-logs/:id
GET /api/sync-errors
GET /api/sync-errors/:id
```

## 16. 前端开发

### 16.1 Axios 封装

```ts
import axios from 'axios';
import { ElMessage } from 'element-plus';

const request = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    ElMessage.error(error.response?.data?.message || '请求失败');
    return Promise.reject(error);
  },
);

export default request;
```

### 16.2 staffUnion API

```ts
import request from './request';

export function getStaffUnionList(params: any) {
  return request.get('/staff-unions', { params });
}

export function getStaffUnionDetail(id: string) {
  return request.get(`/staff-unions/${id}`);
}

export function mergeStaffUnion(data: any) {
  return request.post('/staff-unions/merge', data);
}

export function unmergeStaffUnion(data: any) {
  return request.post('/staff-unions/unmerge', data);
}
```

### 16.3 sync API

```ts
import request from './request';

export function syncDingTalkFull() {
  return request.post('/sync/dingtalk/full');
}

export function syncWeComFull() {
  return request.post('/sync/wecom/full');
}

export function syncOneStaff(data: any) {
  return request.post('/sync/staff/one', data);
}

export function retrySyncError(id: string) {
  return request.post(`/sync-errors/${id}/retry`);
}
```

### 16.4 路由配置

```ts
import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    redirect: '/staff-unions',
  },
  {
    path: '/staff-unions',
    component: () => import('../views/staff-union/StaffUnionList.vue'),
  },
  {
    path: '/staff-unions/:id',
    component: () => import('../views/staff-union/StaffUnionDetail.vue'),
  },
  {
    path: '/staffs',
    component: () => import('../views/staff/StaffList.vue'),
  },
  {
    path: '/sync-tasks',
    component: () => import('../views/sync-task/SyncTaskList.vue'),
  },
  {
    path: '/event-logs',
    component: () => import('../views/event-log/EventLogList.vue'),
  },
  {
    path: '/sync-errors',
    component: () => import('../views/sync-error/SyncErrorList.vue'),
  },
];

export default createRouter({
  history: createWebHistory(),
  routes,
});
```

## 17. 环境变量

后端 .env 示例：

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/staff-sync

DINGTALK_CORP_ID=xxx
DINGTALK_APP_KEY=xxx
DINGTALK_APP_SECRET=xxx
DINGTALK_STREAM_CLIENT_ID=xxx
DINGTALK_STREAM_CLIENT_SECRET=xxx

WECOM_CORP_ID=xxx
WECOM_AGENT_ID=xxx
WECOM_SECRET=xxx
WECOM_CALLBACK_TOKEN=xxx
WECOM_ENCODING_AES_KEY=xxx
```

前端 .env 示例：

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

## 18. Docker Compose

```yaml
services:
  mongodb:
    image: mongo:7
    container_name: staff-sync-mongodb
    ports:
      - "27017:27017"
    volumes:
      - staff_sync_mongo_data:/data/db

volumes:
  staff_sync_mongo_data:
```

## 19. 开发步骤

### 第一阶段：基础环境

1. 创建 NestJS 项目。
2. 创建 Vue 3 项目。
3. 使用 Docker Compose 启动 MongoDB。
4. 后端连接 MongoDB。
5. 配置环境变量。
6. 配置统一异常处理。

### 第二阶段：数据库模型

1. 创建 Staff Schema。
2. 创建 StaffUnion Schema。
3. 创建 EventLog Schema。
4. 创建 SyncTask Schema。
5. 创建 SyncErrorLog Schema。
6. 添加索引。

### 第三阶段：基础员工接口

1. 开发 staff 查询接口。
2. 开发 staff_union 查询接口。
3. 开发 staff_union 详情接口。
4. 开发 staff 与 staff_union 关联查询。
5. 开发手动合并接口。
6. 开发手动拆分接口。

### 第四阶段：平台适配层

1. 开发 DingTalkClient。
2. 开发 WeComClient。
3. 封装 access_token。
4. 封装部门列表。
5. 封装员工列表。
6. 封装员工详情。
7. 封装员工是否存在检查。
8. 封装平台数据转换。

### 第五阶段：钉钉 Stream

1. 接入钉钉 Stream SDK。
2. 启动 Stream 连接。
3. 监听通讯录事件。
4. 保存 event_logs。
5. 调用 EventService 处理事件。
6. 处理失败重试和错误日志。

### 第六阶段：企业微信 Callback

1. 开发企业微信 Callback GET 验证。
2. 开发企业微信 Callback POST 接收。
3. 校验签名。
4. 解密消息。
5. 保存 event_logs。
6. 调用 EventService 处理事件。

### 第七阶段：主动同步

1. 开发钉钉全量同步。
2. 开发企业微信全量同步。
3. 开发单个员工同步。
4. 开发 staff upsert。
5. 开发 staff_union 匹配。
6. 开发离职比对。
7. 开发同步任务统计。

### 第八阶段：前端页面

1. 开发后台布局。
2. 开发统一员工列表。
3. 开发统一员工详情。
4. 开发平台员工列表。
5. 开发同步任务页面。
6. 开发事件日志页面。
7. 开发同步错误页面。
8. 开发手动同步按钮。
9. 开发合并和拆分操作。

## 20. 测试用例

### 20.1 钉钉 Stream 新增员工

预期：

1. 系统消费到钉钉 Stream 事件。
2. event_logs 新增记录。
3. staffs 新增 dingtalk 员工。
4. staff_unions 新增统一员工。
5. staff.unionId 指向 staff_union._id。

### 20.2 企业微信 Callback 新增员工

预期：

1. 系统接收到企业微信 Callback。
2. event_logs 新增记录。
3. staffs 新增 wecom 员工。
4. staff_unions 新增统一员工。

### 20.3 双平台合并

条件：

1. 钉钉员工手机号为 13800000000。
2. 企业微信员工手机号为 13800000000。

预期：

1. staffs 中有两条员工记录。
2. 两条 staff 的 unionId 相同。
3. staff_union 中只有一条统一员工记录。
4. staff_union 中不保存 staffIds。

### 20.4 单平台离职

条件：

1. 员工在钉钉离职。
2. 员工在企业微信仍在职。

预期：

1. 钉钉 staff.status = resigned。
2. 企业微信 staff.status = active。
3. staff_union.status = active。

### 20.5 全平台离职

条件：

1. 员工在钉钉离职。
2. 员工在企业微信离职。

预期：

1. 两条 staff 都不是 active。
2. staff_union.status = resigned。

### 20.6 离职事件丢失

条件：

1. 未消费到离职事件。
2. 定时全量同步执行。
3. 平台员工列表中不存在该员工。

预期：

1. staff 先被标记为 inactive_pending。
2. 二次确认后改为 resigned 或 deleted。
3. staff_union 状态被刷新。

### 20.7 重名员工

条件：

1. 两个员工姓名相同。
2. 手机号、工号、邮箱不同。

预期：

1. 系统不自动合并。
2. 分别创建 staff_union 或标记为待确认。

### 20.8 重复事件

条件：

同一个事件重复消费。

预期：

1. 不重复创建 staff。
2. 不重复创建 staff_union。
3. event_logs 可以记录重复事件或保持幂等处理。

## 21. 关键注意事项

1. staff_union 不存 staffIds。
2. staff_union 不存 mainStaffId。
3. staff 与 staff_union 的关系只由 staff.unionId 维护。
4. 钉钉使用 Stream 模式，不开发钉钉 Callback HTTP 接口。
5. 企业微信使用 Callback 接口，需要开发 GET 验证和 POST 接收。
6. 离职员工不物理删除，只修改状态。
7. 只有姓名相同不能自动合并。
8. 全量同步必须支持离职比对。
9. 同步失败不能中断整个任务。
10. 平台原始数据需要保存到 rawData。
11. 原始事件需要保存到 event_logs。
12. 平台密钥必须使用环境变量管理。
