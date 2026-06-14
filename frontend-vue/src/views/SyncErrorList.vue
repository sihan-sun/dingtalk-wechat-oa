<template>
  <div>
    <h2>同步错误日志</h2>

    <el-form :inline="true" :model="search" style="margin: 16px 0">
      <el-form-item label="平台">
        <el-select v-model="search.platformType" placeholder="全部" clearable style="width: 120px">
          <el-option label="钉钉" value="dingtalk" />
          <el-option label="企业微信" value="wecom" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="search.status" placeholder="全部" clearable style="width: 120px">
          <el-option label="待处理" value="pending" />
          <el-option label="成功" value="success" />
          <el-option label="失败" value="failed" />
          <el-option label="忽略" value="ignored" />
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
      <el-table-column prop="platformUserId" label="平台用户ID" width="160" />
      <el-table-column prop="errorType" label="错误类型" width="140" />
      <el-table-column prop="errorMessage" label="错误信息" min-width="250" />
      <el-table-column prop="retryCount" label="重试次数" width="90" />
      <el-table-column label="下次重试" width="170">
        <template #default="{ row }">{{ row.nextRetryAt ? new Date(row.nextRetryAt).toLocaleString() : '-' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag
            :type="row.status === 'success' ? 'success' : row.status === 'failed' ? 'danger' : row.status === 'ignored' ? 'info' : 'warning'"
            size="small"
          >
            {{ { pending: '待处理', success: '成功', failed: '失败', ignored: '忽略' }[row.status] || row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="170">
        <template #default="{ row }">{{ row.createdAt ? new Date(row.createdAt).toLocaleString() : '-' }}</template>
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
import { ref, onMounted } from 'vue';
import { getSyncErrorList, type SyncErrorItem } from '../api/sync-errors';

const list = ref<SyncErrorItem[]>([]);
const total = ref(0);
const loading = ref(false);
const page = ref(1);
const pageSize = ref(20);
const search = ref({ platformType: '', status: '' });

async function fetchData() {
  loading.value = true;
  try {
    const params: Record<string, any> = { page: page.value, pageSize: pageSize.value };
    if (search.value.platformType) params.platformType = search.value.platformType;
    if (search.value.status) params.status = search.value.status;
    const res = await getSyncErrorList(params);
    list.value = res.items;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

function resetSearch() {
  search.value = { platformType: '', status: '' };
  page.value = 1;
  fetchData();
}

onMounted(fetchData);
</script>
