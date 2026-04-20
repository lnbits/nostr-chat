# nostr-scroll — Codex Implementation Spec

## 1. Project Goal

Build a frontend-only Twitter/X-style social client called **`nostr-scroll`** using **Quasar + Vue 3** with **mocked Nostr-shaped data** and a **mocked nostr-auth login flow**.

The app should visually and behaviorally feel **very close to X/Twitter**, while only implementing the following information architecture:

* **Left column**: `Home`, `Bookmarks`, `Profile`
* **Middle column**: the main X-like experience

  * timeline
  * post composer
  * post cards
  * reply thread view
  * profile header
  * profile tabs
  * interactions: replies, likes, reposts, bookmarks
* **Right column**: `Today's News` only

This is a **mocked frontend prototype**, not a production Nostr client.

---

## 2. Scope

### In scope

* Quasar SPA using Vue 3 Composition API
* Dark & Light modes
* Responsive behavior for desktop and mobile
* Mocked login via `nostr-auth`
* Mocked Nostr-shaped entities and local state
* Pages:

  * Login
  * Home
  * Bookmarks
  * Profile
  * Post Detail
* X-like interaction patterns:

  * sticky top bar
  * composer
  * feed cards
  * counters
  * hover/press states
  * tabs
  * infinite-scroll-like loading behavior (mocked)
  * local optimistic updates
* Static `Today's News` panel on desktop
* Mobile bottom nav

### Out of scope

* Real Nostr relay connections
* Real nostr-auth protocol integration
* Real backend/API
* Notifications
* Search
* Messaging
* Settings
* Media upload persistence
* Real pagination from a server
* SSR
* Accessibility audits beyond sensible defaults

---

## 3. Product Principles

1. **Feels like X immediately**

   * Familiar column layout, spacing, tabs, interaction affordances.

2. **Nostr-shaped underneath**

   * Mocked models should resemble Nostr concepts so a future real integration is easier.

3. **Frontend-first and codex-friendly**

   * Clear component boundaries, predictable mock store, simple routes.

4. **Responsive by design**

   * Desktop uses three columns.
   * Mobile collapses to a single-column experience with bottom navigation.

---

## 4. Stack

* **Framework**: Vue 3
* **UI**: Quasar
* **Language**: TypeScript preferred
* **Routing**: Vue Router
* **State**: Pinia
* **Mock data**: local TS modules / JSON-like fixtures
* **Icons**: Quasar icon set or Material Symbols

### Required implementation style

* Use **Composition API**
* Use **`<script setup lang="ts">`**
* Prefer small reusable presentational components
* Keep business logic in Pinia stores/composables
* Avoid over-engineering

---

## 5. Visual Direction

The UI should be **very close to X** without using X branding assets.

### Theme

* Dark mode only
* Backgrounds should follow an X-like dark palette:

  * app background: near-black / very dark gray
  * main surfaces: slightly lighter dark tones
  * borders: subtle thin separators
  * primary accent: blue-like action color
  * muted text: gray hierarchy

### Visual characteristics

* Clean, dense feed layout
* Rounded pills for tabs/buttons where appropriate
* Thin dividers between feed items
* Sticky top areas in main column
* Large readable display name + muted metadata
* Hover states on desktop, pressed states on mobile
* Icon-first action row under posts
* Familiar profile header composition

### Do not include

* Loud gradients
* Glassmorphism
* Card-heavy redesign
* Rounded giant containers for every item
* Any style that makes it feel unlike X

---

## 6. App Shell Layout

## Desktop / tablet

Use a 3-column shell centered horizontally.

### Left column

Fixed-width navigation rail containing only:

* Home
* Bookmarks
* Profile

Desktop behavior:

* icon + label buttons
* active route highlighted
* profile mini-card at bottom optional but not required

### Middle column

Primary content column with fixed max width similar to X timeline.

This area changes by route:

* Home timeline
* Bookmarks timeline
* Profile page
* Post detail thread page

### Right column

Single widget area containing:

* `Today's News`

Static mocked list only.

## Mobile

* Left and right columns disappear
* Main content becomes full width
* Navigation moves to bottom tab bar with:

  * Home
  * Bookmarks
  * Profile
* Top bar remains sticky
* `Today's News` is hidden on mobile

---

## 7. Routes

Implement these routes only:

* `/login`
* `/home`
* `/bookmarks`
* `/profile/:pubkey?`
* `/post/:id`
* `/` should redirect:

  * to `/home` when authenticated
  * to `/login` when unauthenticated

### Route assumptions

* `profile/:pubkey?`

  * if param missing, show currently logged-in user profile
  * if param present, show that user from mocked dataset
* post cards should navigate to `/post/:id` when body/header clicked
* navigation state must persist during mock session

---

## 8. Pages

## 8.1 Login Page

### Purpose

Mock entry into the app using `nostr-auth`.

### Layout

* centered login box on dark background
* app name: `nostr-scroll`
* short description: X-style Nostr client prototype
* one primary button: `Continue with nostr-auth`
* optional tiny helper text: mocked login only

### Behavior

* Clicking button simulates auth delay (300–900ms)
* Then marks session authenticated
* Sets current user from mock data
* Redirects to `/home`

### Mock auth states

* idle
* loading
* success

### No username/password fields

---

## 8.2 Home Page

### Purpose

Main timeline like X home feed.

### Layout

Middle column contains:

1. Sticky top bar with title `Home`
2. Composer
3. Feed list of posts
4. Mock infinite loading trigger at bottom

### Behavior

* Posts sorted by created time descending
* Feed includes original posts and reposted items in X-like style
* Clicking a post opens post detail
* Clicking avatar/display name opens profile
* Interaction buttons update local state optimistically
* Composer can create a new top-level post

---

## 8.3 Bookmarks Page

### Purpose

Show posts the current user bookmarked.

### Layout

Same shell as Home:

1. Sticky top bar with title `Bookmarks`
2. Feed list filtered to bookmarked posts

### Behavior

* Unbookmarking removes item from list immediately
* Empty state shown if no bookmarks exist

### Empty state copy

* Title: `Save posts for later`
* Subtitle: `Bookmark interesting notes to find them here.`

---

## 8.4 Profile Page

### Purpose

Show X-like profile experience.

### Layout sections

1. Sticky top bar with back button + profile name + post count
2. Profile header banner
3. Avatar overlapping banner
4. Display name, handle-like text, bio, metadata
5. Stats row: following / followers
6. Action area

   * if current user: `Edit profile` button placeholder
   * if not current user: optional `Follow` button can be omitted from logic, but UI may exist as disabled placeholder
7. Profile tabs:

   * Posts
   * Replies
   * Likes
   * Reposts
8. Feed content for selected tab

### Behavior

* Tabs switch content without route change unless Codex prefers query param like `?tab=likes`
* Current user profile accessible via left nav and mobile nav
* Clicking posts goes to post detail

### Current user profile default

Use current authenticated mock user.

---

## 8.5 Post Detail Page

### Purpose

Show a single post with conversation context like X detail view.

### Layout

1. Sticky top bar with back button and title `Post`
2. Optional ancestor thread items above focused post
3. Focused post shown in expanded style
4. Action row with counts
5. Reply composer
6. Replies list below in chronological or relevance-like mocked order

### Behavior

* Clicking reply submits a reply under the focused post
* Like/repost/bookmark work from detail view too
* Changes should stay in sync with feed and profile views
* Reply count increments immediately

---

## 9. Core Components

Codex should create these reusable components.

## 9.1 Layout Components

### `AppShell.vue`

Responsible for responsive 3-column / mobile 1-column shell.

### `LeftSidebar.vue`

Contains:

* logo / wordmark area
* nav items: Home, Bookmarks, Profile

### `MobileBottomNav.vue`

Contains bottom tab navigation.

### `RightNewsPanel.vue`

Static `Today's News` list.

### `StickyTopBar.vue`

Reusable top header for middle column pages.

---

## 9.2 Feed Components

### `PostComposer.vue`

Features:

* current user avatar
* multiline text area
* character count optional
* post button
* disabled state when empty
* emits submit event

### `FeedList.vue`

Renders list of post items and loading state.

### `PostCard.vue`

X-like post card.

Sub-elements:

* avatar
* display name
* handle-like identifier
* timestamp
* optional repost context label
* post text content
* optional media preview placeholder
* action row

### `PostActionBar.vue`

Buttons:

* reply
* repost
* like
* bookmark
* optional share icon (UI only, no logic required)

### `EmptyState.vue`

Reusable empty states.

---

## 9.3 Profile Components

### `ProfileHeader.vue`

Contains banner, avatar, names, bio, metadata, stats, action button.

### `ProfileTabs.vue`

Tabs for Posts / Replies / Likes / Reposts.

---

## 9.4 Post Detail Components

### `ThreadView.vue`

Renders ancestor chain + focused post + replies.

### `ReplyComposer.vue`

Variant of composer for replies.

---

## 10. Nostr-Shaped Mock Data Model

Use data structures that resemble Nostr enough to support future migration.

## 10.1 User / Profile

```ts
export interface NostrProfile {
  pubkey: string
  name: string
  displayName: string
  about: string
  picture: string
  banner: string
  nip05?: string
  website?: string
  lud16?: string
  followersCount: number
  followingCount: number
  joinedAt: string
  location?: string
}
```

Notes:

* `pubkey` is the main user identifier
* `name` can behave like handle text
* `displayName` is the bold visible name

## 10.2 Post / Note Event

```ts
export interface NostrNote {
  id: string
  pubkey: string
  kind: 1 | 6
  createdAt: string
  content: string
  tags: string[][]
  replyTo?: string | null
  rootId?: string | null
  repostOf?: string | null
  quotedNoteId?: string | null
  stats: {
    replies: number
    reposts: number
    likes: number
    bookmarks: number
    views?: number
  }
}
```

Notes:

* `kind: 1` = note/post
* `kind: 6` = repost event equivalent in mock model
* `replyTo` points to direct parent note
* `rootId` points to conversation root
* `repostOf` used when this note is a repost wrapper

## 10.3 Viewer State

```ts
export interface ViewerPostState {
  liked: boolean
  reposted: boolean
  bookmarked: boolean
}
```

Store per post per current user.

## 10.4 Auth Session

```ts
export interface MockAuthSession {
  isAuthenticated: boolean
  method: 'nostr-auth'
  currentPubkey: string | null
}
```

## 10.5 News Item

```ts
export interface NewsItem {
  id: string
  category: string
  headline: string
  source: string
  timeLabel: string
}
```

---

## 11. Mock Dataset Requirements

Create enough mock data so the app feels real.

### Minimum dataset

* 8–12 profiles
* 40–60 posts total
* 8–15 replies across several threads
* 5–10 repost events
* 6–10 bookmarked posts for current user
* 5–7 news items

### Data realism requirements

* Mixed post lengths
* Some posts are one-liners
* Some are multi-line longer thoughts
* Some posts are replies
* Some have high counts, some have low counts
* Some are authored by current user
* Some posts are reposted by current user
* Some are liked by current user
* Some are bookmarked by current user
* At least one profile with substantial post history to make tabs meaningful

### Media

Media can be represented as optional placeholders only.
No real upload pipeline required.

---

## 12. State Management

Use **Pinia**.

## 12.1 Suggested stores

### `useAuthStore`

Responsibilities:

* mock login/logout
* auth loading state
* current user pubkey
* route guard helper

Suggested state:

```ts
{
  session: MockAuthSession,
  loading: boolean
}
```

Actions:

* `loginWithNostrAuth()`
* `logout()`
* `restoreSession()`

Persistence:

* persist to localStorage

### `useProfilesStore`

Responsibilities:

* expose profiles map/list
* get profile by pubkey

### `useFeedStore`

Responsibilities:

* all notes
* viewer state per note
* timeline selectors
* post creation
* replies
* interaction toggles
* mock load-more behavior

Suggested actions:

* `getHomeTimeline()`
* `getBookmarksTimeline()`
* `getProfilePosts(pubkey)`
* `getProfileReplies(pubkey)`
* `getProfileLikes(pubkey)`
* `getProfileReposts(pubkey)`
* `getPostById(id)`
* `getRepliesForPost(id)`
* `getThreadAncestors(id)`
* `createPost(content)`
* `replyToPost(parentId, content)`
* `toggleLike(postId)`
* `toggleRepost(postId)`
* `toggleBookmark(postId)`
* `loadMoreHome()`

### `useUiStore`

Responsibilities:

* active profile tab
* transient toasts/snackbars if desired
* drawer state if Codex uses mobile drawer patterns

---

## 13. Local Persistence

Persist enough state in `localStorage` so refreshing keeps the illusion of a real app.

Persist:

* auth session
* created posts
* replies
* liked/reposted/bookmarked state
* maybe merged note dataset if Codex chooses store hydration

Do not persist:

* temporary loading flags
* view-only ephemeral UI state

---

## 14. Interaction Requirements

## 14.1 Post creation

When user submits a post:

* create a new note authored by current user
* insert at top of Home timeline
* show immediately on current user profile Posts tab
* initialize stats to zero
* clear composer

## 14.2 Reply

When user replies from detail page:

* create new reply note
* set `replyTo` to focused post id
* set `rootId` appropriately
* increment parent reply count
* add reply into replies list immediately
* include on current user profile Replies tab

## 14.3 Like / Unlike

* Toggle viewer state
* Increment/decrement visible like count
* Reflect change across all views

## 14.4 Repost / Undo repost

* Toggle viewer state
* Increment/decrement repost count
* Reposts tab should reflect current user reposts
* Home timeline may show reposted context if current user reposts something

### Simplification allowed

Codex may implement repost as viewer-state-only plus profile tab visibility, without creating a second persisted repost wrapper event for the current user. But the mock base dataset should still include some repost-style events so the feed looks authentic.

## 14.5 Bookmark / Remove bookmark

* Toggle viewer state
* Bookmarks page updates immediately
* Bookmark count may be visible internally or omitted from UI if X-like parity suggests hiding it on cards; however store should still track it

## 14.6 Infinite scroll-like loading

Home feed should initially show a subset, e.g. 15 items.

As user scrolls near bottom:

* simulate loading delay
* append next batch
* stop when exhausted

Can use Quasar infinite scroll component or manual observer.

---

## 15. Desktop Responsiveness Requirements

### Breakpoints

Codex may use Quasar breakpoints, but behavior must be roughly:

* **Desktop**: three columns visible
* **Tablet**: left + middle visible, right may remain if space allows or hide first
* **Mobile**: middle only + bottom nav

### Desktop expectations

* Left nav stays visible
* Middle column centered and readable
* Right news panel visible on sufficiently wide screens
* Sticky top bars work correctly

### Tablet expectations

* Reduce side spacing
* Hide right news first if needed
* Keep left nav accessible

---

## 16. Mobile UX Requirements

### Structure

* Single scrollable content column
* Sticky top bar
* Bottom nav fixed

### Rules

* Hide right news
* Hide left desktop sidebar
* Keep composer usable
* Tabs scroll horizontally if necessary
* Post action icons remain tappable and spaced
* Avatar/name/post tap targets must be comfortable

### Mobile nav items

* Home
* Bookmarks
* Profile

Use icon-only or icon with minimal label per Quasar pattern, but must match the user's decision: **icon-only bottom nav on mobile**.

---

## 17. Detailed UI Behavior

## 17.1 Top bars

Each main route should have a sticky top bar.

Examples:

* Home: `Home`
* Bookmarks: `Bookmarks`
* Profile: back arrow + profile name + post count
* Post: back arrow + `Post`

Use subtle translucent/dark surface behavior if desired.

## 17.2 Post cards

Each post card should support:

* clicking body/header navigates to detail
* clicking avatar/name navigates to profile
* clicking action icons does not trigger card navigation
* long content wraps naturally
* metadata row uses muted text

## 17.3 Tabs

Profile tabs should feel like X:

* evenly distributed or horizontally scrollable
* active tab underlined/highlighted
* inactive tabs muted
* hover/press states

## 17.4 News panel

Title: `Today's News`

Simple static list, each item showing:

* category
* headline
* source/time small line

No click behavior required, but hover styling optional.

---

## 18. Suggested Folder Structure

```text
src/
  assets/
  boot/
  components/
    layout/
      AppShell.vue
      LeftSidebar.vue
      MobileBottomNav.vue
      RightNewsPanel.vue
      StickyTopBar.vue
    feed/
      FeedList.vue
      PostCard.vue
      PostActionBar.vue
      PostComposer.vue
      ReplyComposer.vue
      EmptyState.vue
    profile/
      ProfileHeader.vue
      ProfileTabs.vue
    thread/
      ThreadView.vue
  composables/
    useFormatters.ts
    useMockDelay.ts
  data/
    mockProfiles.ts
    mockNotes.ts
    mockNews.ts
  layouts/
    MainLayout.vue
    AuthLayout.vue
  pages/
    LoginPage.vue
    HomePage.vue
    BookmarksPage.vue
    ProfilePage.vue
    PostDetailPage.vue
  router/
    index.ts
    routes.ts
  stores/
    auth.ts
    profiles.ts
    feed.ts
    ui.ts
  types/
    nostr.ts
    news.ts
    auth.ts
  utils/
    dates.ts
    ids.ts
    storage.ts
  App.vue
  main.ts
```

---

## 19. Router and Guards

Implement a simple auth guard.

### Rules

* Unauthenticated users can only access `/login`
* Authenticated users visiting `/login` redirect to `/home`
* Protected routes:

  * `/home`
  * `/bookmarks`
  * `/profile/:pubkey?`
  * `/post/:id`

### Session restore

On app boot, restore auth session from localStorage.

---

## 20. Mock API Boundary

Even though there is no real backend, structure the app so real APIs can replace mock implementations later.

Create a lightweight service layer or mock repository interface.

Example modules:

* `services/mockAuthService.ts`
* `services/mockFeedService.ts`
* `services/mockProfileService.ts`

Responsibilities:

* return promises
* simulate latency
* keep stores from directly depending on raw fixtures too much

This will make Codex’s implementation easier to evolve.

---

## 21. Suggested Utilities

### Formatting helpers

* relative time formatter (`2m`, `1h`, `Apr 8`)
* compact count formatter (`1.2K`, `48K`)
* name/identifier helpers for profile metadata

### ID generation

* simple deterministic or random string for new notes

### Mock delay

* helper to await short artificial latency

---

## 22. Sample Acceptance Criteria

## 22.1 Auth

* App opens on `/login` when not authenticated
* Clicking `Continue with nostr-auth` logs in through mocked flow
* Refresh preserves authenticated session

## 22.2 Home

* Home shows sticky top bar, composer, and feed
* Feed visually resembles X dark timeline layout
* New post appears immediately at top
* Load-more appends more posts

## 22.3 Bookmarks

* Bookmarks page shows only bookmarked posts
* Removing bookmark updates list instantly
* Empty state renders correctly when none remain

## 22.4 Profile

* Profile header shows banner, avatar, names, bio, metadata, counts
* Tabs switch among Posts / Replies / Likes / Reposts
* Content in each tab reflects local state correctly

## 22.5 Post Detail

* Clicking a post opens detail route
* Detail shows focused post and replies
* Replying updates reply count and reply list immediately

## 22.6 Responsiveness

* Desktop shows 3-column layout
* Mobile shows single column + bottom nav
* Right news panel hidden on mobile
* Navigation remains usable across breakpoints

---

## 23. Non-Functional Requirements

* Smooth enough interactions with no obvious jank
* Reusable components over page-specific duplication
* Reasonably clean TypeScript types
* No dead routes or placeholder pages outside agreed scope
* Avoid coupling layout logic directly to page internals

---

## 24. Implementation Notes for Codex

1. Start by scaffolding the Quasar app with router + Pinia + TypeScript.
2. Build the mocked auth flow first.
3. Build the responsive app shell.
4. Implement shared feed components.
5. Hydrate mocked profiles/notes/news.
6. Implement Home page selectors and interactions.
7. Reuse the same feed card for Bookmarks and Profile tabs.
8. Implement Post Detail last, using existing post/reply data.
9. Add localStorage persistence near the end.
10. Polish spacing, borders, hover states, sticky headers, and mobile nav to maximize the X-like feel.

---

## 25. Nice-to-Have Polishing (still mocked)

These are optional, but recommended if easy:

* Skeleton loading placeholders during auth/feed loading
* Smooth scroll restoration on route change
* Tiny toast/snackbar after bookmark/repost actions
* Simple media placeholder block in a few posts
* Faint repost context line such as `Alice reposted`
* Verified-like badge omitted unless stylistically necessary

---

## 26. Explicit Constraints Recap

Codex must honor all of the following:

* App name is **`nostr-scroll`**
* Frontend stack is **Quasar + Vue 3**
* Use **mocked data only**
* Use **mocked nostr-auth flow only**
* Dark mode only
* Support desktop and mobile
* Left side only: `Home`, `Bookmarks`, `Profile`
* Middle should be very close to X/Twitter in layout and interaction patterns
* Right side only: `Today's News`
* Only routes/pages:

  * Login
  * Home
  * Bookmarks
  * Profile
  * Post Detail
* Profile tabs must include:

  * Posts
  * Replies
  * Likes
  * Reposts
* Interactions must include:

  * create post
  * reply
  * like/unlike
  * repost/unrepost
  * bookmark/unbookmark
* Mobile must use icon-only bottom navigation

---

## 27. Final Deliverable Expectation

Codex should produce a runnable Quasar application that:

* launches without backend dependencies
* uses local mocked data and local state
* demonstrates the complete `nostr-scroll` UX
* is visually and behaviorally close to X
* is organized so real Nostr integration can replace mocks later

---

## 28. Implementation Checklist for Codex

Use this as the execution order.

### Phase 1 — Project setup

* Scaffold a Quasar SPA with Vue 3, TypeScript, Vue Router, and Pinia
* Enable dark-mode-only theme defaults
* Add app-level layout styles and global surface/border/text tokens
* Create route definitions for `/login`, `/home`, `/bookmarks`, `/profile/:pubkey?`, `/post/:id`, and `/`

### Phase 2 — Types and mock data

* Create TypeScript interfaces for auth session, profiles, notes, viewer state, and news items
* Add `mockProfiles.ts` with 8–12 realistic profiles
* Add `mockNotes.ts` with 40–60 notes including replies and repost-shaped items
* Add `mockNews.ts` with 5–7 static news entries
* Ensure at least one current-user profile has enough content for all tabs

### Phase 3 — Services and persistence

* Create mock services returning promises with short artificial delays
* Add localStorage helpers for auth/session and local interaction state
* Hydrate stores from localStorage on boot

### Phase 4 — Stores

* Implement `useAuthStore`
* Implement `useProfilesStore`
* Implement `useFeedStore`
* Implement `useUiStore`
* Add selectors for Home, Bookmarks, Profile Posts, Replies, Likes, Reposts, and Post Detail thread data

### Phase 5 — Routing and auth guard

* Add navigation guard for protected routes
* Restore session on app start
* Redirect unauthenticated users to `/login`
* Redirect authenticated users away from `/login` to `/home`

### Phase 6 — Layout shell

* Build `AppShell.vue`
* Build `LeftSidebar.vue`
* Build `MobileBottomNav.vue`
* Build `RightNewsPanel.vue`
* Build `StickyTopBar.vue`
* Verify desktop 3-column layout and mobile single-column layout

### Phase 7 — Feed UI

* Build `PostComposer.vue`
* Build `FeedList.vue`
* Build `PostCard.vue`
* Build `PostActionBar.vue`
* Build `EmptyState.vue`
* Match X-like spacing, dividers, icon placement, text hierarchy, and sticky header behavior

### Phase 8 — Pages

* Implement `LoginPage.vue`
* Implement `HomePage.vue`
* Implement `BookmarksPage.vue`
* Implement `ProfilePage.vue`
* Implement `PostDetailPage.vue`

### Phase 9 — Core interactions

* Create post
* Reply to post
* Toggle like/unlike
* Toggle repost/unrepost
* Toggle bookmark/unbookmark
* Ensure all views stay in sync after each action

### Phase 10 — Profile experience

* Build `ProfileHeader.vue`
* Build `ProfileTabs.vue`
* Implement Posts / Replies / Likes / Reposts tab filtering
* Support current-user profile and profile-by-pubkey route

### Phase 11 — Thread/detail experience

* Build `ThreadView.vue`
* Show ancestor context, focused note, and replies
* Add reply composer below focused post
* Keep counts synchronized with feed and profile views

### Phase 12 — Infinite loading and polish

* Show initial Home subset, then append batches on scroll
* Add loading states or skeletons if easy
* Fine-tune hover and tap states
* Validate sticky headers on each page
* Confirm mobile bottom nav works cleanly

### Phase 13 — Final QA

* Refresh preserves login and local interactions
* Desktop layout shows left nav, middle column, right news
* Mobile hides left/right columns and shows bottom nav
* Bookmarks empty state works
* Profile tabs behave correctly
* Post detail route works from all entry points
* App is runnable with no backend

---

## 29. Single Direct Prompt for Codex

Paste this directly into Codex:

> Build a runnable **Quasar + Vue 3 + TypeScript SPA** called **`nostr-scroll`** that is a **frontend-only X/Twitter-style clone** using **mocked data only**. The app must support **desktop and mobile** and use **dark mode only**. The login must be a **mocked `nostr-auth` flow** with a single login screen and no username/password fields.
>
> The desktop layout must have **3 vertical areas**:
>
> 1. **Left sidebar** with only `Home`, `Bookmarks`, and `Profile`
> 2. **Middle column** that feels very close to X/Twitter in both layout and interactions
> 3. **Right sidebar** with only a static mocked `Today's News` panel
>
> On **mobile**, hide the left and right sidebars and show a **single main column** with an **icon-only bottom navigation** containing `Home`, `Bookmarks`, and `Profile`.
>
> Implement only these routes/pages:
>
> * `/login`
> * `/home`
> * `/bookmarks`
> * `/profile/:pubkey?`
> * `/post/:id`
> * `/` redirects to `/home` if authenticated, otherwise `/login`
>
> Use **Pinia** for local mocked state and **Vue Router** for navigation. Use **Composition API** and **`<script setup lang="ts">`**. Organize the code cleanly with reusable components and a mock service/repository layer so real Nostr integration can replace the mocks later.
>
> The app should use **Nostr-shaped mock data**, including:
>
> * profiles identified by `pubkey`
> * note/post entities with fields like `id`, `pubkey`, `kind`, `createdAt`, `content`, `tags`, `replyTo`, `rootId`, `repostOf`, and stats
> * viewer-specific local state for liked/reposted/bookmarked
> * a mocked auth session using `method: 'nostr-auth'`
>
> Seed the app with realistic mock data:
>
> * 8–12 profiles
> * 40–60 posts
> * several replies and repost-shaped items
> * enough data for profile tabs and bookmarks to feel real
> * 5–7 static mocked news items for the right sidebar
>
> The **middle column** must be very close to X/Twitter and include:
>
> * sticky top bars
> * post composer
> * feed list
> * post cards with avatar, display name, handle-like metadata, timestamp, content, and action row
> * profile page with banner, overlapping avatar, name, bio, metadata, following/followers counts
> * profile tabs for **Posts**, **Replies**, **Likes**, and **Reposts**
> * post detail thread page with ancestor context, focused post, reply composer, and replies
> * mocked infinite-scroll-like loading on Home
>
> Implement these mocked interactions with optimistic local updates:
>
> * create post
> * reply to post
> * like/unlike
> * repost/unrepost
> * bookmark/unbookmark
>
> All interaction state must stay synchronized across Home, Bookmarks, Profile tabs, and Post Detail.
>
> The visual style must be **very close to X/Twitter** in dark mode:
>
> * near-black background
> * subtle borders/dividers
> * muted gray metadata text
> * blue-like primary action accent
> * sticky top bars
> * dense feed spacing
> * hover states on desktop and press states on mobile
> * avoid redesigning it into a card-heavy or flashy UI
>
> Build these reusable components at minimum:
>
> * `AppShell.vue`
> * `LeftSidebar.vue`
> * `MobileBottomNav.vue`
> * `RightNewsPanel.vue`
> * `StickyTopBar.vue`
> * `PostComposer.vue`
> * `FeedList.vue`
> * `PostCard.vue`
> * `PostActionBar.vue`
> * `EmptyState.vue`
> * `ProfileHeader.vue`
> * `ProfileTabs.vue`
> * `ThreadView.vue`
> * `ReplyComposer.vue`
>
> Suggested stores:
>
> * `useAuthStore`
> * `useProfilesStore`
> * `useFeedStore`
> * `useUiStore`
>
> Persist enough local state in `localStorage` so refresh preserves:
>
> * auth session
> * created posts/replies
> * like/repost/bookmark state
>
> Do not implement any real backend, relay, or real nostr-auth integration. Do not add extra pages like notifications, messages, search, or settings. Keep the scope strictly to this prototype.
>
> Deliver a runnable Quasar app with clean structure, realistic mock behavior, and UX that strongly resembles X/Twitter while remaining branding-neutral and using mocked Nostr-shaped data.

---

## 30. Compact Handoff Version

Use this shorter version when Codex needs less context:

> Build `nostr-scroll`, a dark-mode-only Quasar + Vue 3 + TypeScript SPA that closely mimics X/Twitter using mocked Nostr-shaped data and a mocked `nostr-auth` login. Desktop uses 3 columns: left nav with Home/Bookmarks/Profile, X-like middle timeline/profile/thread experience, and right `Today's News`. Mobile uses one main column and icon-only bottom nav. Implement only Login, Home, Bookmarks, Profile, and Post Detail. Use Pinia, Vue Router, reusable feed/profile/thread components, local optimistic interactions for create/reply/like/repost/bookmark, mocked infinite loading, and localStorage persistence. Keep the UI very close to X in dark mode and structure the code so real Nostr integration can replace mocks later.
