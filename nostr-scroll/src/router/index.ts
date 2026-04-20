import { route } from 'quasar/wrappers';
import { createMemoryHistory, createRouter, createWebHistory } from 'vue-router';
import routes from './routes';
import type { MockAuthSession } from '../types/auth';
import { STORAGE_KEYS, readStorageItem } from '../utils/storage';

function readStoredSession(): MockAuthSession {
  return readStorageItem<MockAuthSession>(STORAGE_KEYS.auth, {
    isAuthenticated: false,
    method: 'nostr-auth',
    currentPubkey: null,
  });
}

export default route(() => {
  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: process.env.SERVER ? createMemoryHistory() : createWebHistory(),
  });

  Router.beforeEach((to) => {
    const session = readStoredSession();
    const isAuthenticated = session.isAuthenticated && Boolean(session.currentPubkey);

    if (to.name === 'root') {
      return isAuthenticated ? { name: 'home' } : { name: 'login' };
    }

    if (to.name === 'login' && isAuthenticated) {
      return { name: 'home' };
    }

    if (to.meta.requiresAuth && !isAuthenticated) {
      return { name: 'login' };
    }

    return true;
  });

  return Router;
});
