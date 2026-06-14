import { createRouter, createWebHistory } from 'vue-router';
import Layout from '../views/Layout.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: Layout,
      redirect: '/staff-unions',
      children: [
        {
          path: 'staff-unions',
          name: 'StaffUnionList',
          component: () => import('../views/StaffUnionList.vue'),
        },
        {
          path: 'staff-unions/:id',
          name: 'StaffUnionDetail',
          component: () => import('../views/StaffUnionDetail.vue'),
        },
        {
          path: 'staffs',
          name: 'StaffList',
          component: () => import('../views/StaffList.vue'),
        },
        {
          path: 'event-logs',
          name: 'EventLogList',
          component: () => import('../views/EventLogList.vue'),
        },
        {
          path: 'sync-errors',
          name: 'SyncErrorList',
          component: () => import('../views/SyncErrorList.vue'),
        },
      ],
    },
  ],
});

export default router;
