import { expect, test } from '@playwright/test';
import {
  TEST_ACCOUNTS,
  acceptFirstRequest,
  addGroupMemberAndPublish,
  addGroupMembersAndPublish,
  bootstrapUser,
  createGroup,
  deleteMessage,
  disposeUsers,
  establishAcceptedDirectChat,
  logoutFromSettings,
  navigateToChat,
  openGroupContact,
  openGroupEpochsTab,
  openDirectChatFromIdentifier,
  openRequests,
  readGroupEpochNumbers,
  reactToMessage,
  removeGroupMemberAndPublish,
  sendMessage,
  waitForDeletedMessageState,
  waitForNoThreadMessage,
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

test('group owner can create a group, invite a member, and exchange messages both ways', async ({
  browser
}) => {
  const alice = await bootstrapUser(browser, TEST_ACCOUNTS.groupAlice);
  const bob = await bootstrapUser(browser, TEST_ACCOUNTS.groupBob);

  try {
    const groupName = `Group ${Date.now()}`;
    const groupAbout = 'Relay-backed group e2e';
    const aliceGroupMessage = `group-hello-from-alice-${Date.now()}`;
    const bobGroupMessage = `group-hello-from-bob-${Date.now()}`;

    const groupPublicKey = await createGroup(alice.page, {
      name: groupName,
      about: groupAbout
    });

    await addGroupMemberAndPublish(alice.page, bob.session.publicKey);

    await openRequests(bob.page);
    await expect(bob.page.getByTestId('chat-request-item')).toContainText('Group invitation');
    await acceptFirstRequest(bob.page);

    await navigateToChat(alice.page, groupPublicKey);
    await sendMessage(alice.page, aliceGroupMessage, {
      chatId: groupPublicKey
    });
    await navigateToChat(bob.page, groupPublicKey);
    await waitForThreadMessage(bob.page, aliceGroupMessage, {
      chatId: groupPublicKey
    });
    await sendMessage(bob.page, bobGroupMessage, {
      chatId: groupPublicKey
    });
    await navigateToChat(alice.page, groupPublicKey);
    await waitForThreadMessage(alice.page, bobGroupMessage, {
      chatId: groupPublicKey
    });
  } finally {
    await disposeUsers(alice, bob);
  }
});

test('group member removal rotates epoch and blocks removed members from new messages', async ({
  browser
}) => {
  const owner = await bootstrapUser(browser, TEST_ACCOUNTS.groupRemovalOwner);
  const survivingMember = await bootstrapUser(browser, TEST_ACCOUNTS.groupRemovalBob);
  const removedMember = await bootstrapUser(browser, TEST_ACCOUNTS.groupRemovalCharlie);

  try {
    const groupPublicKey = await createGroup(owner.page, {
      name: `Removal Group ${Date.now()}`,
      about: 'Group epoch rotation coverage'
    });
    const initialMessage = `before-removal-${Date.now()}`;
    const postRemovalMessage = `after-removal-${Date.now()}`;

    await addGroupMembersAndPublish(owner.page, [
      survivingMember.session.publicKey,
      removedMember.session.publicKey
    ]);

    await openRequests(survivingMember.page);
    await expect(survivingMember.page.getByTestId('chat-request-item')).toContainText('Group invitation');
    await acceptFirstRequest(survivingMember.page);

    await openRequests(removedMember.page);
    await expect(removedMember.page.getByTestId('chat-request-item')).toContainText('Group invitation');
    await acceptFirstRequest(removedMember.page);

    await navigateToChat(owner.page, groupPublicKey);
    await sendMessage(owner.page, initialMessage, {
      chatId: groupPublicKey
    });
    await navigateToChat(survivingMember.page, groupPublicKey);
    await waitForThreadMessage(survivingMember.page, initialMessage, {
      chatId: groupPublicKey
    });
    await navigateToChat(removedMember.page, groupPublicKey);
    await waitForThreadMessage(removedMember.page, initialMessage, {
      chatId: groupPublicKey
    });

    await openGroupContact(owner.page, groupPublicKey);
    await removeGroupMemberAndPublish(owner.page, removedMember.session.publicKey);
    await openGroupEpochsTab(owner.page);
    await expect
      .poll(() => readGroupEpochNumbers(owner.page), { timeout: 12_000 })
      .toEqual([1, 0]);

    await navigateToChat(owner.page, groupPublicKey);
    await sendMessage(owner.page, postRemovalMessage, {
      chatId: groupPublicKey
    });
    await navigateToChat(survivingMember.page, groupPublicKey);
    await waitForThreadMessage(survivingMember.page, postRemovalMessage, {
      chatId: groupPublicKey
    });
    await navigateToChat(removedMember.page, groupPublicKey);
    await waitForNoThreadMessage(removedMember.page, postRemovalMessage, {
      chatId: groupPublicKey,
      timeoutMs: 6_000
    });
  } finally {
    await disposeUsers(owner, survivingMember, removedMember);
  }
});

test('group delivery still works after both users restart', async ({ browser }) => {
  let alice = await bootstrapUser(browser, TEST_ACCOUNTS.groupRestartAlice);
  let bob = await bootstrapUser(browser, TEST_ACCOUNTS.groupRestartBob);

  try {
    const groupPublicKey = await createGroup(alice.page, {
      name: `Restart Group ${Date.now()}`,
      about: 'Restart and restore coverage'
    });
    const beforeRestartMessage = `before-restart-${Date.now()}`;
    const afterRestartMessage = `after-restart-${Date.now()}`;
    const restartReplyMessage = `reply-after-restart-${Date.now()}`;

    await addGroupMemberAndPublish(alice.page, bob.session.publicKey);

    await openRequests(bob.page);
    await expect(bob.page.getByTestId('chat-request-item')).toContainText('Group invitation');
    await acceptFirstRequest(bob.page);

    await navigateToChat(alice.page, groupPublicKey);
    await sendMessage(alice.page, beforeRestartMessage, {
      chatId: groupPublicKey
    });
    await navigateToChat(bob.page, groupPublicKey);
    await waitForThreadMessage(bob.page, beforeRestartMessage, {
      chatId: groupPublicKey
    });

    await disposeUsers(alice, bob);
    alice = await bootstrapUser(browser, TEST_ACCOUNTS.groupRestartAlice);
    bob = await bootstrapUser(browser, TEST_ACCOUNTS.groupRestartBob);

    await navigateToChat(alice.page, groupPublicKey);
    await sendMessage(alice.page, afterRestartMessage, {
      chatId: groupPublicKey
    });
    await navigateToChat(bob.page, groupPublicKey);
    await waitForThreadMessage(bob.page, afterRestartMessage, {
      chatId: groupPublicKey
    });
    await sendMessage(bob.page, restartReplyMessage, {
      chatId: groupPublicKey
    });
    await navigateToChat(alice.page, groupPublicKey);
    await waitForThreadMessage(alice.page, restartReplyMessage, {
      chatId: groupPublicKey
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
