export interface ContactRecord {
  id: number;
  public_key: string;
  name: string;
  given_name: string | null;
  meta: string;
}

export interface CreateContactInput {
  public_key: string;
  name: string;
  given_name?: string | null;
  meta?: string;
}

export interface UpdateContactInput {
  public_key?: string;
  name?: string;
  given_name?: string | null;
  meta?: string;
}
