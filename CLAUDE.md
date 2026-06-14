# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Staff information synchronization system that bridges DingTalk (钉钉) and WeCom (企业微信) with a local OA system. Syncs employee data bidirectionally, merges duplicate staff records across platforms, and provides a Vue 3 admin panel.

- **Backend**: NestJS + TypeScript + Mongoose + MongoDB
- **Frontend**: Vue 3 + TypeScript + Vite + Element Plus + Pinia + Vue Router
- **Infrastructure**: Docker Compose (MongoDB only initially)

The full requirements and development plan are in:
- `staff_sync_requirement_doc.md` — complete functional requirements, data model, API spec
- `staff_sync_development_doc.md` — technical architecture, schemas, module design, code examples

## Directory Structure (planned)

```
backend-nest/
  src/
    main.ts, app.module.ts
    config/          — database.config.ts, platform.config.ts
    common/          — enums, DTOs, utils, filters, interceptors
    schemas/         — Mongoose schemas (staff, staff-union, event-log, sync-task, sync-error-log)
    modules/
      platform/      — DingTalkClient + WeComClient adapter layer
      dingtalk-stream/ — DingTalk Stream mode event consumer
      event/         — Unified event handling (controller + service)
      sync/          — Core sync orchestration (full, single, event-driven)
      staff/         — Platform staff CRUD
      staff-union/   — Merged staff management + manual merge/split
      task/          — Scheduled tasks (@nestjs/schedule Cron)
frontend-vue/
  src/
    main.ts, App.vue
    router/, store/
    api/             — Axios wrappers: staff.ts, staffUnion.ts, syncTask.ts, eventLog.ts, syncError.ts
    views/           — pages: StaffUnionList/Detail, StaffList, SyncTaskList, EventLogList, SyncErrorList
    components/      — SearchForm, StatusTag, JsonViewer
    types/           — staff.ts, sync.ts
```

## Key Architecture Decisions

1. **Unidirectional reference**: `staff.unionId → staff_union._id`. `staff_union` does NOT store `staffIds` or `mainStaffId`. All queries from union → staffs go through `staffModel.find({ unionId })`.

2. **Union status derived, not stored**: `staff_union.status` is computed from its linked staffs — active if ANY linked staff is active, resigned only when ALL are resigned.

3. **DingTalk uses Stream mode only** (no HTTP callback). WeCom uses HTTP callback (GET for URL verification, POST for events).

4. **Unified sync entry point**: Events from either platform AND proactive syncs all flow through the same `syncPlatformStaff()` → upsert → match/bind union pipeline.

5. **Auto-merge priority**: mobile → jobNumber → email. Name-only match never auto-merges. Conflicts (same mobile but different name) go to `conflictStatus: pending` for manual resolution.

6. **Resigned employees are never physically deleted** — only status changes (active → inactive_pending → resigned/deleted after confirmation).

7. **Compensation sync**: Daily cron (02:00 DingTalk, 03:00 WeCom) runs full sync to catch missed events. Missing employees go through a two-phase check: mark as `inactive_pending`, then verify against the platform API before finalizing as `resigned`.

## Data Model (MongoDB Collections)

- **staffs** — Per-platform employee records. Unique index on `{platformType, corpId, platformUserId}`. Stores `rawData` and `unionId` reference.
- **staff_unions** — Merged/consolidated employee records. No back-references to staffs.
- **event_logs** — All incoming platform events (both DingTalk Stream and WeCom callback). Includes `rawPayload` and `handleStatus`.
- **sync_tasks** — Full/single/retry sync job tracking with counts and status.
- **sync_error_logs** — Per-error records linked to tasks or events, with retry tracking.

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/api/events/wecom/callback` | WeCom URL verification + event reception |
| POST | `/api/sync/dingtalk/full` | Trigger DingTalk full sync |
| POST | `/api/sync/wecom/full` | Trigger WeCom full sync |
| POST | `/api/sync/staff/one` | Sync single employee |
| POST | `/api/sync-errors/:id/retry` | Retry failed sync |
| POST | `/api/event-logs/:id/retry` | Retry failed event |
| GET | `/api/staffs`, `/api/staffs/:id` | Staff CRUD |
| GET | `/api/staff-unions`, `/api/staff-unions/:id` | Union CRUD |
| POST | `/api/staff-unions/merge` | Manual merge (body: `{targetUnionId, staffIds}`) |
| POST | `/api/staff-unions/unmerge` | Manual split (body: `{staffId}`) |
| GET | `/api/sync-tasks`, `/api/sync-tasks/:id` | Task logs |
| GET | `/api/event-logs`, `/api/event-logs/:id` | Event logs |
| GET | `/api/sync-errors`, `/api/sync-errors/:id` | Error logs |

## Key Enums

- **PlatformType**: `dingtalk`, `wecom`
- **StaffStatus**: `active`, `inactive`, `inactive_pending`, `resigned`, `deleted`
- **UnionStatus**: `active`, `inactive`, `resigned`
- **ConflictStatus**: `none`, `pending`, `resolved`
- **EventSource**: `dingtalk_stream`, `wecom_callback`
- **SyncType**: `full`, `single`, `event`, `retry`

## Development Roadmap (8 phases)

1. Project scaffolding (NestJS + Vue 3 + Docker Compose + MongoDB)
2. Mongoose schemas with indexes
3. Basic staff/staff-union CRUD + manual merge/split APIs
4. Platform adapter layer (DingTalkClient, WeComClient — access_token, departments, users)
5. DingTalk Stream consumer (connect on startup, listen to contacts events)
6. WeCom callback (GET verify + POST decrypt + event handling)
7. Proactive sync (full, single, missing-staff detection + two-phase resign)
8. Vue 3 admin pages (staff union list/detail, staff list, sync tasks, event logs, error logs)

## Commands

Since no code exists yet, the following are the expected commands once projects are scaffolded:

```bash
# Backend (backend-nest/)
npm run start:dev     # NestJS dev server (hot reload)
npm run build         # Build TypeScript
npm run test          # Run tests
npm run test:e2e      # Run e2e tests

# Frontend (frontend-vue/)
npm run dev           # Vite dev server
npm run build         # Production build

# Infrastructure
docker compose up -d  # Start MongoDB
```

## Environment Variables (backend/.env)

```
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

Platform credentials must never be hardcoded — always use environment variables or a config center.
