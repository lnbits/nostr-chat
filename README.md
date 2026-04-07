# Nostr chat

Chat app for nostr.

## Features

- Left chat list with avatar, last message preview, unread badge
- Main chat thread with sent/received rounded bubbles
- Message composer with send button
- Pinia stores: `chatStore` and `messageStore`
- Local mock data for chats/messages
- Chat selection updates thread
- Sending messages appends to current chat
- Auto-scrolls to latest message
- Responsive behavior:
  - Desktop: sidebar + thread side by side
  - Mobile: route-based navigation (`/` list, `/chat/:chatId` thread)
- Bonus:
  - Dark mode toggle
  - Search input placeholder (no filtering logic yet)

## Run

Node.js 18+ is recommended for current Quasar + `@quasar/app-vite`.

1. Install dependencies:

```bash
npm install
```

2. Start dev server:

```bash
npm run dev
```

This runs `quasar dev` via the npm script.

## End-to-end tests

Core DM e2e coverage uses Playwright plus a local `nostr-rs-relay` Docker container.

Run the suite locally:

```bash
npm run test:e2e:local
```

This resets the relay volume before and after the run so each local run starts clean.
Playwright now keeps traces, screenshots, and video for passing runs too. You can inspect them in `test-results/` and open the HTML summary from `playwright-report/`.

## Project Structure

```text
index.html
package.json
quasar.config.ts
tsconfig.json
src/
  components/
    ChatItem.vue
    ChatList.vue
    ChatThread.vue
    MessageBubble.vue
    MessageComposer.vue
  data/
    mockData.ts
  layouts/
    MainLayout.vue
  pages/
    IndexPage.vue
    ChatPage.vue
    ErrorNotFound.vue
  router/
    index.ts
    routes.ts
  stores/
    index.ts
    chatStore.ts
    messageStore.ts
  types/
    chat.ts
  css/
    app.css
  App.vue
```
