import { expect, test } from '@playwright/test';
import {
  bootstrapUser,
  disposeUsers,
  establishAcceptedDirectChat,
  expectNoUnexpectedBrowserErrors,
  forwardMessage,
  navigateToChat,
  sendMessage,
  TEST_ACCOUNTS,
  threadMessage,
  waitForThreadMessage,
} from '../helpers';

test.describe.configure({ mode: 'serial' });

test('accepted DM forwards message content to another chat without attribution', async ({
  browser,
}) => {
  test.slow();

  const alice = await bootstrapUser(browser, TEST_ACCOUNTS.forwardAlice);
  const bob = await bootstrapUser(browser, TEST_ACCOUNTS.forwardBob);
  const charlie = await bootstrapUser(browser, TEST_ACCOUNTS.forwardCharlie);

  try {
    const originalMessage = `forward-content-${Date.now()}`;

    await establishAcceptedDirectChat(alice, bob);
    await establishAcceptedDirectChat(alice, charlie);

    await navigateToChat(alice.page, bob.session.publicKey);
    await sendMessage(alice.page, originalMessage, {
      chatId: bob.session.publicKey,
    });
    await waitForThreadMessage(bob.page, originalMessage, {
      chatId: alice.session.publicKey,
    });

    await forwardMessage(alice.page, originalMessage, charlie.account.displayName);

    await waitForThreadMessage(charlie.page, originalMessage, {
      chatId: alice.session.publicKey,
    });
    await expect(
      threadMessage(charlie.page, originalMessage).locator('.bubble__reply-preview')
    ).toHaveCount(0);
    await expect(threadMessage(charlie.page, originalMessage)).not.toContainText(
      bob.account.displayName
    );
    await expectNoUnexpectedBrowserErrors([alice, bob, charlie]);
  } finally {
    await disposeUsers(alice, bob, charlie);
  }
});
