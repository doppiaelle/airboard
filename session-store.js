const DB_NAME = "airboard-sessions";
const STORE_NAME = "sessions";
const MAX_ARCHIVED_SESSIONS = 10;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME))
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveSession(session) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.put(structuredClone(session));
    const all = store.getAll();
    all.onsuccess = () => {
      all.result
        .filter((item) => item?.id !== session.id)
        .sort((a, b) => Date.parse(b.endedAt || 0) - Date.parse(a.endedAt || 0))
        .slice(MAX_ARCHIVED_SESSIONS - 1)
        .forEach((item) => store.delete(item.id));
    };
    transaction.oncomplete = () => {
      db.close();
      resolve(session);
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

export async function listSessions(limit = 6) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME).objectStore(STORE_NAME).getAll();
    request.onsuccess = () => {
      db.close();
      resolve(
        request.result
          .filter((session) => session?.endedAt)
          .sort((a, b) => Date.parse(b.endedAt) - Date.parse(a.endedAt))
          .slice(0, limit),
      );
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}
