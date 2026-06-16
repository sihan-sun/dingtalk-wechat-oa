<template>
  <div>
    <h2>事件日志</h2>

    <el-form :inline="true" :model="search" style="margin: 16px 0">
      <el-form-item label="平台">
        <el-select v-model="search.platformType" placeholder="全部" clearable style="width: 120px">
          <el-option label="钉钉" value="dingtalk" />
          <el-option label="企业微信" value="wecom" />
        </el-select>
      </el-form-item>
      <el-form-item label="事件来源">
        <el-select v-model="search.eventSource" placeholder="全部" clearable style="width: 150px">
          <el-option label="钉钉 Stream" value="dingtalk_stream" />
          <el-option label="企微 Callback" value="wecom_callback" />
        </el-select>
      </el-form-item>
      <el-form-item label="处理状态">
        <el-select v-model="search.handleStatus" placeholder="全部" clearable style="width: 120px">
          <el-option label="待处理" value="pending" />
          <el-option label="成功" value="success" />
          <el-option label="失败" value="failed" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="fetchData">查询</el-button>
        <el-button @click="resetSearch">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="list" border stripe v-loading="loading" size="small">
      <el-table-column label="平台" width="80">
        <template #default="{ row }">
          <el-tag :type="row.platformType === 'dingtalk' ? 'primary' : 'success'" size="small">
            {{ row.platformType === 'dingtalk' ? '钉钉' : '企微' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="eventSource" label="来源" width="120">
        <template #default="{ row }">
          {{ row.eventSource === 'dingtalk_stream' ? '钉钉 Stream' : '企微 Callback' }}
        </template>
      </el-table-column>
      <el-table-column prop="eventType" label="事件类型" width="150" />
      <el-table-column prop="platformUserId" label="平台用户ID" width="160" />
      <el-table-column label="处理状态" width="90">
        <template #default="{ row }">
          <StatusTag
            :status="row.handleStatus"
            category="custom"
            :label-map="{ pending: '待处理', success: '成功', failed: '失败' }"
            :color-map="{ pending: 'warning', success: 'success', failed: 'danger' }"
          />
        </template>
      </el-table-column>
      <el-table-column prop="errorMessage" label="错误信息" min-width="200">
        <template #default="{ row }">{{ row.errorMessage || '-' }}</template>
      </el-table-column>
      <el-table-column label="接收时间" width="170">
        <template #default="{ row }">{{ row.receivedAt ? new Date(row.receivedAt).toLocaleString() : '-' }}</template>
      </el-table-column>
      <el-table-column label="处理时间" width="170">
        <template #default="{ row }">{{ row.handledAt ? new Date(row.handledAt).toLocaleString() : '-' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-button size="small" type="primary" link @click="showPayload(row)">原始事件</el-button>
        </template>
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

    <el-dialog v-model="payloadVisible" title="原始事件数据" width="700px">
      <pre style="max-height: 400px; overflow: auto; background: #f5f5f5; padding: 12px; border-radius: 4px; font-size: 12px">{{ JSON.stringify(payloadData, null, 2) }}</pre>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useListPage } from '../../composables/useListPage';
import { getEventLogList, type EventLogItem } from '../../api/eventLog';
import StatusTag from '../../components/StatusTag.vue';

const { list, total, loading, page, pageSize, search, fetchData, resetSearch } =
  useListPage<EventLogItem>(getEventLogList, { platformType: '', eventSource: '', handleStatus: '' });

const payloadVisible = ref(false);
const payloadData = ref<any>(null);

function showPayload(row: EventLogItem) {
  payloadData.value = row.rawPayload;
  payloadVisible.value = true;
}
</script>
