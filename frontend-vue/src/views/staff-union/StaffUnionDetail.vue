<template>
  <div>
    <el-button @click="$router.back()" style="margin-bottom: 16px">← 返回</el-button>

    <el-card v-loading="loading">
      <template #header><h3>统一员工详情</h3></template>
      <el-descriptions v-if="detail" :column="2" border>
        <el-descriptions-item label="姓名">{{ detail.name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ detail.mobile || '-' }}</el-descriptions-item>
        <el-descriptions-item label="邮箱">{{ detail.email || '-' }}</el-descriptions-item>
        <el-descriptions-item label="工号">{{ detail.jobNumber || '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <StatusTag :status="detail.status" />
        </el-descriptions-item>
        <el-descriptions-item label="合并规则">{{ detail.matchRule || '-' }}</el-descriptions-item>
        <el-descriptions-item label="合并依据">{{ detail.matchKey || '-' }}</el-descriptions-item>
        <el-descriptions-item label="冲突状态">
          <el-tag :type="detail.conflictStatus === 'none' ? 'info' : 'warning'" size="small">
            {{ detail.conflictStatus === 'pending' ? '待处理' : detail.conflictStatus === 'resolved' ? '已处理' : '无' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatTime(detail.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ formatTime(detail.updatedAt) }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card style="margin-top: 16px">
      <template #header><h3>关联平台员工 ({{ detail?.staffs?.length || 0 }})</h3></template>
      <el-table :data="detail?.staffs || []" border stripe size="small">
        <el-table-column label="平台" width="80">
          <template #default="{ row }">
            <el-tag :type="row.platformType === 'dingtalk' ? 'primary' : 'success'" size="small">
              {{ row.platformType === 'dingtalk' ? '钉钉' : '企微' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="platformUserId" label="平台用户ID" width="180" />
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="mobile" label="手机号" width="130" />
        <el-table-column prop="email" label="邮箱" min-width="160" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <StatusTag :status="row.status" />
          </template>
        </el-table-column>
        <el-table-column prop="position" label="职位" width="100" />
        <el-table-column label="最后事件" width="170">
          <template #default="{ row }">{{ formatTime(row.lastEventAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="showRaw(row)">原始数据</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="rawVisible" title="平台原始数据" width="700px">
      <pre style="max-height: 400px; overflow: auto; background: #f5f5f5; padding: 12px; border-radius: 4px; font-size: 12px">{{ JSON.stringify(rawData, null, 2) }}</pre>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { getStaffUnionDetail, type StaffUnionDetail } from '../../api/staffUnion';
import StatusTag from '../../components/StatusTag.vue';

const route = useRoute();
const detail = ref<StaffUnionDetail | null>(null);
const loading = ref(false);
const rawVisible = ref(false);
const rawData = ref<any>(null);

async function fetchDetail() {
  loading.value = true;
  try {
    detail.value = await getStaffUnionDetail(route.params.id as string);
  } finally {
    loading.value = false;
  }
}

function showRaw(row: any) {
  rawData.value = row.rawData;
  rawVisible.value = true;
}

function formatTime(t?: string) {
  return t ? new Date(t).toLocaleString() : '-';
}

onMounted(fetchDetail);
</script>
