import * as vueRouter from 'vue-router';

const routes = [
  {
    path: '/',
    name: 'Chat',
    component: () => import('../views/Chat.vue'),
  },
  {
    path: '/permission-denied',
    name: 'PermissionDenied',
    component: () => import('../views/Error403.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'Notfound',
    component: () => import('../views/Error404.vue'),
  },
];

const router = vueRouter.createRouter({
  history: vueRouter.createWebHistory(),
  routes,
});

export default router;
