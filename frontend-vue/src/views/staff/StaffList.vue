<template>
  <div>
    <h2>平台员工列表</h2>

    <el-form :inline="true" :model="search" style="margin: 16px 0">
      <el-form-item label="平台">
        <el-select v-model="search.platformType" placeholder="全部" clearable style="width: 120px">
          <el-option label="钉钉" value="dingtalk" />
          <el-option label="企业微信" value="wecom" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="search.status" placeholder="全部" clearable style="width: 120px">
          <el-option label="在职" value="active" />
          <el-option label="离职" value="resigned" />
          <el-option label="停用" value="inactive" />
          <el-option label="待确认" value="inactive_pending" />
        </el-select>
      </el-form-item>
      <el-form-item label="姓名">
        <el-input v-model="search.name" placeholder="输入姓名" clearable />
      </el-form-item>
      <el-form-item label="手机号">
        <el-input v-model="search.mobile" placeholder="输入手机号" clearable />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="fetchData">查询</el-button>
        <el-button @click="resetSearch">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="list" border stripe v-loading="loading">
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
      <el-table-column prop="jobNumber" label="工号" width="100" />
      <el-table-column label="部门" min-width="140">
        <template #default="{ row }">{{ row.departmentNames?.join(', ') || '-' }}</template>
      </el-table-column>
      <el-table-column prop="position" label="职位" width="100" />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <StatusTag :status="row.status" />
        </template>
      </el-table-column>
      <el-table-column label="是否删除" width="80">
        <template #default="{ row }">{{ row.isDeleted ? '是' : '否' }}</template>
      </el-table-column>
      <el-table-column label="更新时间" width="170">
        <template #default="{ row }">{{ row.updatedAt ? new Date(row.updatedAt).toLocaleString() : '-' }}</template>
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
import { getStaffList, type StaffItem } from '../../api/staff';
import StatusTag from '../../components/StatusTag.vue';

const { list, total, loading, page, pageSize, search, fetchData, resetSearch } =
  useListPage<StaffItem>(getStaffList, { platformType: '', status: '', name: '', mobile: '' });
</script>
