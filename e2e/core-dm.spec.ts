import { expect, test } from '@playwright/test';
import {
  TEST_ACCOUNTS,
  acceptFirstRequest,
  bootstrapUser,
  deleteMessage,
  disposeUsers,
  establishAcceptedDirectChat,
  logoutFromSettings,
  navigateToChat,
  openDirectChatFromIdentifier,
  openRequests,
  reactToMessage,
  sendMessage,
  waitForDeletedMessageState,
  waitForReaction,
  waitForThreadMessage
} from './helpers';

test.describe.configure({ mode: 'serial' });

test('first-contact DM becomes a request, can be accepted, and supports reply', async ({
  browser
}) => {
  const alice = await bootstrapUser(browser, TEST_ACCOUNTS.requestAlice);
  const bob = await bootstrapUser(browser, TEST_ACCOUNTS.requestBob);

  try {
    const openingMessage = `hello-from-alice-${Date.now()}`;
    const replyMessage = `reply-from-bob-${Date.now()}`;

    await openDirectChatFromIdentifier(
      alice.page,
      bob.session.publicKey,
      TEST_ACCOUNTS.requestBob.displayName
    );
    await sendMessage(alice.page, openingMessage, {
      chatId: bob.session.publicKey
    });

    await openRequests(bob.page);
    await expect(bob.page.getByTestId('chat-request-item')).toContainText(openingMessage);
    await acceptFirstRequest(bob.page);

    await navigateToChat(bob.page, alice.session.publicKey);
    await sendMessage(bob.page, replyMessage, {
      chatId: alice.session.publicKey
    });
    await waitForThreadMessage(alice.page, replyMessage, {
      chatId: bob.session.publicKey
    });
  } finally {
    await disposeUsers(alice, bob);
  }
});

test('accepted DM supports reactions, deletion, and logout', async ({ browser }) => {
  const alice = await bootstrapUser(browser, TEST_ACCOUNTS.actionsAlice);
  const bob = await bootstrapUser(browser, TEST_ACCOUNTS.actionsBob);

  try {
    const targetMessage = `reaction-delete-${Date.now()}`;

    await establishAcceptedDirectChat(alice, bob);
    await sendMessage(alice.page, targetMessage, {
      chatId: bob.session.publicKey
    });
    await waitForThreadMessage(bob.page, targetMessage, {
      chatId: alice.session.publicKey
    });

    await reactToMessage(bob.page, targetMessage);
    await waitForReaction(alice.page, /thumbs up reaction/i, {
      chatId: bob.session.publicKey
    });

    await deleteMessage(alice.page, targetMessage);
    await waitForDeletedMessageState(bob.page, targetMessage, {
      chatId: alice.session.publicKey
    });

    await logoutFromSettings(alice.page);
  } finally {
    await disposeUsers(alice, bob);
  }
});
