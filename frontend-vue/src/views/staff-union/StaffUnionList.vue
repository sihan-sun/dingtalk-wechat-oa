<template>
  <div>
    <h2>统一员工列表</h2>

    <el-form :inline="true" :model="search" style="margin: 16px 0">
      <el-form-item label="姓名">
        <el-input v-model="search.name" placeholder="输入姓名" clearable />
      </el-form-item>
      <el-form-item label="手机号">
        <el-input v-model="search.mobile" placeholder="输入手机号" clearable />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="search.status" placeholder="全部" clearable style="width: 120px">
          <el-option label="在职" value="active" />
          <el-option label="离职" value="resigned" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="fetchData">查询</el-button>
        <el-button @click="resetSearch">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="list" border stripe v-loading="loading" @row-click="goDetail" style="cursor: pointer">
      <el-table-column prop="name" label="姓名" width="120" />
      <el-table-column prop="mobile" label="手机号" width="140" />
      <el-table-column prop="email" label="邮箱" min-width="180" />
      <el-table-column prop="jobNumber" label="工号" width="100" />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <StatusTag :status="row.status" />
        </template>
      </el-table-column>
      <el-table-column label="平台" width="160">
        <template #default="{ row }">
          <el-tag
            v-for="p in row.platforms"
            :key="p"
            :type="p === 'dingtalk' ? 'primary' : 'success'"
            size="small"
            style="margin-right: 4px"
          >
            {{ p === 'dingtalk' ? '钉钉' : '企微' }}
          </el-tag>
          <span style="color: #999; font-size: 12px; margin-left: 4px">×{{ row.platformCount }}</span>
        </template>
      </el-table-column>
      <el-table-column label="更新时间" width="170">
        <template #default="{ row }">
          {{ row.updatedAt ? new Date(row.updatedAt).toLocaleString() : '-' }}
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
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useListPage } from '../../composables/useListPage';
import { getStaffUnionList, type StaffUnionItem } from '../../api/staffUnion';
import StatusTag from '../../components/StatusTag.vue';

const router = useRouter();
const { list, total, loading, page, pageSize, search, fetchData, resetSearch } =
  useListPage<StaffUnionItem>(getStaffUnionList, { name: '', mobile: '', status: '' });

function goDetail(row: StaffUnionItem) {
  router.push(`/staff-unions/${row._id}`);
}
</script>
