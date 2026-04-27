import { expect, test } from '@playwright/test';
import {
  acceptFirstRequest,
  addGroupMemberAndPublish,
  bootstrapUser,
  createGroup,
  disposeUsers,
  E2E_DUAL_RELAY_URLS,
  expectNoUnexpectedBrowserErrors,
  navigateToChat,
  openGroupContact,
  openGroupRelaysTab,
  openProfileRelaysSection,
  openRequests,
  removeGroupRelayAndPublish,
  sendMessage,
  TEST_ACCOUNTS,
  updateStoredContactRelays,
  waitForThreadMessage,
} from '../helpers';

test.describe.configure({ mode: 'serial' });

test('invited members see published group relays and profile refresh restores them when missing', async ({
  browser,
}) => {
  const alice = await bootstrapUser(browser, TEST_ACCOUNTS.groupInviteRelayAlice, {
    relayUrls: E2E_DUAL_RELAY_URLS,
  });
  const bob = await bootstrapUser(browser, TEST_ACCOUNTS.groupInviteRelayBob, {
    relayUrls: [E2E_DUAL_RELAY_URLS[0]],
  });

  try {
    const groupPublicKey = await createGroup(alice.page, {
      name: `Invite Relay Group ${Date.now()}`,
      about: 'Invite relay propagation coverage',
    });

    await addGroupMemberAndPublish(alice.page, bob.session.publicKey);
    await openRequests(bob.page);
    await expect(bob.page.getByTestId('chat-request-item')).toContainText('Group invitation');
    await acceptFirstRequest(bob.page);

    await openGroupContact(bob.page, groupPublicKey);
    await openProfileRelaysSection(bob.page);
    await expect(bob.page.locator('.profile-tab-panel')).toContainText(E2E_DUAL_RELAY_URLS[0]);
    await expect(bob.page.locator('.profile-tab-panel')).toContainText(E2E_DUAL_RELAY_URLS[1]);

    await updateStoredContactRelays(bob.page, groupPublicKey, []);
    await bob.page.goto('/#/chats');
    await openGroupContact(bob.page, groupPublicKey);
    await openProfileRelaysSection(bob.page);
    await expect(bob.page.getByText('No relays configured.', { exact: true })).toBeVisible();

    await bob.page.getByTestId('contact-profile-refresh-button').click();
    await openProfileRelaysSection(bob.page);
    await expect(bob.page.locator('.profile-tab-panel')).toContainText(E2E_DUAL_RELAY_URLS[0]);
    await expect(bob.page.locator('.profile-tab-panel')).toContainText(E2E_DUAL_RELAY_URLS[1]);
    await expectNoUnexpectedBrowserErrors([alice, bob]);
  } finally {
    await disposeUsers(alice, bob);
  }
});

test('group relay changes still deliver after both members restart on the updated relay set', async ({
  browser,
}) => {
  let alice = await bootstrapUser(browser, TEST_ACCOUNTS.groupRelayAlice, {
    relayUrls: E2E_DUAL_RELAY_URLS,
  });
  let bob = await bootstrapUser(browser, TEST_ACCOUNTS.groupRelayBob, {
    relayUrls: E2E_DUAL_RELAY_URLS,
  });

  try {
    const groupPublicKey = await createGroup(alice.page, {
      name: `Relay Switch Group ${Date.now()}`,
      about: 'Group relay propagation coverage',
    });
    const postRelayChangeMessage = `after-relay-change-${Date.now()}`;

    await addGroupMemberAndPublish(alice.page, bob.session.publicKey);
    await openRequests(bob.page);
    await expect(bob.page.getByTestId('chat-request-item')).toContainText('Group invitation');
    await acceptFirstRequest(bob.page);

    await openGroupContact(alice.page, groupPublicKey);
    await openGroupRelaysTab(alice.page);
    await expect(alice.page.locator('.profile-group-relays')).toContainText(E2E_DUAL_RELAY_URLS[0]);
    await expect(alice.page.locator('.profile-group-relays')).toContainText(E2E_DUAL_RELAY_URLS[1]);
    await removeGroupRelayAndPublish(alice.page, E2E_DUAL_RELAY_URLS[0]);

    await disposeUsers(alice, bob);
    alice = await bootstrapUser(browser, TEST_ACCOUNTS.groupRelayAlice, {
      relayUrls: E2E_DUAL_RELAY_URLS,
    });
    bob = await bootstrapUser(browser, TEST_ACCOUNTS.groupRelayBob, {
      relayUrls: E2E_DUAL_RELAY_URLS,
    });

    await navigateToChat(alice.page, groupPublicKey);
    await sendMessage(alice.page, postRelayChangeMessage, {
      chatId: groupPublicKey,
    });
    await navigateToChat(bob.page, groupPublicKey);
    await waitForThreadMessage(bob.page, postRelayChangeMessage, {
      chatId: groupPublicKey,
    });
    await expectNoUnexpectedBrowserErrors([alice, bob]);
  } finally {
    await disposeUsers(alice, bob);
  }
});
