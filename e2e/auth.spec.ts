import { test } from '@playwright/test';
import {
  acceptFirstRequest,
  bootstrapExtensionUser,
  bootstrapUser,
  disposeUsers,
  expectNoUnexpectedBrowserErrors,
  logoutFromSettings,
  navigateToChat,
  openDirectChatFromIdentifier,
  openRequests,
  sendMessage,
  TEST_ACCOUNTS,
  waitForThreadMessage,
} from './helpers';

test.describe.configure({ mode: 'serial' });

test('NIP-07 login can establish a direct chat and receive a reply', async ({ browser }) => {
  const alice = await bootstrapExtensionUser(browser, TEST_ACCOUNTS.nip07Alice);
  const bob = await bootstrapUser(browser, TEST_ACCOUNTS.nip07Bob);

  try {
    const openingMessage = `nip07-open-${Date.now()}`;
    const replyMessage = `nip07-reply-${Date.now()}`;

    await openDirectChatFromIdentifier(
      alice.page,
      bob.session.publicKey,
      TEST_ACCOUNTS.nip07Bob.displayName
    );
    await sendMessage(alice.page, openingMessage, {
      chatId: bob.session.publicKey,
    });

    await openRequests(bob.page);
    await acceptFirstRequest(bob.page);
    await navigateToChat(bob.page, alice.session.publicKey);
    await sendMessage(bob.page, replyMessage, {
      chatId: alice.session.publicKey,
    });

    await navigateToChat(alice.page, bob.session.publicKey);
    await waitForThreadMessage(alice.page, replyMessage, {
      chatId: bob.session.publicKey,
    });
    await logoutFromSettings(alice.page);
    await expectNoUnexpectedBrowserErrors([alice, bob]);
  } finally {
    await disposeUsers(alice, bob);
  }
});
