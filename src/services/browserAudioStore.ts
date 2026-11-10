const DATABASE_NAME = 'aurabell-browser-audio';
const DATABASE_VERSION = 1;
const STORE_NAME = 'audio-files';
export const BROWSER_AUDIO_PATH_PREFIX = 'indexeddb://';

interface StoredAudioFile {
  id: string;
  file: Blob;
  name: string;
}

let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (!('indexedDB' in window)) {
    return Promise.reject(new Error('Browser ini tidak mendukung penyimpanan audio lokal.'));
  }
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => {
        database.close();
        databasePromise = null;
      };
      resolve(database);
    };
    request.onerror = () => {
      databasePromise = null;
      reject(request.error ?? new Error('Gagal membuka penyimpanan audio lokal.'));
    };
    request.onblocked = () => {
      databasePromise = null;
      reject(new Error('Penyimpanan audio sedang dipakai tab lain. Tutup tab AuraBell lain lalu coba lagi.'));
    };
  });

  return databasePromise;
}

function createRequestPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Operasi penyimpanan audio gagal.'));
  });
}

export async function saveBrowserAudio(id: string, file: File): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readwrite');
  transaction.objectStore(STORE_NAME).put({
    id,
    file,
    name: file.name,
  } satisfies StoredAudioFile);
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Gagal menyimpan file audio lokal.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Penyimpanan file audio dibatalkan.'));
  });
}

export async function getBrowserAudioUrl(id: string): Promise<string> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readonly');
  const stored = await createRequestPromise(
    transaction.objectStore(STORE_NAME).get(id) as IDBRequest<StoredAudioFile | undefined>
  );
  if (!stored?.file) {
    throw new Error('File audio lokal tidak ditemukan. Impor ulang file tersebut.');
  }
  return URL.createObjectURL(stored.file);
}

export async function deleteBrowserAudio(id: string): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readwrite');
  transaction.objectStore(STORE_NAME).delete(id);
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Gagal menghapus file audio lokal.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Penghapusan file audio dibatalkan.'));
  });
}

export function getBrowserAudioId(path: string): string | null {
  return path.startsWith(BROWSER_AUDIO_PATH_PREFIX)
    ? path.slice(BROWSER_AUDIO_PATH_PREFIX.length)
    : null;
}
