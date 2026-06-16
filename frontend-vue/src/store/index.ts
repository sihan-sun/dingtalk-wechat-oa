import { defineStore } from 'pinia';

export const useAppStore = defineStore('app', {
  state: () => ({
    /** 当前侧边栏菜单激活项 */
    activeMenu: '/staff-unions',
  }),
  actions: {
    setActiveMenu(path: string) {
      this.activeMenu = path;
    },
  },
});
