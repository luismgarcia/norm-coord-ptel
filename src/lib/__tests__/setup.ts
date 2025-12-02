/**
 * setup.ts
 * 
 * Configuración global de tests para Vitest.
 * Mockea fetch para evitar llamadas de red reales.
 * 
 * @version 1.0.0
 * @date 2025-12-02
 */

import { vi, beforeAll, afterEach, afterAll } from 'vitest';
import { getMockResponseForUrl } from './__mocks__/wfsResponses';

// ============================================================================
// MOCK GLOBAL DE FETCH
// ============================================================================

const originalFetch = global.fetch;

/**
 * Fetch mockeado que:
 * 1. Intercepta llamadas a servicios WFS/Overpass
 * 2. Devuelve respuestas mock instantáneas
 * 3. Permite llamadas reales si PTEL_REAL_NETWORK=true
 */
const mockFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input.toString();
  
  // Si está habilitado el modo red real, usar fetch original
  if (process.env.PTEL_REAL_NETWORK === 'true') {
    return originalFetch(url, init);
  }
  
  // Buscar respuesta mock para esta URL
  const mockResponse = getMockResponseForUrl(url);
  
  // Simular pequeño delay de red (10-50ms)
  await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 40));
  
  // getMockResponseForUrl ahora siempre devuelve algo (nunca null)
  // Así evitamos 404 y reintentos que causan timeouts
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers({
      'Content-Type': 'application/json'
    }),
    json: async () => mockResponse,
    text: async () => JSON.stringify(mockResponse),
    clone: function() { return this; }
  } as Response;
});

// ============================================================================
// MOCK DE localStorage (no disponible en Node.js)
// ============================================================================

const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => localStorageMock.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock.store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageMock.store[key];
  }),
  clear: vi.fn(() => {
    localStorageMock.store = {};
  }),
  get length() {
    return Object.keys(localStorageMock.store).length;
  },
  key: vi.fn((index: number) => {
    const keys = Object.keys(localStorageMock.store);
    return keys[index] || null;
  })
};

// ============================================================================
// CONFIGURACIÓN GLOBAL
// ============================================================================

beforeAll(() => {
  // Instalar mock de fetch
  global.fetch = mockFetch as unknown as typeof fetch;
  
  // Instalar mock de localStorage
  Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true
  });
  
  // Silenciar console.warn para URLs no mockeadas (opcional)
  // vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  // Limpiar mocks entre tests
  mockFetch.mockClear();
  localStorageMock.clear();
});

afterAll(() => {
  // Restaurar fetch original
  global.fetch = originalFetch;
});

// ============================================================================
// UTILIDADES PARA TESTS
// ============================================================================

/**
 * Habilita temporalmente llamadas de red reales.
 * Útil para tests de integración específicos.
 */
export function enableRealNetwork() {
  process.env.PTEL_REAL_NETWORK = 'true';
}

/**
 * Deshabilita llamadas de red reales (vuelve a mocks).
 */
export function disableRealNetwork() {
  delete process.env.PTEL_REAL_NETWORK;
}

/**
 * Verifica cuántas llamadas fetch se hicieron.
 */
export function getFetchCallCount(): number {
  return mockFetch.mock.calls.length;
}

/**
 * Obtiene las URLs de todas las llamadas fetch.
 */
export function getFetchedUrls(): string[] {
  return mockFetch.mock.calls.map(call => {
    const input = call[0];
    return typeof input === 'string' ? input : input.toString();
  });
}
