import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test';

export interface TestAccount {
  privateKey: string;
  displayName: string;
}

export interface BootstrappedUser {
  account: TestAccount;
  context: BrowserContext;
  page: Page;
  session: {
    publicKey: string;
    npub: string | null;
    relayUrls: string[];
  };
}

export const E2E_RELAY_URL = process.env.E2E_RELAY_URL ?? 'ws://127.0.0.1:7000';

export const TEST_ACCOUNTS = {
  requestAlice: {
    privateKey: 'e0e3310b05ea1dd89ed2ce5bfaf1fdb95a646e45d5812e670c3fa4e98b2f3d47',
    displayName: 'Alice Request'
  },
  requestBob: {
    privateKey: 'c61c6cde623a6acd20f6b4f6e9c6d707226b16e3704d162dd9f79ad996031f25',
    displayName: 'Bob Request'
  },
  actionsAlice: {
    privateKey: '995653b67023e74f41c7b293af1acb99c785b0bf1a727ab457ce92a4142b9956',
    displayName: 'Alice Actions'
  },
  actionsBob: {
    privateKey: 'c25694028321c053f174245104441935f681ce5117a89b27e4263e4360d05433',
    displayName: 'Bob Actions'
  },
  groupAlice: {
    privateKey: 'eeb0542ecef525deee036b1865dc872bcda25df86016403ef25a730f330115b2',
    displayName: 'Alice Group'
  },
  groupBob: {
    privateKey: '31eecc51589b4de8f72f07b36cd888c95f339e1caf4f868f88c8ab8cf9f69587',
    displayName: 'Bob Group'
  },
  groupCharlie: {
    privateKey: '55a9153bb5fc61f56063c7984c7e5cdc29aaf157c294a1f495de673b4b74b07f',
    displayName: 'Charlie Group'
  }
} as const;

function composerInput(page: Page) {
  return page.getByPlaceholder('Write a message');
}

function contactLookupIdentifierInput(page: Page) {
  return page.getByLabel('Identifier or Public key');
}

function contactLookupGivenNameInput(page: Page) {
  return page.getByLabel('Given Name');
}

export function threadMessage(page: Page, text: string) {
  return page.locator('.thread-message-entry').filter({ hasText: text }).last();
}

export async function bootstrapUser(
  browser: Browser,
  account: TestAccount
): Promise<BootstrappedUser> {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('/#/login');
  await page.waitForFunction(() => Boolean(window.__appE2E__));

  const session = await page.evaluate(
    async ({ privateKey, relayUrls }) => {
      const bridge = window.__appE2E__;
      if (!bridge) {
        throw new Error('E2E bridge is not available.');
      }

      return bridge.bootstrapSession({
        privateKey,
        relayUrls
      });
    },
    {
      privateKey: account.privateKey,
      relayUrls: [E2E_RELAY_URL]
    }
  );

  await page.goto('/#/chats');
  await expect(page.getByTestId('start-new-chat-button')).toBeVisible();

  return {
    account,
    context,
    page,
    session
  };
}

export async function disposeUsers(...users: BootstrappedUser[]): Promise<void> {
  await Promise.all(
    users.map(async (user) => {
      try {
        await user.context.close();
      } catch {
        // Playwright may already have closed the context after a timeout.
      }
    })
  );
}

export async function refreshSession(page: Page, chatId?: string): Promise<void> {
  await page.evaluate(async ({ nextChatId }) => {
    const bridge = window.__appE2E__;
    if (!bridge) {
      throw new Error('E2E bridge is not available.');
    }

    await bridge.refreshSession({
      chatId: nextChatId
    });
  }, { nextChatId: chatId ?? null });
}

export async function openDirectChatFromIdentifier(
  page: Page,
  identifier: string,
  givenName: string
): Promise<void> {
  await page.getByTestId('start-new-chat-button').click();
  await page.getByTestId('start-new-chat-menu-item').click();
  await expect(contactLookupIdentifierInput(page)).toBeVisible();
  await contactLookupIdentifierInput(page).fill(identifier);
  await contactLookupGivenNameInput(page).fill(givenName);
  await page.getByTestId('contact-lookup-submit').click();
  await page.waitForURL(new RegExp(`#\\/chats\\/${identifier}$`));
  await expect(composerInput(page)).toBeVisible();
}

export async function createGroup(
  page: Page,
  options: {
    name: string;
    about: string;
  }
): Promise<string> {
  await page.getByTestId('start-new-chat-button').click();
  await page.getByTestId('start-new-group-menu-item').click();
  await expect(page.getByTestId('create-group-dialog')).toBeVisible();
  await page.getByLabel('Name', { exact: true }).fill(options.name);
  await page.getByLabel('About', { exact: true }).fill(options.about);
  await page.getByRole('button', { name: 'OK', exact: true }).click();
  await page.waitForURL(/#\/contacts\/([0-9a-f]{64})/, { timeout: 20_000 });

  const match = page.url().match(/#\/contacts\/([0-9a-f]{64})/);
  if (!match?.[1]) {
    throw new Error('Failed to read the created group public key from the URL.');
  }

  return match[1];
}

export async function acceptAppRelayFallbackIfVisible(page: Page): Promise<boolean> {
  try {
    await page.getByText('Use App Relays', { exact: true }).waitFor({
      state: 'visible',
      timeout: 1_500
    });
  } catch {
    return false;
  }

  await page.getByText('Remember this', { exact: true }).click();
  await page.getByRole('button', { name: 'Yes' }).click();
  return true;
}

export async function waitForThreadMessage(
  page: Page,
  text: string,
  options: {
    chatId?: string;
  } = {}
): Promise<void> {
  const message = threadMessage(page, text);

  try {
    await expect(message).toBeVisible({ timeout: 12_000 });
    return;
  } catch {
    await refreshSession(page, options.chatId);
  }

  await expect(message).toBeVisible({ timeout: 12_000 });
}

export async function sendMessage(
  page: Page,
  text: string,
  options: {
    chatId?: string;
  } = {}
): Promise<void> {
  await expect(composerInput(page)).toBeVisible();
  await composerInput(page).fill(text);
  await page.getByTestId('message-composer-send').click();
  await acceptAppRelayFallbackIfVisible(page);
  await waitForThreadMessage(page, text, options);
}

export async function openRequests(page: Page): Promise<void> {
  const requestItem = page.getByTestId('chat-request-item');
  await page.goto('/#/chats/requests');

  try {
    await expect(requestItem).toBeVisible({ timeout: 12_000 });
  } catch {
    await refreshSession(page);
    await page.goto('/#/chats/requests');
  }

  await expect(requestItem).toBeVisible({ timeout: 12_000 });
}

export async function acceptFirstRequest(page: Page): Promise<void> {
  await page.getByTestId('chat-request-accept-button').first().click();
  await expect(page.getByTestId('chat-request-item')).toHaveCount(0);
}

export async function navigateToChat(page: Page, publicKey: string): Promise<void> {
  await page.goto(`/#/chats/${publicKey}`);
  await expect(composerInput(page)).toBeVisible();
}

export async function reactToMessage(
  page: Page,
  text: string,
  reactionLabel = 'thumbs up'
): Promise<void> {
  await threadMessage(page, text).locator('.bubble').click();
  await page.getByLabel(`React with ${reactionLabel}`).click();
  await acceptAppRelayFallbackIfVisible(page);
}

export async function waitForReaction(
  page: Page,
  reactionLabel: RegExp,
  options: {
    chatId?: string;
  } = {}
): Promise<void> {
  const reaction = page.getByLabel(reactionLabel).first();

  try {
    await expect(reaction).toBeVisible({ timeout: 12_000 });
    return;
  } catch {
    await refreshSession(page, options.chatId);
  }

  await expect(reaction).toBeVisible({ timeout: 12_000 });
}

export async function deleteMessage(page: Page, text: string): Promise<void> {
  await threadMessage(page, text).locator('.bubble').click();
  await page.getByText('Delete', { exact: true }).click();
}

export async function waitForDeletedMessageState(
  page: Page,
  text: string,
  options: {
    chatId?: string;
  } = {}
): Promise<void> {
  await waitForThreadMessage(page, text, options);
  await threadMessage(page, text).locator('.bubble').click();
  await expect(page.getByText('View Deleted Message', { exact: true })).toBeVisible({
    timeout: 12_000
  });
  await page.keyboard.press('Escape');
}

export async function logoutFromSettings(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByText('Log Out', { exact: true }).click();
  await page.getByRole('button', { name: 'Log Out', exact: true }).click();
  await expect
    .poll(() => page.url(), { timeout: 30_000 })
    .toMatch(/#\/(auth|login)/);
  await expect(page.getByText('Welcome')).toBeVisible({ timeout: 30_000 });
}

export async function addGroupMemberAndPublish(
  page: Page,
  memberPublicKey: string
): Promise<void> {
  await page.getByTestId('contact-profile-members-tab').click();
  const memberInput = page.getByLabel('Member', { exact: true });
  await expect(memberInput).toBeVisible();
  await memberInput.fill(memberPublicKey);
  await page.getByTestId('group-member-add-button').click();
  await expect(page.getByText('You must publish these changes for them to take effect')).toBeVisible();
  await page.getByTestId('group-members-publish-button').click();
  await expect(page.getByText('You must publish these changes for them to take effect')).toHaveCount(0);
  await expect(page.getByText(memberPublicKey.slice(0, 32))).toBeVisible();
}

export async function establishAcceptedDirectChat(
  sender: BootstrappedUser,
  recipient: BootstrappedUser
): Promise<void> {
  const openingMessage = `acceptance-open-${Date.now()}`;
  const replyMessage = `acceptance-reply-${Date.now()}`;

  await openDirectChatFromIdentifier(
    sender.page,
    recipient.session.publicKey,
    recipient.account.displayName
  );
  await sendMessage(sender.page, openingMessage, {
    chatId: recipient.session.publicKey
  });
  await openRequests(recipient.page);
  await acceptFirstRequest(recipient.page);
  await navigateToChat(recipient.page, sender.session.publicKey);
  await sendMessage(recipient.page, replyMessage, {
    chatId: sender.session.publicKey
  });
  await waitForThreadMessage(sender.page, replyMessage, {
    chatId: recipient.session.publicKey
  });
}
