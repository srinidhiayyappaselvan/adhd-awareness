// ===== database.js =====
// IndexedDB wrapper for TaskTracker audio storage.
// DB: TaskTrackerDB  |  Store: taskAudio  |  Key: taskId

const DB_NAME    = 'TaskTrackerDB';
const DB_VERSION = 1;
const STORE_NAME = 'taskAudio';

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this browser.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'taskId' });
      }
    };
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror   = (event) => reject(new Error(`IndexedDB open error: ${event.target.error?.message || 'unknown'}`));
  });
}

async function saveAudio(taskId, audioBlob) {
  if (!taskId)                          throw new Error('saveAudio: taskId is required.');
  if (!(audioBlob instanceof Blob))     throw new Error('saveAudio: audioBlob must be a Blob.');
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx      = db.transaction(STORE_NAME, 'readwrite');
    const store   = tx.objectStore(STORE_NAME);
    const request = store.put({ taskId, audioBlob });
    request.onsuccess = () => resolve(true);
    request.onerror   = (e) => reject(new Error(`saveAudio error: ${e.target.error?.message}`));
    tx.oncomplete = () => db.close();
    tx.onerror    = (e) => reject(new Error(`saveAudio tx error: ${e.target.error?.message}`));
  });
}

async function getAudio(taskId) {
  if (!taskId) throw new Error('getAudio: taskId is required.');
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx      = db.transaction(STORE_NAME, 'readonly');
    const store   = tx.objectStore(STORE_NAME);
    const request = store.get(taskId);
    request.onsuccess = (e) => { const r = e.target.result; resolve(r ? r.audioBlob : null); };
    request.onerror   = (e) => reject(new Error(`getAudio error: ${e.target.error?.message}`));
    tx.oncomplete = () => db.close();
  });
}

async function deleteAudio(taskId) {
  if (!taskId) throw new Error('deleteAudio: taskId is required.');
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx      = db.transaction(STORE_NAME, 'readwrite');
    const store   = tx.objectStore(STORE_NAME);
    const request = store.delete(taskId);
    request.onsuccess = () => resolve(true);
    request.onerror   = (e) => reject(new Error(`deleteAudio error: ${e.target.error?.message}`));
    tx.oncomplete = () => db.close();
    tx.onerror    = (e) => reject(new Error(`deleteAudio tx error: ${e.target.error?.message}`));
  });
}

async function hasAudio(taskId) {
  if (!taskId) return false;
  try {
    const blob = await getAudio(taskId);
    return blob !== null && blob.size > 0;
  } catch {
    return false;
  }
}
