import { Dataset } from '../types';

const DB_NAME = 'ExcelDashboardDB';
const STORE_NAME = 'datasets';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export const storageService = {
  async saveDataset(dataset: Dataset, id: string = 'active_dataset'): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const targetDataset = { ...dataset, id };
      const request = store.put(targetDataset);
      
      request.onsuccess = () => {
        // Clear conflicting keys to conserve space
        if (id === 'active_dataset') {
          store.delete('compare_dataset_a');
          store.delete('compare_dataset_b');
        } else if (id === 'compare_dataset_a' || id === 'compare_dataset_b') {
          store.delete('active_dataset');
        }
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  },

  async getDataset(id: string = 'active_dataset'): Promise<Dataset | null> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => {
          resolve(request.result || null);
        };

        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error("Failed to open IndexedDB", e);
      return null;
    }
  },

  async clearDataset(id?: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = id ? store.delete(id) : store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};
