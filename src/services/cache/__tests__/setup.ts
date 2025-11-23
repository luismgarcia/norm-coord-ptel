/**
 * Setup de mocks para tests de CacheManager
 * Proporciona implementación funcional de localStorage para entorno de tests
 */

// Mock completo de localStorage
class LocalStorageMock {
  private store: Map<string, string>;

  constructor() {
    this.store = new Map();
  }

  clear() {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] || null;
  }

  get length(): number {
    return this.store.size;
  }
}

// Aplicar mock global
global.localStorage = new LocalStorageMock() as Storage;

// Función para resetear el storage entre tests
export function resetStorage() {
  global.localStorage.clear();
}

// Mock de IndexedDB (básico, para que no falle)
const indexedDBMock = {
  open: () => ({
    onsuccess: null,
    onerror: null,
    result: {
      transaction: () => ({
        objectStore: () => ({
          get: () => ({ onsuccess: null, onerror: null }),
          put: () => ({ onsuccess: null, onerror: null }),
          delete: () => ({ onsuccess: null, onerror: null }),
          clear: () => ({ onsuccess: null, onerror: null })
        })
      })
    }
  })
};

global.indexedDB = indexedDBMock as any;

console.log('[Test Setup] localStorage and IndexedDB mocks initialized');
