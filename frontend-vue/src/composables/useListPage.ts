import { ref, onMounted } from 'vue';

/**
 * 通用列表页 Composable
 *
 * 封装分页、加载状态、搜索、重置等通用逻辑，
 * 减少所有列表组件的重复代码。
 *
 * @param fetchFn - 数据获取函数，接收 params 返回 { items, total }
 * @param defaultSearch - 默认搜索条件
 */
export function useListPage<T>(
  fetchFn: (params: Record<string, any>) => Promise<{ items: T[]; total: number }>,
  defaultSearch: Record<string, any> = {},
) {
  const list = ref<T[]>([]);
  const total = ref(0);
  const loading = ref(false);
  const page = ref(1);
  const pageSize = ref(20);
  const search = ref<Record<string, any>>({ ...defaultSearch });

  async function fetchData() {
    loading.value = true;
    try {
      const params: Record<string, any> = {
        page: page.value,
        pageSize: pageSize.value,
      };
      // 将非空搜索条件合并到 params
      for (const [key, value] of Object.entries(search.value)) {
        if (value !== '' && value != null) {
          params[key] = value;
        }
      }
      const res = await fetchFn(params);
      list.value = res.items;
      total.value = res.total;
    } finally {
      loading.value = false;
    }
  }

  function resetSearch() {
    search.value = { ...defaultSearch };
    page.value = 1;
    fetchData();
  }

  onMounted(fetchData);

  return {
    list,
    total,
    loading,
    page,
    pageSize,
    search,
    fetchData,
    resetSearch,
  };
}
