<template>
  <el-tag :type="color" :size="size" :effect="effect">
    {{ label }}
  </el-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { staffStatusLabels, staffStatusColors, type StaffStatus } from '../types/staff';
import { syncTaskStatusLabels, syncTaskStatusColors } from '../types/sync';

const props = withDefaults(
  defineProps<{
    status: string;
    category?: 'staff' | 'syncTask' | 'custom';
    labelMap?: Record<string, string>;
    colorMap?: Record<string, string>;
    size?: '' | 'small' | 'default';
    effect?: '' | 'dark' | 'light' | 'plain';
  }>(),
  {
    category: 'staff',
    size: 'small',
    effect: undefined,
  },
);

const label = computed(() => {
  if (props.category === 'staff') {
    return staffStatusLabels[props.status as StaffStatus] || props.status;
  }
  if (props.category === 'syncTask') {
    return syncTaskStatusLabels[props.status] || props.status;
  }
  if (props.labelMap) {
    return props.labelMap[props.status] || props.status;
  }
  return props.status;
});

const color = computed(() => {
  if (props.category === 'staff') {
    return staffStatusColors[props.status as StaffStatus] || 'info';
  }
  if (props.category === 'syncTask') {
    return syncTaskStatusColors[props.status] || 'info';
  }
  if (props.colorMap) {
    return props.colorMap[props.status] || 'info';
  }
  return 'info';
});
</script>
