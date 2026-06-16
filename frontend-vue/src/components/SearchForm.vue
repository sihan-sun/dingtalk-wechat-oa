<template>
  <el-form :inline="true" :model="model" style="margin: 16px 0">
    <slot />
    <el-form-item>
      <el-button type="primary" @click="$emit('search')">查询</el-button>
      <el-button @click="$emit('reset')">重置</el-button>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
defineProps<{
  model: Record<string, any>;
}>();

defineEmits<{
  search: [];
  reset: [];
}>();
</script>
