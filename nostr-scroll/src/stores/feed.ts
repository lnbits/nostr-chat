import type { NostrEvent } from '@nostr-dev-kit/ndk';
import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useAppRelaysStore } from './appRelays';
import { useAuthStore } from './auth';
import { useMyRelaysStore } from './myRelays';
import { useProfilesStore } from './profiles';
import {
  fetchBookmarksCollection,
  fetchHomeTimelineBatch,
  mapRawEventToNote,
  fetchNotesByIds,
  fetchProfileTab,
  fetchThreadCollection,
  publishBookmarkList,
  publishDeletionForEvents,
  publishNote,
  publishReaction,
  publishReply,
  publishRepost,
} from '../services/nostrNoteService';
import type { NostrNote, ProfileTab, ViewerPostState } from '../types/nostr';

interface ThreadState {
  focusedId: string | null;
  ancestors: string[];
  replies: string[];
  loading: boolean;
  loaded: boolean;
  error: string;
}

function defaultViewerState(): ViewerPostState {
  return {
    liked: false,
    reposted: false,
    bookmarked: false,
    likeEventIds: [],
    repostEventIds: [],
  };
}

function uniqueIds(ids: string[]): string[] {
  return Array.from(new Set(ids.filter(Boolean)));
}

export const useFeedStore = defineStore('feed', () => {
  const authStore = useAuthStore();
  const appRelaysStore = useAppRelaysStore();
  const myRelaysStore = useMyRelaysStore();
  const profilesStore = useProfilesStore();

  const notesById = ref<Record<string, NostrNote>>({});
  const viewerState = ref<Record<string, ViewerPostState>>({});
  const homeTimelineIds = ref<string[]>([]);
  const homeLoading = ref(false);
  const homeLoaded = ref(false);
  const homeError = ref('');
  const homeLoadingMore = ref(false);
  const homeNextCursor = ref<number | null>(null);
  const hasMoreHome = ref(true);
  const bookmarksTimelineIds = ref<string[]>([]);
  const bookmarksLoading = ref(false);
  const bookmarksLoaded = ref(false);
  const bookmarksError = ref('');
  const profileTabIds = ref<Record<string, Record<ProfileTab, string[]>>>({});
  const profileTabLoading = ref<Record<string, Partial<Record<ProfileTab, boolean>>>>({});
  const profileTabErrors = ref<Record<string, Partial<Record<ProfileTab, string>>>>({});
  const threadStateByPostId = ref<Record<string, ThreadState>>({});
  const publishingPost = ref(false);
  const actionPendingByPostId = ref<Record<string, boolean>>({});

  const rawEventsById = new Map<string, NostrEvent>();

  const notes = computed(() => Object.values(notesById.value));
  const loadingMore = computed(() => homeLoadingMore.value);
  const homeTimeline = computed(() =>
    homeTimelineIds.value
      .map((id) => notesById.value[id])
      .filter((note): note is NostrNote => Boolean(note)),
  );
  const bookmarksTimeline = computed(() =>
    bookmarksTimelineIds.value
      .map((id) => notesById.value[id])
      .filter((note): note is NostrNote => Boolean(note)),
  );

  function ensureRelayStoresInitialized(): void {
    appRelaysStore.init();
    myRelaysStore.init();
  }

  function upsertNotes(nextNotes: NostrNote[]): void {
    if (nextNotes.length === 0) {
      return;
    }

    notesById.value = nextNotes.reduce<Record<string, NostrNote>>((accumulator, note) => {
      accumulator[note.id] = {
        ...(notesById.value[note.id] ?? {}),
        ...note,
      };
      return accumulator;
    }, { ...notesById.value });
  }

  function removeNote(noteId: string): void {
    if (!notesById.value[noteId]) {
      return;
    }

    const { [noteId]: _, ...remainingNotes } = notesById.value;
    notesById.value = remainingNotes;
    delete viewerState.value[noteId];
    rawEventsById.delete(noteId);
  }

  function upsertRawEvents(events: NostrEvent[]): void {
    for (const event of events) {
      rawEventsById.set(event.id, event);
    }
  }

  async function hydrateProfilesForNotes(nextNotes: NostrNote[], extraPubkeys: string[] = []): Promise<void> {
    const pubkeys = uniqueIds([
      ...extraPubkeys,
      ...nextNotes.map((note) => note.pubkey),
    ]);
    await profilesStore.ensureProfiles(pubkeys);
  }

  function mergeViewerState(nextViewerState: Record<string, ViewerPostState>): void {
    if (Object.keys(nextViewerState).length === 0) {
      return;
    }

    viewerState.value = {
      ...viewerState.value,
      ...Object.fromEntries(
        Object.entries(nextViewerState).map(([noteId, state]) => [
          noteId,
          {
            ...defaultViewerState(),
            ...(viewerState.value[noteId] ?? {}),
            ...state,
            likeEventIds: uniqueIds(state.likeEventIds ?? viewerState.value[noteId]?.likeEventIds ?? []),
            repostEventIds: uniqueIds(
              state.repostEventIds ?? viewerState.value[noteId]?.repostEventIds ?? [],
            ),
          },
        ]),
      ),
    };
  }

  function getRawPostById(id: string): NostrNote | null {
    return notesById.value[id] ?? null;
  }

  function resolveDisplayPost(note: NostrNote): NostrNote {
    if (note.kind === 6 && note.repostOf && notesById.value[note.repostOf]) {
      return notesById.value[note.repostOf];
    }

    return note;
  }

  function getPostById(id: string): NostrNote | null {
    const note = getRawPostById(id);
    return note ? resolveDisplayPost(note) : null;
  }

  function getViewerPostState(postId: string): ViewerPostState {
    return viewerState.value[postId] ?? defaultViewerState();
  }

  function getProfileTabPosts(pubkey: string, tab: ProfileTab): NostrNote[] {
    return (profileTabIds.value[pubkey]?.[tab] ?? [])
      .map((id) => notesById.value[id])
      .filter((note): note is NostrNote => Boolean(note));
  }

  function getProfilePosts(pubkey: string): NostrNote[] {
    return getProfileTabPosts(pubkey, 'posts');
  }

  function getProfileReplies(pubkey: string): NostrNote[] {
    return getProfileTabPosts(pubkey, 'replies');
  }

  function getProfileLikes(pubkey: string): NostrNote[] {
    return getProfileTabPosts(pubkey, 'likes');
  }

  function getProfileReposts(pubkey: string): NostrNote[] {
    return getProfileTabPosts(pubkey, 'reposts');
  }

  function getThreadAncestors(postId: string): NostrNote[] {
    return (threadStateByPostId.value[postId]?.ancestors ?? [])
      .map((id) => notesById.value[id])
      .filter((note): note is NostrNote => Boolean(note));
  }

  function getRepliesForPost(postId: string): NostrNote[] {
    return (threadStateByPostId.value[postId]?.replies ?? [])
      .map((id) => notesById.value[id])
      .filter((note): note is NostrNote => Boolean(note));
  }

  function replaceIdInLists(previousId: string, nextId: string): void {
    homeTimelineIds.value = homeTimelineIds.value.map((id) => (id === previousId ? nextId : id));
    bookmarksTimelineIds.value = bookmarksTimelineIds.value.map((id) => (id === previousId ? nextId : id));
    profileTabIds.value = Object.fromEntries(
      Object.entries(profileTabIds.value).map(([pubkey, tabs]) => [
        pubkey,
        {
          posts: (tabs.posts ?? []).map((id) => (id === previousId ? nextId : id)),
          replies: (tabs.replies ?? []).map((id) => (id === previousId ? nextId : id)),
          likes: (tabs.likes ?? []).map((id) => (id === previousId ? nextId : id)),
          reposts: (tabs.reposts ?? []).map((id) => (id === previousId ? nextId : id)),
        },
      ]),
    );
    threadStateByPostId.value = Object.fromEntries(
      Object.entries(threadStateByPostId.value).map(([postId, state]) => [
        postId,
        {
          ...state,
          focusedId: state.focusedId === previousId ? nextId : state.focusedId,
          ancestors: state.ancestors.map((id) => (id === previousId ? nextId : id)),
          replies: state.replies.map((id) => (id === previousId ? nextId : id)),
        },
      ]),
    );
  }

  async function refreshNotesByIds(noteIds: string[]): Promise<void> {
    const targetIds = uniqueIds(noteIds);
    if (targetIds.length === 0 || !authStore.currentPubkey) {
      return;
    }

    ensureRelayStoresInitialized();

    const refreshedCollection = await fetchNotesByIds(
      authStore.session,
      appRelaysStore.relayEntries,
      myRelaysStore.relayEntries,
      targetIds,
    );
    upsertNotes([...refreshedCollection.primaryNotes, ...refreshedCollection.relatedNotes]);
    upsertRawEvents(refreshedCollection.rawEvents);
    mergeViewerState(refreshedCollection.viewerState);
    await hydrateProfilesForNotes(
      [...refreshedCollection.primaryNotes, ...refreshedCollection.relatedNotes],
      refreshedCollection.authorPubkeys,
    );
  }

  async function ensureHydrated(force = false): Promise<void> {
    if (homeLoaded.value && !force) {
      return;
    }
    if (homeLoading.value) {
      return;
    }

    if (!authStore.currentPubkey) {
      return;
    }

    ensureRelayStoresInitialized();
    homeLoading.value = true;
    homeError.value = '';

    try {
      const homeCollection = await fetchHomeTimelineBatch(
        authStore.session,
        appRelaysStore.relayEntries,
        myRelaysStore.relayEntries,
        null,
      );
      upsertNotes([...homeCollection.primaryNotes, ...homeCollection.relatedNotes]);
      upsertRawEvents(homeCollection.rawEvents);
      mergeViewerState(homeCollection.viewerState);
      await hydrateProfilesForNotes(
        [...homeCollection.primaryNotes, ...homeCollection.relatedNotes],
        homeCollection.authorPubkeys,
      );
      homeTimelineIds.value = homeCollection.primaryNotes.map((note) => note.id);
      homeNextCursor.value = homeCollection.nextCursor;
      hasMoreHome.value = homeCollection.hasMore;
      homeLoaded.value = true;
    } catch (error) {
      homeError.value =
        error instanceof Error ? error.message : 'Failed to load the home timeline from relays.';
    } finally {
      homeLoading.value = false;
    }
  }

  async function loadMoreHome(): Promise<void> {
    if (homeLoadingMore.value || !hasMoreHome.value || !authStore.currentPubkey) {
      return;
    }

    ensureRelayStoresInitialized();
    homeLoadingMore.value = true;

    try {
      const homeCollection = await fetchHomeTimelineBatch(
        authStore.session,
        appRelaysStore.relayEntries,
        myRelaysStore.relayEntries,
        homeNextCursor.value,
      );
      upsertNotes([...homeCollection.primaryNotes, ...homeCollection.relatedNotes]);
      upsertRawEvents(homeCollection.rawEvents);
      mergeViewerState(homeCollection.viewerState);
      await hydrateProfilesForNotes(
        [...homeCollection.primaryNotes, ...homeCollection.relatedNotes],
        homeCollection.authorPubkeys,
      );
      homeTimelineIds.value = uniqueIds([...homeTimelineIds.value, ...homeCollection.primaryNotes.map((note) => note.id)]);
      homeNextCursor.value = homeCollection.nextCursor;
      hasMoreHome.value = homeCollection.hasMore;
    } catch (error) {
      homeError.value =
        error instanceof Error ? error.message : 'Failed to load more posts from relays.';
    } finally {
      homeLoadingMore.value = false;
    }
  }

  async function loadBookmarks(force = false): Promise<void> {
    if (bookmarksLoaded.value && !force) {
      return;
    }
    if (bookmarksLoading.value) {
      return;
    }

    if (!authStore.currentPubkey) {
      return;
    }

    ensureRelayStoresInitialized();
    bookmarksLoading.value = true;
    bookmarksError.value = '';

    try {
      const bookmarkCollection = await fetchBookmarksCollection(
        authStore.session,
        appRelaysStore.relayEntries,
        myRelaysStore.relayEntries,
      );
      upsertNotes(bookmarkCollection.notes);
      upsertRawEvents(bookmarkCollection.rawEvents);
      mergeViewerState(bookmarkCollection.viewerState);
      await hydrateProfilesForNotes(bookmarkCollection.notes, bookmarkCollection.authorPubkeys);
      bookmarksTimelineIds.value = bookmarkCollection.notes.map((note) => note.id);
      bookmarksLoaded.value = true;
    } catch (error) {
      bookmarksError.value =
        error instanceof Error ? error.message : 'Failed to load bookmarks from relays.';
    } finally {
      bookmarksLoading.value = false;
    }
  }

  async function ensureProfileTabLoaded(pubkey: string, tab: ProfileTab, force = false): Promise<void> {
    if (!authStore.currentPubkey) {
      return;
    }

    if (!force && profileTabIds.value[pubkey]?.[tab]) {
      return;
    }

    ensureRelayStoresInitialized();
    profileTabLoading.value = {
      ...profileTabLoading.value,
      [pubkey]: {
        ...(profileTabLoading.value[pubkey] ?? {}),
        [tab]: true,
      },
    };
    profileTabErrors.value = {
      ...profileTabErrors.value,
      [pubkey]: {
        ...(profileTabErrors.value[pubkey] ?? {}),
        [tab]: '',
      },
    };

    try {
      const collection = await fetchProfileTab(
        authStore.session,
        appRelaysStore.relayEntries,
        myRelaysStore.relayEntries,
        pubkey,
        tab,
      );
      upsertNotes([...collection.primaryNotes, ...collection.relatedNotes]);
      upsertRawEvents(collection.rawEvents);
      mergeViewerState(collection.viewerState);
      await hydrateProfilesForNotes(
        [...collection.primaryNotes, ...collection.relatedNotes],
        collection.authorPubkeys,
      );
      profileTabIds.value = {
        ...profileTabIds.value,
        [pubkey]: {
          posts: profileTabIds.value[pubkey]?.posts ?? [],
          replies: profileTabIds.value[pubkey]?.replies ?? [],
          likes: profileTabIds.value[pubkey]?.likes ?? [],
          reposts: profileTabIds.value[pubkey]?.reposts ?? [],
          [tab]: collection.primaryNotes.map((note) => note.id),
        },
      };
    } catch (error) {
      profileTabErrors.value = {
        ...profileTabErrors.value,
        [pubkey]: {
          ...(profileTabErrors.value[pubkey] ?? {}),
          [tab]:
            error instanceof Error ? error.message : 'Failed to load profile posts from relays.',
        },
      };
    } finally {
      profileTabLoading.value = {
        ...profileTabLoading.value,
        [pubkey]: {
          ...(profileTabLoading.value[pubkey] ?? {}),
          [tab]: false,
        },
      };
    }
  }

  async function ensureThreadLoaded(postId: string, force = false): Promise<void> {
    if (!authStore.currentPubkey) {
      return;
    }

    if (!force && threadStateByPostId.value[postId]?.loaded) {
      return;
    }

    ensureRelayStoresInitialized();
    threadStateByPostId.value = {
      ...threadStateByPostId.value,
      [postId]: {
        focusedId: threadStateByPostId.value[postId]?.focusedId ?? null,
        ancestors: threadStateByPostId.value[postId]?.ancestors ?? [],
        replies: threadStateByPostId.value[postId]?.replies ?? [],
        loading: true,
        loaded: false,
        error: '',
      },
    };

    try {
      const threadCollection = await fetchThreadCollection(
        authStore.session,
        appRelaysStore.relayEntries,
        myRelaysStore.relayEntries,
        postId,
      );
      upsertNotes([
        ...(threadCollection.focusedPost ? [threadCollection.focusedPost] : []),
        ...threadCollection.ancestors,
        ...threadCollection.replies,
      ]);
      upsertRawEvents(threadCollection.rawEvents);
      mergeViewerState(threadCollection.viewerState);
      await hydrateProfilesForNotes(
        [
          ...(threadCollection.focusedPost ? [threadCollection.focusedPost] : []),
          ...threadCollection.ancestors,
          ...threadCollection.replies,
        ],
        threadCollection.authorPubkeys,
      );
      threadStateByPostId.value = {
        ...threadStateByPostId.value,
        [postId]: {
          focusedId: threadCollection.focusedPost?.id ?? null,
          ancestors: threadCollection.ancestors.map((note) => note.id),
          replies: threadCollection.replies.map((note) => note.id),
          loading: false,
          loaded: true,
          error: '',
        },
      };
    } catch (error) {
      threadStateByPostId.value = {
        ...threadStateByPostId.value,
        [postId]: {
          focusedId: null,
          ancestors: [],
          replies: [],
          loading: false,
          loaded: false,
          error:
            error instanceof Error ? error.message : 'Failed to load the thread from relays.',
        },
      };
    }
  }

  function setActionPending(postId: string, pending: boolean): void {
    actionPendingByPostId.value = {
      ...actionPendingByPostId.value,
      [postId]: pending,
    };
  }

  function updateNoteStats(postId: string, updater: (note: NostrNote) => NostrNote): void {
    const existingNote = notesById.value[postId];
    if (!existingNote) {
      return;
    }

    notesById.value = {
      ...notesById.value,
      [postId]: updater(existingNote),
    };
  }

  async function createPost(content: string): Promise<void> {
    if (!authStore.currentPubkey) {
      return;
    }

    publishingPost.value = true;
    const optimisticId = `optimistic-note-${Date.now()}`;
    const optimisticNote: NostrNote = {
      id: optimisticId,
      pubkey: authStore.currentPubkey,
      kind: 1,
      createdAt: new Date().toISOString(),
      content: content.trim(),
      media: [],
      tags: [],
      replyTo: null,
      rootId: null,
      repostOf: null,
      quotedNoteId: null,
      entity: optimisticId,
      permalink: optimisticId,
      stats: {
        replies: 0,
        reposts: 0,
        likes: 0,
        bookmarks: 0,
      },
    };

    upsertNotes([optimisticNote]);
    homeTimelineIds.value = uniqueIds([optimisticId, ...homeTimelineIds.value]);

    try {
      const rawEvent = await publishNote(
        authStore.session,
        appRelaysStore.relayEntries,
        myRelaysStore.relayEntries,
        content,
      );
      const publishedNote = mapRawEventToNote(rawEvent);
      if (publishedNote) {
        upsertNotes([publishedNote]);
      }
      const publishedCollection = await fetchNotesByIds(
        authStore.session,
        appRelaysStore.relayEntries,
        myRelaysStore.relayEntries,
        [rawEvent.id],
      );
      upsertNotes([
        ...(publishedNote ? [publishedNote] : []),
        ...publishedCollection.primaryNotes,
        ...publishedCollection.relatedNotes,
      ]);
      upsertRawEvents([rawEvent, ...publishedCollection.rawEvents]);
      mergeViewerState(publishedCollection.viewerState);
      await hydrateProfilesForNotes(
        [...publishedCollection.primaryNotes, ...publishedCollection.relatedNotes],
        publishedCollection.authorPubkeys,
      );
      replaceIdInLists(optimisticId, rawEvent.id);
      removeNote(optimisticId);
      homeTimelineIds.value = uniqueIds([rawEvent.id, ...homeTimelineIds.value]);
    } catch (error) {
      removeNote(optimisticId);
      homeTimelineIds.value = homeTimelineIds.value.filter((id) => id !== optimisticId);
      throw error;
    } finally {
      publishingPost.value = false;
    }
  }

  async function replyToPost(parentId: string, content: string): Promise<void> {
    if (!authStore.currentPubkey) {
      return;
    }

    const parentRawEvent = rawEventsById.get(parentId);
    const parentNote = notesById.value[parentId];
    if (!parentRawEvent || !parentNote) {
      return;
    }

    const optimisticId = `optimistic-reply-${Date.now()}`;
    const optimisticReply: NostrNote = {
      id: optimisticId,
      pubkey: authStore.currentPubkey,
      kind: 1,
      createdAt: new Date().toISOString(),
      content: content.trim(),
      media: [],
      tags: [],
      replyTo: parentId,
      rootId: parentNote.rootId ?? parentNote.id,
      repostOf: null,
      quotedNoteId: null,
      entity: optimisticId,
      permalink: optimisticId,
      stats: {
        replies: 0,
        reposts: 0,
        likes: 0,
        bookmarks: 0,
      },
    };

    upsertNotes([optimisticReply]);
    updateNoteStats(parentId, (note) => ({
      ...note,
      stats: {
        ...note.stats,
        replies: note.stats.replies + 1,
      },
    }));
    if (threadStateByPostId.value[parentId]) {
      threadStateByPostId.value = {
        ...threadStateByPostId.value,
        [parentId]: {
          ...threadStateByPostId.value[parentId],
          replies: uniqueIds([...threadStateByPostId.value[parentId].replies, optimisticId]),
        },
      };
    }

    try {
      const rawEvent = await publishReply(
        authStore.session,
        appRelaysStore.relayEntries,
        myRelaysStore.relayEntries,
        parentRawEvent,
        content,
      );
      const publishedReply = mapRawEventToNote(rawEvent);
      if (publishedReply) {
        upsertNotes([publishedReply]);
      }
      const publishedCollection = await fetchNotesByIds(
        authStore.session,
        appRelaysStore.relayEntries,
        myRelaysStore.relayEntries,
        [rawEvent.id, parentId],
      );
      upsertNotes([
        ...(publishedReply ? [publishedReply] : []),
        ...publishedCollection.primaryNotes,
        ...publishedCollection.relatedNotes,
      ]);
      upsertRawEvents([rawEvent, ...publishedCollection.rawEvents]);
      mergeViewerState(publishedCollection.viewerState);
      await hydrateProfilesForNotes(
        [...publishedCollection.primaryNotes, ...publishedCollection.relatedNotes],
        publishedCollection.authorPubkeys,
      );
      replaceIdInLists(optimisticId, rawEvent.id);
      removeNote(optimisticId);
      if (threadStateByPostId.value[parentId]) {
        threadStateByPostId.value = {
          ...threadStateByPostId.value,
          [parentId]: {
            ...threadStateByPostId.value[parentId],
            replies: uniqueIds([
              ...threadStateByPostId.value[parentId].replies.filter((id) => id !== optimisticId),
              rawEvent.id,
            ]),
          },
        };
      }
      await refreshNotesByIds([parentId]);
    } catch (error) {
      removeNote(optimisticId);
      if (threadStateByPostId.value[parentId]) {
        threadStateByPostId.value = {
          ...threadStateByPostId.value,
          [parentId]: {
            ...threadStateByPostId.value[parentId],
            replies: threadStateByPostId.value[parentId].replies.filter((id) => id !== optimisticId),
          },
        };
      }
      await refreshNotesByIds([parentId]);
      throw error;
    }
  }

  async function toggleLike(postId: string): Promise<void> {
    if (!authStore.currentPubkey) {
      return;
    }

    const targetRawEvent = rawEventsById.get(postId);
    if (!targetRawEvent) {
      return;
    }

    const currentState = getViewerPostState(postId);
    const nextLikedState = !currentState.liked;
    setActionPending(postId, true);
    mergeViewerState({
      [postId]: {
        ...currentState,
        liked: nextLikedState,
      },
    });
    updateNoteStats(postId, (note) => ({
      ...note,
      stats: {
        ...note.stats,
        likes: Math.max(0, note.stats.likes + (nextLikedState ? 1 : -1)),
      },
    }));

    try {
      if (currentState.liked) {
        if ((currentState.likeEventIds ?? []).length === 0) {
          await refreshNotesByIds([postId]);
          return;
        }

        await publishDeletionForEvents(
          authStore.session,
          appRelaysStore.relayEntries,
          myRelaysStore.relayEntries,
          currentState.likeEventIds ?? [],
        );
      } else {
        const reactionEvent = await publishReaction(
          authStore.session,
          appRelaysStore.relayEntries,
          myRelaysStore.relayEntries,
          targetRawEvent,
        );
        upsertRawEvents([reactionEvent]);
      }

      await refreshNotesByIds([postId]);
    } catch (error) {
      mergeViewerState({
        [postId]: currentState,
      });
      await refreshNotesByIds([postId]);
      throw error;
    } finally {
      setActionPending(postId, false);
    }
  }

  async function toggleRepost(postId: string): Promise<void> {
    if (!authStore.currentPubkey) {
      return;
    }

    const targetRawEvent = rawEventsById.get(postId);
    if (!targetRawEvent) {
      return;
    }

    const currentState = getViewerPostState(postId);
    const nextRepostedState = !currentState.reposted;
    setActionPending(postId, true);
    mergeViewerState({
      [postId]: {
        ...currentState,
        reposted: nextRepostedState,
      },
    });
    updateNoteStats(postId, (note) => ({
      ...note,
      stats: {
        ...note.stats,
        reposts: Math.max(0, note.stats.reposts + (nextRepostedState ? 1 : -1)),
      },
    }));

    try {
      if (currentState.reposted) {
        if ((currentState.repostEventIds ?? []).length === 0) {
          await refreshNotesByIds([postId]);
          return;
        }

        await publishDeletionForEvents(
          authStore.session,
          appRelaysStore.relayEntries,
          myRelaysStore.relayEntries,
          currentState.repostEventIds ?? [],
        );
      } else {
        const repostEvent = await publishRepost(
          authStore.session,
          appRelaysStore.relayEntries,
          myRelaysStore.relayEntries,
          targetRawEvent,
        );
        upsertRawEvents([repostEvent]);
      }

      await refreshNotesByIds([postId]);
      await ensureProfileTabLoaded(authStore.currentPubkey, 'reposts', true);
    } catch (error) {
      mergeViewerState({
        [postId]: currentState,
      });
      await refreshNotesByIds([postId]);
      throw error;
    } finally {
      setActionPending(postId, false);
    }
  }

  async function toggleBookmark(postId: string): Promise<void> {
    if (!authStore.currentPubkey) {
      return;
    }

    const currentState = getViewerPostState(postId);
    const nextBookmarkedState = !currentState.bookmarked;
    const nextBookmarkIds = nextBookmarkedState
      ? uniqueIds([postId, ...bookmarksTimelineIds.value])
      : bookmarksTimelineIds.value.filter((id) => id !== postId);

    setActionPending(postId, true);
    mergeViewerState({
      [postId]: {
        ...currentState,
        bookmarked: nextBookmarkedState,
      },
    });
    bookmarksTimelineIds.value = nextBookmarkIds;

    try {
      await publishBookmarkList(
        authStore.session,
        appRelaysStore.relayEntries,
        myRelaysStore.relayEntries,
        nextBookmarkIds,
      );
      await loadBookmarks(true);
    } catch (error) {
      mergeViewerState({
        [postId]: currentState,
      });
      bookmarksTimelineIds.value = currentState.bookmarked
        ? uniqueIds([postId, ...bookmarksTimelineIds.value])
        : bookmarksTimelineIds.value.filter((id) => id !== postId);
      throw error;
    } finally {
      setActionPending(postId, false);
    }
  }

  function isProfileTabLoading(pubkey: string, tab: ProfileTab): boolean {
    return Boolean(profileTabLoading.value[pubkey]?.[tab]);
  }

  function getProfileTabError(pubkey: string, tab: ProfileTab): string {
    return profileTabErrors.value[pubkey]?.[tab] ?? '';
  }

  function getThreadError(postId: string): string {
    return threadStateByPostId.value[postId]?.error ?? '';
  }

  function isThreadLoading(postId: string): boolean {
    return Boolean(threadStateByPostId.value[postId]?.loading);
  }

  function isActionPending(postId: string): boolean {
    return Boolean(actionPendingByPostId.value[postId]);
  }

  function getPostCountForProfile(pubkey: string): number {
    return getProfilePosts(pubkey).length + getProfileReplies(pubkey).length;
  }

  function reset(): void {
    notesById.value = {};
    viewerState.value = {};
    homeTimelineIds.value = [];
    homeLoading.value = false;
    homeLoaded.value = false;
    homeError.value = '';
    homeLoadingMore.value = false;
    homeNextCursor.value = null;
    hasMoreHome.value = true;
    bookmarksTimelineIds.value = [];
    bookmarksLoading.value = false;
    bookmarksLoaded.value = false;
    bookmarksError.value = '';
    profileTabIds.value = {};
    profileTabLoading.value = {};
    profileTabErrors.value = {};
    threadStateByPostId.value = {};
    publishingPost.value = false;
    actionPendingByPostId.value = {};
    rawEventsById.clear();
  }

  return {
    notes,
    viewerState,
    homeTimeline,
    bookmarksTimeline,
    homeLoading,
    homeError,
    loadingMore,
    hasMoreHome,
    bookmarksLoading,
    bookmarksError,
    publishingPost,
    ensureHydrated,
    loadMoreHome,
    loadBookmarks,
    ensureProfileTabLoaded,
    ensureThreadLoaded,
    getPostById,
    getRawPostById,
    getViewerPostState,
    getProfilePosts,
    getProfileReplies,
    getProfileLikes,
    getProfileReposts,
    getPostCountForProfile,
    getRepliesForPost,
    getThreadAncestors,
    resolveDisplayPost,
    createPost,
    replyToPost,
    toggleLike,
    toggleRepost,
    toggleBookmark,
    getProfileTabError,
    isProfileTabLoading,
    getThreadError,
    isThreadLoading,
    isActionPending,
    reset,
  };
});
