export interface NostrProfile {
  pubkey: string;
  name: string;
  displayName: string;
  about: string;
  picture: string;
  banner: string;
  nip05?: string;
  website?: string;
  lud16?: string;
  followersCount: number;
  followingCount: number;
  joinedAt: string;
  location?: string;
}

export interface NostrNote {
  id: string;
  pubkey: string;
  kind: 1 | 6;
  createdAt: string;
  content: string;
  tags: string[][];
  replyTo?: string | null;
  rootId?: string | null;
  repostOf?: string | null;
  quotedNoteId?: string | null;
  stats: {
    replies: number;
    reposts: number;
    likes: number;
    bookmarks: number;
    views?: number;
  };
}

export interface ViewerPostState {
  liked: boolean;
  reposted: boolean;
  bookmarked: boolean;
}

export interface FeedPersistenceState {
  notes: NostrNote[];
  viewerState: Record<string, ViewerPostState>;
  homeVisibleCount: number;
}

export type ProfileTab = 'posts' | 'replies' | 'likes' | 'reposts';
