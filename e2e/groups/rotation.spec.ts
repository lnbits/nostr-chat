import { expect, test } from '@playwright/test';
import {
  acceptFirstRequest,
  addGroupMemberAndPublish,
  bootstrapUser,
  createGroup,
  disposeUsers,
  E2E_RELAY_URL,
  expectNoUnexpectedBrowserErrors,
  navigateToChat,
  openGroupContact,
  openGroupEpochsTab,
  openRequests,
  readGroupEpochNumbers,
  rotateGroupEpoch,
  sendMessage,
  TEST_ACCOUNTS,
  waitForAppBridge,
  waitForThreadMessage,
} from '../helpers';

test.describe.configure({ mode: 'serial' });

test('hard reload after rotation keeps the higher group epoch current and messaging working', async ({
  browser,
}) => {
  const alice = await bootstrapUser(browser, TEST_ACCOUNTS.groupEpochAlice);
  const bob = await bootstrapUser(browser, TEST_ACCOUNTS.groupEpochBob);

  try {
    const groupPublicKey = await createGroup(alice.page, {
      name: `Epoch Restore Group ${Date.now()}`,
      about: 'Stale epoch regression coverage',
    });
    const rotatedOwnerMessage = `epoch-reload-owner-${Date.now()}`;
    const rotatedMemberReply = `epoch-reload-member-${Date.now()}`;

    await addGroupMemberAndPublish(alice.page, bob.session.publicKey);
    await openRequests(bob.page);
    await expect(bob.page.getByTestId('chat-request-item')).toContainText('Group invitation');
    await acceptFirstRequest(bob.page);

    await rotateGroupEpoch(alice.page, groupPublicKey, [bob.session.publicKey], [E2E_RELAY_URL]);

    await bob.page.reload();
    await waitForAppBridge(bob.page);
    await openGroupContact(bob.page, groupPublicKey);
    await openGroupEpochsTab(bob.page);
    await expect
      .poll(async () => (await readGroupEpochNumbers(bob.page))[0] ?? null, {
        timeout: 12_000,
      })
      .toBe(1);

    await navigateToChat(alice.page, groupPublicKey);
    await sendMessage(alice.page, rotatedOwnerMessage, {
      chatId: groupPublicKey,
    });
    await navigateToChat(bob.page, groupPublicKey);
    await waitForThreadMessage(bob.page, rotatedOwnerMessage, {
      chatId: groupPublicKey,
    });
    await sendMessage(bob.page, rotatedMemberReply, {
      chatId: groupPublicKey,
    });
    await navigateToChat(alice.page, groupPublicKey);
    await waitForThreadMessage(alice.page, rotatedMemberReply, {
      chatId: groupPublicKey,
    });
    await expectNoUnexpectedBrowserErrors([alice, bob]);
  } finally {
    await disposeUsers(alice, bob);
  }
});

test('group messages continue both ways after an explicit epoch rotation', async ({ browser }) => {
  const alice = await bootstrapUser(browser, TEST_ACCOUNTS.groupRotateAlice);
  const bob = await bootstrapUser(browser, TEST_ACCOUNTS.groupRotateBob);

  try {
    const groupPublicKey = await createGroup(alice.page, {
      name: `Rotated Group ${Date.now()}`,
      about: 'Post-rotation messaging coverage',
    });
    const rotatedOwnerMessage = `owner-after-rotation-${Date.now()}`;
    const rotatedMemberReply = `member-after-rotation-${Date.now()}`;

    await addGroupMemberAndPublish(alice.page, bob.session.publicKey);
    await openRequests(bob.page);
    await expect(bob.page.getByTestId('chat-request-item')).toContainText('Group invitation');
    await acceptFirstRequest(bob.page);

    await rotateGroupEpoch(alice.page, groupPublicKey, [bob.session.publicKey], [E2E_RELAY_URL]);

    await navigateToChat(alice.page, groupPublicKey);
    await sendMessage(alice.page, rotatedOwnerMessage, {
      chatId: groupPublicKey,
    });
    await navigateToChat(bob.page, groupPublicKey);
    await waitForThreadMessage(bob.page, rotatedOwnerMessage, {
      chatId: groupPublicKey,
    });
    await sendMessage(bob.page, rotatedMemberReply, {
      chatId: groupPublicKey,
    });
    await navigateToChat(alice.page, groupPublicKey);
    await waitForThreadMessage(alice.page, rotatedMemberReply, {
      chatId: groupPublicKey,
    });
    await expectNoUnexpectedBrowserErrors([alice, bob]);
  } finally {
    await disposeUsers(alice, bob);
  }
});
