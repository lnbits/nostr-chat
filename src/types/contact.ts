export interface ContactBirthday {
  year?: number;
  month?: number;
  day?: number;
}

export interface ContactMetadata {
  display_name?: string;
  website?: string;
  banner?: string;
  bot?: boolean;
  birthday?: ContactBirthday;
  // App-local linkage used to map contacts to existing chat threads.
  chatId?: string;
  avatar?: string;
}

export interface ContactRecord {
  id: number;
  public_key: string;
  name: string;
  given_name: string | null;
  meta: ContactMetadata;
}

export interface CreateContactInput {
  public_key: string;
  name: string;
  given_name?: string | null;
  meta?: ContactMetadata;
}

export interface UpdateContactInput {
  public_key?: string;
  name?: string;
  given_name?: string | null;
  meta?: ContactMetadata;
}
