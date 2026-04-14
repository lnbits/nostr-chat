import { expect, test } from '@playwright/test';
import {
  bootstrapSessionOnPage,
  bootstrapUser,
  disposeUsers,
  establishAcceptedDirectChat,
  expectBrowserStorageToBeEmpty,
  expectNoUnexpectedBrowserErrors,
  logoutFromSettings,
  TEST_ACCOUNTS,
} from './helpers';

test.describe.configure({ mode: 'serial' });

test('logout and logging in as another user does not leak prior chat state', async ({
  browser,
}) => {
  const alice = await bootstrapUser(browser, TEST_ACCOUNTS.isolationAlice);
  const bob = await bootstrapUser(browser, TEST_ACCOUNTS.isolationBob);

  try {
    await establishAcceptedDirectChat(alice, bob);

    await alice.page.goto('/#/chats');
    await expect(alice.page.getByTestId('chat-item')).toHaveCount(1);
    await expect(alice.page.getByText(TEST_ACCOUNTS.isolationBob.displayName)).toBeVisible();

    await logoutFromSettings(alice.page);
    await expectBrowserStorageToBeEmpty(alice.page);
    await bootstrapSessionOnPage(alice.page, TEST_ACCOUNTS.isolationCharlie);

    await alice.page.goto('/#/chats');
    await expect(alice.page.getByTestId('chat-item')).toHaveCount(0);
    await expect(alice.page.getByText(TEST_ACCOUNTS.isolationBob.displayName)).toHaveCount(0);
    await expect(alice.page.getByTestId('requests-row')).toHaveCount(0);
    await expectNoUnexpectedBrowserErrors([alice, bob]);
  } finally {
    await disposeUsers(alice, bob);
  }
});
