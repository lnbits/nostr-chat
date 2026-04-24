import { expect, test } from '@playwright/test';
import {
  acceptFirstRequest,
  addGroupMembersAndPublish,
  bootstrapUser,
  createGroup,
  disposeUsers,
  expectNoUnexpectedBrowserErrors,
  navigateToChat,
  openGroupContact,
  openGroupEpochsTab,
  openRequests,
  readGroupEpochNumbers,
  reloadAndWaitForApp,
  removeGroupMemberAndPublish,
  sendMessage,
  TEST_ACCOUNTS,
  waitForNoThreadMessage,
  waitForThreadMessage,
} from '../helpers';

test.describe.configure({ mode: 'serial' });

test('group member removal rotates epoch and blocks removed members from new messages', async ({
  browser,
}) => {
  const owner = await bootstrapUser(browser, TEST_ACCOUNTS.groupRemovalOwner);
  const survivingMember = await bootstrapUser(browser, TEST_ACCOUNTS.groupRemovalBob);
  const removedMember = await bootstrapUser(browser, TEST_ACCOUNTS.groupRemovalCharlie);

  try {
    const groupPublicKey = await createGroup(owner.page, {
      name: `Removal Group ${Date.now()}`,
      about: 'Group epoch rotation coverage',
    });
    const initialMessage = `before-removal-${Date.now()}`;
    const postRemovalMessage = `after-removal-${Date.now()}`;

    await addGroupMembersAndPublish(owner.page, [
      survivingMember.session.publicKey,
      removedMember.session.publicKey,
    ]);

    await openRequests(survivingMember.page);
    await expect(survivingMember.page.getByTestId('chat-request-item')).toContainText(
      'Group invitation'
    );
    await acceptFirstRequest(survivingMember.page);

    await openRequests(removedMember.page);
    await expect(removedMember.page.getByTestId('chat-request-item')).toContainText(
      'Group invitation'
    );
    await acceptFirstRequest(removedMember.page);

    await navigateToChat(owner.page, groupPublicKey);
    await sendMessage(owner.page, initialMessage, {
      chatId: groupPublicKey,
    });
    await navigateToChat(survivingMember.page, groupPublicKey);
    await waitForThreadMessage(survivingMember.page, initialMessage, {
      chatId: groupPublicKey,
    });
    await navigateToChat(removedMember.page, groupPublicKey);
    await waitForThreadMessage(removedMember.page, initialMessage, {
      chatId: groupPublicKey,
    });

    await openGroupContact(owner.page, groupPublicKey);
    await removeGroupMemberAndPublish(owner.page, removedMember.session.publicKey);
    await openGroupEpochsTab(owner.page);
    await expect.poll(() => readGroupEpochNumbers(owner.page), { timeout: 12_000 }).toEqual([1, 0]);

    await navigateToChat(owner.page, groupPublicKey);
    await sendMessage(owner.page, postRemovalMessage, {
      chatId: groupPublicKey,
    });
    await navigateToChat(survivingMember.page, groupPublicKey);
    await waitForThreadMessage(survivingMember.page, postRemovalMessage, {
      chatId: groupPublicKey,
    });
    await navigateToChat(removedMember.page, groupPublicKey);
    await waitForNoThreadMessage(removedMember.page, postRemovalMessage, {
      chatId: groupPublicKey,
      timeoutMs: 6_000,
    });
    await expectNoUnexpectedBrowserErrors([owner, survivingMember, removedMember]);
  } finally {
    await disposeUsers(owner, survivingMember, removedMember);
  }
});

test('removed group member stays blocked after hard reload and cannot deliver new group messages', async ({
  browser,
}) => {
  const owner = await bootstrapUser(browser, TEST_ACCOUNTS.groupRemovalReloadOwner);
  const survivingMember = await bootstrapUser(browser, TEST_ACCOUNTS.groupRemovalReloadBob);
  const removedMember = await bootstrapUser(browser, TEST_ACCOUNTS.groupRemovalReloadCharlie);

  try {
    const groupPublicKey = await createGroup(owner.page, {
      name: `Removal Reload Group ${Date.now()}`,
      about: 'Removed member reload coverage',
    });
    const initialMessage = `before-removal-reload-${Date.now()}`;
    const postRemovalMessage = `after-removal-reload-${Date.now()}`;
    const removedMemberAttempt = `removed-member-attempt-${Date.now()}`;

    await addGroupMembersAndPublish(owner.page, [
      survivingMember.session.publicKey,
      removedMember.session.publicKey,
    ]);

    await openRequests(survivingMember.page);
    await acceptFirstRequest(survivingMember.page);
    await openRequests(removedMember.page);
    await acceptFirstRequest(removedMember.page);

    await navigateToChat(owner.page, groupPublicKey);
    await sendMessage(owner.page, initialMessage, {
      chatId: groupPublicKey,
    });
    await navigateToChat(survivingMember.page, groupPublicKey);
    await waitForThreadMessage(survivingMember.page, initialMessage, {
      chatId: groupPublicKey,
    });
    await navigateToChat(removedMember.page, groupPublicKey);
    await waitForThreadMessage(removedMember.page, initialMessage, {
      chatId: groupPublicKey,
    });

    await openGroupContact(owner.page, groupPublicKey);
    await removeGroupMemberAndPublish(owner.page, removedMember.session.publicKey);
    await openGroupEpochsTab(owner.page);
    await expect.poll(() => readGroupEpochNumbers(owner.page), { timeout: 12_000 }).toEqual([1, 0]);

    await navigateToChat(owner.page, groupPublicKey);
    await sendMessage(owner.page, postRemovalMessage, {
      chatId: groupPublicKey,
    });
    await navigateToChat(survivingMember.page, groupPublicKey);
    await waitForThreadMessage(survivingMember.page, postRemovalMessage, {
      chatId: groupPublicKey,
    });
    await navigateToChat(removedMember.page, groupPublicKey);
    await waitForNoThreadMessage(removedMember.page, postRemovalMessage, {
      chatId: groupPublicKey,
      timeoutMs: 6_000,
    });

    await reloadAndWaitForApp(removedMember.page);
    await navigateToChat(removedMember.page, groupPublicKey);
    await waitForNoThreadMessage(removedMember.page, postRemovalMessage, {
      chatId: groupPublicKey,
      timeoutMs: 6_000,
    });

    await sendMessage(removedMember.page, removedMemberAttempt, {
      chatId: groupPublicKey,
    });
    await navigateToChat(owner.page, groupPublicKey);
    await waitForNoThreadMessage(owner.page, removedMemberAttempt, {
      chatId: groupPublicKey,
      timeoutMs: 6_000,
    });
    await navigateToChat(survivingMember.page, groupPublicKey);
    await waitForNoThreadMessage(survivingMember.page, removedMemberAttempt, {
      chatId: groupPublicKey,
      timeoutMs: 6_000,
    });
    await expectNoUnexpectedBrowserErrors([owner, survivingMember, removedMember]);
  } finally {
    await disposeUsers(owner, survivingMember, removedMember);
  }
});
