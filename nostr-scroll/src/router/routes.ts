import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../layouts/AuthLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('../pages/LoginPage.vue'),
      },
    ],
  },
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'root',
        component: () => import('../pages/HomePage.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'home',
        name: 'home',
        component: () => import('../pages/HomePage.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'bookmarks',
        name: 'bookmarks',
        component: () => import('../pages/BookmarksPage.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'profile/:pubkey?',
        name: 'profile',
        component: () => import('../pages/ProfilePage.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'post/:id',
        name: 'post-detail',
        component: () => import('../pages/PostDetailPage.vue'),
        meta: { requiresAuth: true },
      },
    ],
  },
  {
    path: '/:catchAll(.*)*',
    redirect: '/',
  },
];

export default routes;
