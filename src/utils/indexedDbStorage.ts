function canUseIndexedDb(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

export async function closeIndexedDbConnection(
  dbPromise: Promise<IDBDatabase | null> | Promise<IDBDatabase> | null
): Promise<void> {
  if (!dbPromise) {
    return;
  }

  try {
    const db = await dbPromise;
    db?.close();
  } catch {
    // Ignore close failures while resetting storage.
  }
}

export async function deleteIndexedDbDatabase(databaseName: string): Promise<void> {
  if (!canUseIndexedDb()) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const request = window.indexedDB.deleteDatabase(databaseName);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error ?? new Error(`Failed to delete IndexedDB database "${databaseName}".`));
    };

    request.onblocked = () => {
      reject(new Error(`Deleting IndexedDB database "${databaseName}" is blocked.`));
    };
  });
}
