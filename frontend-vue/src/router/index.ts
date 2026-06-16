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
          component: () => import('../views/staff-union/StaffUnionList.vue'),
        },
        {
          path: 'staff-unions/:id',
          name: 'StaffUnionDetail',
          component: () => import('../views/staff-union/StaffUnionDetail.vue'),
        },
        {
          path: 'staffs',
          name: 'StaffList',
          component: () => import('../views/staff/StaffList.vue'),
        },
        {
          path: 'sync-tasks',
          name: 'SyncTaskList',
          component: () => import('../views/sync-task/SyncTaskList.vue'),
        },
        {
          path: 'event-logs',
          name: 'EventLogList',
          component: () => import('../views/event-log/EventLogList.vue'),
        },
        {
          path: 'sync-errors',
          name: 'SyncErrorList',
          component: () => import('../views/sync-error/SyncErrorList.vue'),
        },
      ],
    },
  ],
});

export default router;
