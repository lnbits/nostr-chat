import { Notify } from 'quasar';
import { route } from 'quasar/wrappers';
import {
  clearAndroidPrivateKeySessionMetadata,
  hasUsableAndroidPrivateKeySession,
} from 'src/services/androidSecurePrivateKeyStorage';
import {
  clearElectronPrivateKeySessionMetadata,
  hasUsableElectronPrivateKeySession,
} from 'src/services/electronSecurePrivateKeyStorage';
import { PUBLIC_KEY_STORAGE_KEY } from 'src/stores/nostr/constants';
import {
  ALREADY_LOGGED_IN_BUNKER_MESSAGE,
  readBunkerLoginQueryParam,
  readTopLevelBunkerLoginQueryParam,
  removeTopLevelBunkerLoginQueryParam,
  withoutBunkerLoginQueryParam,
} from 'src/utils/bunkerLoginQuery';
import { finalizePendingLogoutCleanup } from 'src/utils/logoutCleanup';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';
import routes from './routes';

async function hasStoredPublicKey(): Promise<boolean> {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return false;
  }

  const hasPublicKey = Boolean(window.localStorage.getItem(PUBLIC_KEY_STORAGE_KEY)?.trim());
  if (!hasPublicKey) {
    return false;
  }

  if (!(await hasUsableAndroidPrivateKeySession())) {
    clearAndroidPrivateKeySessionMetadata();
    return false;
  }

  if (!(await hasUsableElectronPrivateKeySession())) {
    clearElectronPrivateKeySessionMetadata();
    return false;
  }

  return true;
}

function showAlreadyLoggedInBunkerMessage(): void {
  Notify.create({
    type: 'info',
    message: ALREADY_LOGGED_IN_BUNKER_MESSAGE,
    position: 'top',
    timeout: 3200,
  });
}

export default route(() => {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory;

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE),
  });

  Router.beforeEach(async (to) => {
    if (!process.env.SERVER) {
      await finalizePendingLogoutCleanup();
    }

    if (process.env.SERVER) {
      return true;
    }

    const isAuthRoute = to.name === 'auth' || to.name === 'register';
    const hasLoggedInUser = await hasStoredPublicKey();
    const routeBunkerToken = readBunkerLoginQueryParam(to.query);
    const topLevelBunkerToken = readTopLevelBunkerLoginQueryParam();
    const hasBunkerLoginToken = Boolean(routeBunkerToken || topLevelBunkerToken);

    if (hasLoggedInUser && hasBunkerLoginToken) {
      removeTopLevelBunkerLoginQueryParam();
      showAlreadyLoggedInBunkerMessage();

      if (isAuthRoute) {
        return { name: 'chats' };
      }

      if (routeBunkerToken) {
        return {
          path: to.path,
          query: withoutBunkerLoginQueryParam(to.query),
          hash: to.hash,
          replace: true,
        };
      }

      return true;
    }

    if (isAuthRoute) {
      return hasLoggedInUser ? { name: 'chats' } : true;
    }

    if (hasLoggedInUser) {
      return true;
    }

    if (routeBunkerToken) {
      return {
        name: 'auth',
        query: {
          bunker: routeBunkerToken,
        },
      };
    }

    return '/login';
  });

  return Router;
});
