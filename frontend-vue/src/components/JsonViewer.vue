<template>
  <el-dialog v-model="visible" title="JSON 数据" width="700px" @update:model-value="$emit('update:visible', $event)">
    <pre style="max-height: 400px; overflow: auto; background: #f5f5f5; padding: 12px; border-radius: 4px; font-size: 12px">{{ formattedJson }}</pre>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  visible: boolean;
  data: any;
}>();

defineEmits<{
  'update:visible': [value: boolean];
}>();

const formattedJson = computed(() => {
  try {
    return JSON.stringify(props.data, null, 2);
  } catch {
    return String(props.data);
  }
});
</script>
