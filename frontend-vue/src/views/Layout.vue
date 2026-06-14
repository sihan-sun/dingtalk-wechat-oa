<template>
  <el-container style="height: 100vh">
    <el-aside width="200px" style="background-color: #304156">
      <div style="padding: 20px; color: #fff; font-size: 16px; font-weight: bold; text-align: center">
        员工同步管理
      </div>
      <el-menu
        :default-active="currentRoute"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409eff"
        router
      >
        <el-menu-item index="/staff-unions">
          <span>统一员工</span>
        </el-menu-item>
        <el-menu-item index="/staffs">
          <span>平台员工</span>
        </el-menu-item>
        <el-menu-item index="/event-logs">
          <span>事件日志</span>
        </el-menu-item>
        <el-menu-item index="/sync-errors">
          <span>同步错误</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const currentRoute = computed(() => route.path);
</script>
