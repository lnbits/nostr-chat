prompt


My Relays (NIP-65)



confety emoji

@someUser
 - more clear membership management in group chats


- search with @name (for groups)
- fix search for chats&contacts (search for all fields: name, about, given name, npub, pubkey hex)
- notificatinos request on desktop app
- refresh history with date range
- Pin message support.
- For group chat threads for relay-status details (on the dialog) also show the epoch it sent to

- it seams that the relays of a group are lost from time to time, what can be the reason
  when adding a member to the group sometimes the relay list for the group becomes empty
- dialogs on mobile at the bottom, Dialogs on desktop at the top
- check events that were never sent and try to re-send them

- relay status for all publishing actions
  In the Gropu > Members show the updating relays status bar for each member (pulsing when it is sending) slowly filling up to be green or read.
- download as mobile app -> settings tab add an install ico

- Add i18n to this app. Extract all labels that are visible in the UI and create translation file for them.
  Based on the extracted file make translation files for the top 20 languages.
  In Settings > Languages add a language selector.

- Add `Edit` option for a message. The UX is the same as for telegram.

- The app should work offline, load all UI components at start-up.

- when refreshing a users's profile also use the app relays (the user might not have relays)
- make .md from the rules in this app
- file messages


on group restore set members the latest epoch sent invitations
- better nip51 here

- group private key is now saved as NIP78, this data structure must be standardizd so other apps can use it easily



add e2e tests for adding a contact, fetching the profile, relays and other data for that contact. Then the contact changes its data (the loggedn in user should receive the updates immediately)


After accepting a Contact request  if the request count is zero then hide the `Requests (0)` from the chat list items.

testing -> more ports


npm run test:e2e:local


When the app runs in the browser show the unread count badge in the tab title with the number of unread chats
