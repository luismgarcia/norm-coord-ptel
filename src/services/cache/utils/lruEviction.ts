/**
 * Sistema de evicción LRU (Least Recently Used)
 * Mantiene tracking de acceso a entradas para evicción inteligente
 */

/**
 * Entrada en el tracker LRU
 */
interface LRUEntry {
  key: string;
  lastAccess: number;
  accessCount: number;
}

/**
 * Gestor de política de evicción LRU
 */
export class LRUEvictionManager {
  private accessMap: Map<string, LRUEntry>;
  private maxEntries: number;

  constructor(maxEntries: number = 1000) {
    this.accessMap = new Map();
    this.maxEntries = maxEntries;
  }

  /**
   * Registra acceso a una key
   */
  recordAccess(key: string): void {
    const now = Date.now();
    const existing = this.accessMap.get(key);

    if (existing) {
      existing.lastAccess = now;
      existing.accessCount++;
    } else {
      this.accessMap.set(key, {
        key,
        lastAccess: now,
        accessCount: 1
      });
    }
  }

  /**
   * Obtiene keys a evictar cuando se excede el límite
   * @param currentSize - Número actual de entradas
   * @param targetSize - Tamaño objetivo tras evicción
   * @returns Array de keys a eliminar
   */
  getKeysToEvict(currentSize: number, targetSize: number): string[] {
    if (currentSize <= targetSize) {
      return [];
    }

    const numToEvict = currentSize - targetSize;
    
    // Ordenar por último acceso (más antiguo primero)
    const sortedEntries = Array.from(this.accessMap.values())
      .sort((a, b) => a.lastAccess - b.lastAccess);
    
    // Tomar las más antiguas
    const keysToEvict = sortedEntries
      .slice(0, numToEvict)
      .map(entry => entry.key);

    return keysToEvict;
  }

  /**
   * Elimina una key del tracking
   */
  removeKey(key: string): void {
    this.accessMap.delete(key);
  }

  /**
   * Obtiene estadísticas del tracker LRU
   */
  getStats() {
    const entries = Array.from(this.accessMap.values());
    return {
      totalEntries: entries.length,
      avgAccessCount: entries.reduce((sum, e) => sum + e.accessCount, 0) / entries.length || 0,
      oldestAccessAge: Math.max(...entries.map(e => Date.now() - e.lastAccess), 0),
      mostAccessed: entries.sort((a, b) => b.accessCount - a.accessCount)[0]?.key || null
    };
  }

  /**
   * Limpia todo el tracker
   */
  clear(): void {
    this.accessMap.clear();
  }
}
