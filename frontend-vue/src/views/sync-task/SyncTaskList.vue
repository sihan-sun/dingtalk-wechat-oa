<template>
  <div>
    <h2>同步任务</h2>

    <el-form :inline="true" :model="search" style="margin: 16px 0">
      <el-form-item label="类型">
        <el-select v-model="search.syncType" placeholder="全部" clearable style="width: 130px">
          <el-option label="全量同步" value="full" />
          <el-option label="单员工同步" value="single" />
          <el-option label="事件同步" value="event" />
          <el-option label="重试" value="retry" />
        </el-select>
      </el-form-item>
      <el-form-item label="平台">
        <el-select v-model="search.platformType" placeholder="全部" clearable style="width: 120px">
          <el-option label="钉钉" value="dingtalk" />
          <el-option label="企业微信" value="wecom" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="search.status" placeholder="全部" clearable style="width: 120px">
          <el-option label="待执行" value="pending" />
          <el-option label="执行中" value="running" />
          <el-option label="成功" value="success" />
          <el-option label="部分成功" value="partial" />
          <el-option label="失败" value="failed" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="fetchData">查询</el-button>
        <el-button @click="resetSearch">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="list" border stripe v-loading="loading" size="small">
      <el-table-column label="类型" width="110">
        <template #default="{ row }">
          {{ row.syncType === 'full' ? '全量同步' : row.syncType === 'single' ? '单员工' : row.syncType === 'event' ? '事件' : row.syncType === 'retry' ? '重试' : row.syncType }}
        </template>
      </el-table-column>
      <el-table-column label="平台" width="80">
        <template #default="{ row }">
          <el-tag v-if="row.platformType" :type="row.platformType === 'dingtalk' ? 'primary' : 'success'" size="small">
            {{ row.platformType === 'dingtalk' ? '钉钉' : '企微' }}
          </el-tag>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <StatusTag :status="row.status" category="syncTask" />
        </template>
      </el-table-column>
      <el-table-column prop="totalCount" label="总数" width="60" />
      <el-table-column prop="successCount" label="成功" width="60" />
      <el-table-column prop="failCount" label="失败" width="60" />
      <el-table-column prop="errorMessage" label="错误信息" min-width="200">
        <template #default="{ row }">{{ row.errorSummary || '-' }}</template>
      </el-table-column>
      <el-table-column label="开始时间" width="170">
        <template #default="{ row }">{{ row.startTime ? new Date(row.startTime).toLocaleString() : '-' }}</template>
      </el-table-column>
      <el-table-column label="完成时间" width="170">
        <template #default="{ row }">{{ row.endTime ? new Date(row.endTime).toLocaleString() : '-' }}</template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      v-model:page-size="pageSize"
      :total="total"
      :page-sizes="[10, 20, 50]"
      layout="total, sizes, prev, pager, next"
      style="margin-top: 16px; justify-content: flex-end"
      @size-change="fetchData"
      @current-change="fetchData"
    />
  </div>
</template>

<script setup lang="ts">
import { useListPage } from '../../composables/useListPage';
import { getSyncTaskList } from '../../api/syncTask';
import type { SyncTaskItem } from '../../api/syncTask';
import StatusTag from '../../components/StatusTag.vue';

const { list, total, loading, page, pageSize, search, fetchData, resetSearch } =
  useListPage<SyncTaskItem>(getSyncTaskList, { syncType: '', platformType: '', status: '' });
</script>
