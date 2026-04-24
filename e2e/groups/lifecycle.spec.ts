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
  openRequests,
  reloadAndWaitForApp,
  sendMessage,
  TEST_ACCOUNTS,
  threadMessage,
  waitForThreadMessage,
} from '../helpers';

test.describe.configure({ mode: 'serial' });

test('group owner can create a group, invite a member, and exchange messages both ways', async ({
  browser,
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
      about: groupAbout,
    });

    await addGroupMemberAndPublish(alice.page, bob.session.publicKey);
    const invitedMemberRow = alice.page
      .locator('.profile-members-list .q-item')
      .filter({ hasText: bob.session.publicKey.slice(0, 16) })
      .first();
    await expect(invitedMemberRow.getByTestId('group-member-ticket-epoch-badge')).toContainText(
      'Epoch 0'
    );
    await expect(invitedMemberRow.getByTestId('group-member-ticket-status')).toBeVisible();
    await invitedMemberRow.getByTestId('group-member-ticket-status').click();
    await expect(
      alice.page.locator('.profile-member-delivery__dialog-relay').filter({
        hasText: E2E_RELAY_URL,
      })
    ).toBeVisible();
    await alice.page.keyboard.press('Escape');

    await openRequests(bob.page);
    await expect(bob.page.getByTestId('chat-request-item')).toContainText('Group invitation');
    await acceptFirstRequest(bob.page);

    await navigateToChat(alice.page, groupPublicKey);
    await sendMessage(alice.page, aliceGroupMessage, {
      chatId: groupPublicKey,
    });
    await navigateToChat(bob.page, groupPublicKey);
    await waitForThreadMessage(bob.page, aliceGroupMessage, {
      chatId: groupPublicKey,
    });
    await sendMessage(bob.page, bobGroupMessage, {
      chatId: groupPublicKey,
    });
    await navigateToChat(alice.page, groupPublicKey);
    await waitForThreadMessage(alice.page, bobGroupMessage, {
      chatId: groupPublicKey,
    });
    await threadMessage(alice.page, bobGroupMessage)
      .getByTestId('thread-author-profile-link')
      .click();
    await alice.page.waitForURL(new RegExp(`#\\/contacts\\/${bob.session.publicKey}$`));
    await expectNoUnexpectedBrowserErrors([alice, bob]);
  } finally {
    await disposeUsers(alice, bob);
  }
});

test('group invite survives hard reload before acceptance and still opens a working chat', async ({
  browser,
}) => {
  const alice = await bootstrapUser(browser, TEST_ACCOUNTS.inviteReloadAlice);
  const bob = await bootstrapUser(browser, TEST_ACCOUNTS.inviteReloadBob);

  try {
    const groupPublicKey = await createGroup(alice.page, {
      name: `Reload Invite Group ${Date.now()}`,
      about: 'Invite reload coverage',
    });
    const ownerMessage = `invite-reload-owner-${Date.now()}`;
    const memberReply = `invite-reload-member-${Date.now()}`;

    await addGroupMemberAndPublish(alice.page, bob.session.publicKey);

    await openRequests(bob.page);
    await expect(bob.page.getByTestId('chat-request-item')).toContainText('Group invitation');
    await reloadAndWaitForApp(bob.page);
    await openRequests(bob.page);
    await expect(bob.page.getByTestId('chat-request-item')).toContainText('Group invitation');
    await acceptFirstRequest(bob.page);

    await navigateToChat(alice.page, groupPublicKey);
    await sendMessage(alice.page, ownerMessage, {
      chatId: groupPublicKey,
    });
    await navigateToChat(bob.page, groupPublicKey);
    await waitForThreadMessage(bob.page, ownerMessage, {
      chatId: groupPublicKey,
    });
    await sendMessage(bob.page, memberReply, {
      chatId: groupPublicKey,
    });
    await navigateToChat(alice.page, groupPublicKey);
    await waitForThreadMessage(alice.page, memberReply, {
      chatId: groupPublicKey,
    });
    await expectNoUnexpectedBrowserErrors([alice, bob]);
  } finally {
    await disposeUsers(alice, bob);
  }
});
