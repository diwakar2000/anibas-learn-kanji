export const DB_NAME = 'kanji-quiz-spa';
export const DB_VERSION = 3;

export function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains('settings')) {
        database.createObjectStore('settings', { keyPath: 'key' });
      }

      if (!database.objectStoreNames.contains('progress')) {
        database.createObjectStore('progress', { keyPath: 'levelId' });
      }

      if (!database.objectStoreNames.contains('kanjiDetails')) {
        database.createObjectStore('kanjiDetails', { keyPath: 'kanji' });
      }

      if (!database.objectStoreNames.contains('storyProgress')) {
        database.createObjectStore('storyProgress', { keyPath: 'storyId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function storeRequest(db, storeName, mode, operation) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = operation(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function getRecord(db, storeName, key) {
  return storeRequest(db, storeName, 'readonly', (store) => store.get(key));
}

export function putRecord(db, storeName, value) {
  return storeRequest(db, storeName, 'readwrite', (store) => store.put(value));
}

export function emptyProgress(levelId) {
  return {
    levelId,
    completedKanji: [],
    completedSets: 0,
    lastSet: [],
    updatedAt: null
  };
}

export function emptyStoryProgress(storyId, levelId) {
  return {
    storyId,
    levelId,
    viewedWords: [],
    completed: false,
    completedAt: null,
    updatedAt: null
  };
}

export function normalizeStoryProgress(record, story) {
  return {
    ...emptyStoryProgress(story.id, story.jlptLevel),
    ...record,
    viewedWords: Array.isArray(record.viewedWords) ? record.viewedWords : []
  };
}
