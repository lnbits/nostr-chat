import { expect, test } from '@playwright/test';
import {
  acceptFirstRequest,
  addGroupMemberAndPublish,
  bootstrapUser,
  createGroup,
  disposeUsers,
  expectNoUnexpectedBrowserErrors,
  navigateToChat,
  openGroupContact,
  openGroupEpochsTab,
  openRequests,
  readGroupEpochNumbers,
  sendMessage,
  TEST_ACCOUNTS,
  waitForThreadMessage,
} from '../helpers';

test.describe.configure({ mode: 'serial' });

test('adding a new group member without rotation keeps the current epoch and messaging working for all members', async ({
  browser,
}) => {
  const owner = await bootstrapUser(browser, TEST_ACCOUNTS.groupAddOwner);
  const bob = await bootstrapUser(browser, TEST_ACCOUNTS.groupAddBob);
  const charlie = await bootstrapUser(browser, TEST_ACCOUNTS.groupAddCharlie);

  try {
    const groupPublicKey = await createGroup(owner.page, {
      name: `Add Member Group ${Date.now()}`,
      about: 'No-rotation add-member coverage',
    });
    const beforeAddMessage = `before-add-${Date.now()}`;
    const afterAddMessage = `after-add-${Date.now()}`;
    const charlieReply = `charlie-reply-${Date.now()}`;

    await addGroupMemberAndPublish(owner.page, bob.session.publicKey);
    await openRequests(bob.page);
    await expect(bob.page.getByTestId('chat-request-item')).toContainText('Group invitation');
    await acceptFirstRequest(bob.page);

    await navigateToChat(owner.page, groupPublicKey);
    await sendMessage(owner.page, beforeAddMessage, {
      chatId: groupPublicKey,
    });
    await navigateToChat(bob.page, groupPublicKey);
    await waitForThreadMessage(bob.page, beforeAddMessage, {
      chatId: groupPublicKey,
    });

    await openGroupContact(owner.page, groupPublicKey);
    await addGroupMemberAndPublish(owner.page, charlie.session.publicKey);
    await openGroupEpochsTab(owner.page);
    await expect.poll(() => readGroupEpochNumbers(owner.page), { timeout: 12_000 }).toEqual([0]);

    await openRequests(charlie.page);
    await expect(charlie.page.getByTestId('chat-request-item')).toContainText('Group invitation');
    await acceptFirstRequest(charlie.page);

    await navigateToChat(owner.page, groupPublicKey);
    await sendMessage(owner.page, afterAddMessage, {
      chatId: groupPublicKey,
    });

    await navigateToChat(charlie.page, groupPublicKey);
    await waitForThreadMessage(charlie.page, beforeAddMessage, {
      chatId: groupPublicKey,
    });
    await waitForThreadMessage(charlie.page, afterAddMessage, {
      chatId: groupPublicKey,
    });

    await navigateToChat(bob.page, groupPublicKey);
    await waitForThreadMessage(bob.page, beforeAddMessage, {
      chatId: groupPublicKey,
    });
    await waitForThreadMessage(bob.page, afterAddMessage, {
      chatId: groupPublicKey,
    });

    await sendMessage(charlie.page, charlieReply, {
      chatId: groupPublicKey,
    });
    await navigateToChat(owner.page, groupPublicKey);
    await waitForThreadMessage(owner.page, charlieReply, {
      chatId: groupPublicKey,
    });
    await expectNoUnexpectedBrowserErrors([owner, bob, charlie]);
  } finally {
    await disposeUsers(owner, bob, charlie);
  }
});
