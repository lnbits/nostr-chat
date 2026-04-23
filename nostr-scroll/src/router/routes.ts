import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    component: () => import('../layouts/AuthLayout.vue'),
    children: [
      {
        path: '',
        name: 'login',
        component: () => import('../pages/LoginPage.vue'),
      },
    ],
  },
  {
    path: '/register',
    component: () => import('../layouts/AuthLayout.vue'),
    children: [
      {
        path: '',
        name: 'register',
        component: () => import('../pages/RegisterPage.vue'),
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
        path: 'more',
        name: 'more',
        component: () => import('../pages/MorePage.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'profile/:pubkey/following',
        name: 'profile-following',
        component: () => import('../pages/ProfileFollowingPage.vue'),
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
