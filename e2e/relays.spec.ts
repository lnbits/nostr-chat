import { expect, test } from '@playwright/test';
import {
  bootstrapUser,
  closeDialogWithEscape,
  disposeUsers,
  E2E_DUAL_RELAY_URLS,
  E2E_RELAY_URL,
  E2E_RELAY_URL_TWO,
  establishAcceptedDirectChat,
  expectNoUnexpectedBrowserErrors,
  expectPendingMessageRelayStatus,
  navigateToChat,
  openAppRelaysSettings,
  openMessageRelayStatusDialog,
  pauseRelayService,
  reloadAndWaitForApp,
  removeRelayFromSettings,
  retryMessageRelay,
  sendMessage,
  TEST_ACCOUNTS,
  unpauseRelayService,
  waitForThreadMessage,
} from './helpers';

test.describe.configure({ mode: 'serial' });

test('editing app relays survives hard reload and direct messages still arrive on the remaining relay', async ({
  browser,
}) => {
  const alice = await bootstrapUser(browser, TEST_ACCOUNTS.relaySettingsAlice, {
    relayUrls: E2E_DUAL_RELAY_URLS,
  });
  const bob = await bootstrapUser(browser, TEST_ACCOUNTS.relaySettingsBob, {
    relayUrls: E2E_DUAL_RELAY_URLS,
  });

  try {
    const afterRelayEditMessage = `after-app-relay-edit-${Date.now()}`;

    await establishAcceptedDirectChat(alice, bob);

    await openAppRelaysSettings(alice.page);
    const appRelayPanel = alice.page.getByTestId('settings-relays-app-panel');
    await expect(appRelayPanel).toContainText(E2E_DUAL_RELAY_URLS[0]);
    await expect(appRelayPanel).toContainText(E2E_DUAL_RELAY_URLS[1]);
    await removeRelayFromSettings(alice.page, E2E_DUAL_RELAY_URLS[0]);

    await reloadAndWaitForApp(alice.page);
    await openAppRelaysSettings(alice.page);
    await expect(appRelayPanel).not.toContainText(E2E_DUAL_RELAY_URLS[0]);
    await expect(appRelayPanel).toContainText(E2E_DUAL_RELAY_URLS[1]);

    await navigateToChat(bob.page, alice.session.publicKey);
    await sendMessage(bob.page, afterRelayEditMessage, {
      chatId: alice.session.publicKey,
    });
    await navigateToChat(alice.page, bob.session.publicKey);
    await waitForThreadMessage(alice.page, afterRelayEditMessage, {
      chatId: bob.session.publicKey,
    });
    await expectNoUnexpectedBrowserErrors([alice, bob]);
  } finally {
    await disposeUsers(alice, bob);
  }
});

test('pending outbound message survives reload and relay retry resolves after relay recovery', async ({
  browser,
}) => {
  const alice = await bootstrapUser(browser, TEST_ACCOUNTS.pendingAlice, {
    relayUrls: E2E_DUAL_RELAY_URLS,
  });
  const bob = await bootstrapUser(browser, TEST_ACCOUNTS.pendingBob, {
    relayUrls: [E2E_RELAY_URL],
  });

  try {
    const pendingMessage = `pending-reload-${Date.now()}`;

    await establishAcceptedDirectChat(alice, bob);
    await pauseRelayService('relay-two');

    await navigateToChat(alice.page, bob.session.publicKey);
    await sendMessage(alice.page, pendingMessage, {
      chatId: bob.session.publicKey,
    });
    await waitForThreadMessage(bob.page, pendingMessage, {
      chatId: alice.session.publicKey,
    });
    await expectPendingMessageRelayStatus(alice.page, pendingMessage);

    await reloadAndWaitForApp(alice.page);
    await expect(alice.page).toHaveURL(new RegExp(`#\\/chats\\/${bob.session.publicKey}$`));
    await waitForThreadMessage(alice.page, pendingMessage, {
      chatId: bob.session.publicKey,
    });

    await openMessageRelayStatusDialog(alice.page, pendingMessage);
    const failedRelayRow = alice.page
      .locator('.bubble__status-list-item--dialog')
      .filter({ hasText: E2E_RELAY_URL_TWO });
    await expect(
      failedRelayRow.getByRole('button', { name: 'Retry', exact: true }).first()
    ).toBeVisible({
      timeout: 12_000,
    });
    await closeDialogWithEscape(alice.page);

    await unpauseRelayService('relay-two');
    await retryMessageRelay(alice.page, pendingMessage, E2E_RELAY_URL_TWO);
    await closeDialogWithEscape(alice.page);
    await waitForThreadMessage(alice.page, pendingMessage, {
      chatId: bob.session.publicKey,
    });
    await expectNoUnexpectedBrowserErrors([alice, bob], {
      allowPatterns: [/127\.0\.0\.1:7001/i, /relay-two/i, /websocket/i],
    });
  } finally {
    await unpauseRelayService('relay-two').catch(() => undefined);
    await disposeUsers(alice, bob);
  }
});
