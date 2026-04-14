import { expect, test } from '@playwright/test';
import {
  bootstrapUser,
  disposeUsers,
  establishAcceptedDirectChat,
  expectNoUnexpectedBrowserErrors,
  publishOwnProfile,
  TEST_ACCOUNTS,
} from './helpers';

test.describe.configure({ mode: 'serial' });

test('contact refresh pulls newly published remote profile metadata into an existing contact', async ({
  browser,
}) => {
  const alice = await bootstrapUser(browser, TEST_ACCOUNTS.profileRefreshAlice);
  const bob = await bootstrapUser(browser, TEST_ACCOUNTS.profileRefreshBob);

  try {
    const refreshedName = `Bob Refreshed ${Date.now()}`;
    const refreshedAbout = `About refreshed ${Date.now()}`;

    await establishAcceptedDirectChat(alice, bob);
    await publishOwnProfile(bob.page, {
      name: refreshedName,
      about: refreshedAbout,
    });

    await alice.page.goto(`/#/contacts/${bob.session.publicKey}`);
    await expect(alice.page.getByTestId('contact-profile-refresh-button')).toBeVisible();
    await alice.page.getByTestId('contact-profile-refresh-button').click();
    await expect(alice.page.getByPlaceholder('Your profile name').first()).toHaveValue(
      refreshedName,
      {
        timeout: 12_000,
      }
    );
    await expect(alice.page.getByPlaceholder('Short bio').first()).toHaveValue(refreshedAbout, {
      timeout: 12_000,
    });
    await expectNoUnexpectedBrowserErrors([alice, bob]);
  } finally {
    await disposeUsers(alice, bob);
  }
});
