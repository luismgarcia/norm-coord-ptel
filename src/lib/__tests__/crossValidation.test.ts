/**
 * crossValidation.test.ts - Tests para validación cruzada
 * 
 * F023 Fase 2 - Sesión 2A
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  distanceUTM,
  pointsWithinTolerance,
  queryMultipleSources,
  getSuccessfulResults,
  extractCoordinates,
  type UTMPoint,
  type GeocodingSource,
  type GeocodingQuery,
  type SourceResult
} from '../crossValidation';

// ============================================================================
// Tests distanceUTM
// ============================================================================

describe('distanceUTM', () => {
  it('calcula distancia cero para mismo punto', () => {
    const p: UTMPoint = { x: 524538, y: 4229920 };
    expect(distanceUTM(p, p)).toBe(0);
  });

  it('calcula distancia horizontal correcta', () => {
    const p1: UTMPoint = { x: 0, y: 0 };
    const p2: UTMPoint = { x: 100, y: 0 };
    expect(distanceUTM(p1, p2)).toBe(100);
  });

  it('calcula distancia vertical correcta', () => {
    const p1: UTMPoint = { x: 0, y: 0 };
    const p2: UTMPoint = { x: 0, y: 50 };
    expect(distanceUTM(p1, p2)).toBe(50);
  });

  it('calcula distancia diagonal (3-4-5)', () => {
    const p1: UTMPoint = { x: 0, y: 0 };
    const p2: UTMPoint = { x: 3, y: 4 };
    expect(distanceUTM(p1, p2)).toBe(5);
  });

  it('calcula distancia con coordenadas UTM reales', () => {
    // Dos puntos en Almería separados ~100m
    const p1: UTMPoint = { x: 524538, y: 4229920 };
    const p2: UTMPoint = { x: 524600, y: 4230000 };
    const distance = distanceUTM(p1, p2);
    // sqrt((62)^2 + (80)^2) ≈ 101.2
    expect(distance).toBeCloseTo(101.2, 0);
  });

  it('es simétrica (d(a,b) = d(b,a))', () => {
    const p1: UTMPoint = { x: 500000, y: 4200000 };
    const p2: UTMPoint = { x: 500100, y: 4200050 };
    expect(distanceUTM(p1, p2)).toBe(distanceUTM(p2, p1));
  });
});


// ============================================================================
// Tests pointsWithinTolerance
// ============================================================================

describe('pointsWithinTolerance', () => {
  it('puntos idénticos están dentro de cualquier tolerancia', () => {
    const p: UTMPoint = { x: 524538, y: 4229920 };
    expect(pointsWithinTolerance(p, p, 1)).toBe(true);
    expect(pointsWithinTolerance(p, p, 0)).toBe(true);
  });

  it('puntos a 50m dentro de tolerancia 100m', () => {
    const p1: UTMPoint = { x: 500000, y: 4200000 };
    const p2: UTMPoint = { x: 500050, y: 4200000 };
    expect(pointsWithinTolerance(p1, p2, 100)).toBe(true);
  });

  it('puntos a 100m exactos dentro de tolerancia 100m', () => {
    const p1: UTMPoint = { x: 500000, y: 4200000 };
    const p2: UTMPoint = { x: 500100, y: 4200000 };
    expect(pointsWithinTolerance(p1, p2, 100)).toBe(true);
  });

  it('puntos a 101m fuera de tolerancia 100m', () => {
    const p1: UTMPoint = { x: 500000, y: 4200000 };
    const p2: UTMPoint = { x: 500101, y: 4200000 };
    expect(pointsWithinTolerance(p1, p2, 100)).toBe(false);
  });
});

// ============================================================================
// Tests queryMultipleSources
// ============================================================================

describe('queryMultipleSources', () => {
  const mockQuery: GeocodingQuery = {
    nombre: 'Centro de Salud Test',
    codMun: '04013',
    municipio: 'Berja',
    tipologia: 'SANITARIO'
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('devuelve array vacío si no hay fuentes', async () => {
    const results = await queryMultipleSources(mockQuery, []);
    expect(results).toEqual([]);
  });

  it('procesa una fuente exitosa correctamente', async () => {
    const mockSource: GeocodingSource = {
      id: 'LOCAL',
      name: 'Datos Locales',
      authorityWeight: 0.95,
      geocode: vi.fn().mockResolvedValue({
        coordinates: { x: 524538, y: 4229920 },
        matchedName: 'Centro de Salud Test',
        matchScore: 95
      })
    };

    const promise = queryMultipleSources(mockQuery, [mockSource]);
    await vi.runAllTimersAsync();
    const results = await promise;

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('success');
    expect(results[0].sourceId).toBe('LOCAL');
    expect(results[0].result?.coordinates.x).toBe(524538);
  });


  it('procesa múltiples fuentes en paralelo', async () => {
    const sources: GeocodingSource[] = [
      {
        id: 'LOCAL',
        name: 'Datos Locales',
        authorityWeight: 0.95,
        geocode: vi.fn().mockResolvedValue({
          coordinates: { x: 524538, y: 4229920 }
        })
      },
      {
        id: 'CARTOCIUDAD',
        name: 'CartoCiudad',
        authorityWeight: 0.80,
        geocode: vi.fn().mockResolvedValue({
          coordinates: { x: 524540, y: 4229922 }
        })
      }
    ];

    const promise = queryMultipleSources(mockQuery, sources);
    await vi.runAllTimersAsync();
    const results = await promise;

    expect(results).toHaveLength(2);
    expect(results.every(r => r.status === 'success')).toBe(true);
  });

  it('continúa cuando una fuente falla', async () => {
    const sources: GeocodingSource[] = [
      {
        id: 'LOCAL',
        name: 'Datos Locales',
        authorityWeight: 0.95,
        geocode: vi.fn().mockRejectedValue(new Error('Network error'))
      },
      {
        id: 'CARTOCIUDAD',
        name: 'CartoCiudad',
        authorityWeight: 0.80,
        geocode: vi.fn().mockResolvedValue({
          coordinates: { x: 524540, y: 4229922 }
        })
      }
    ];

    const promise = queryMultipleSources(mockQuery, sources);
    await vi.runAllTimersAsync();
    const results = await promise;

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('error');
    expect(results[1].status).toBe('success');
  });

  it('marca sin resultados cuando fuente devuelve null', async () => {
    const mockSource: GeocodingSource = {
      id: 'NOMINATIM',
      name: 'Nominatim OSM',
      authorityWeight: 0.55,
      geocode: vi.fn().mockResolvedValue(null)
    };

    const promise = queryMultipleSources(mockQuery, [mockSource]);
    await vi.runAllTimersAsync();
    const results = await promise;

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('no_results');
    expect(results[0].result).toBeNull();
  });

  it('respeta timeout individual por fuente', async () => {
    const slowSource: GeocodingSource = {
      id: 'WFS_HEALTH',
      name: 'WFS Salud',
      authorityWeight: 0.85,
      timeoutMs: 100, // 100ms timeout
      geocode: vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          coordinates: { x: 500000, y: 4200000 }
        }), 200)) // Tarda 200ms
      )
    };

    const promise = queryMultipleSources(mockQuery, [slowSource]);
    
    // Avanzar 150ms - debería haber saltado el timeout
    await vi.advanceTimersByTimeAsync(150);
    const results = await promise;

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('timeout');
  });
});


// ============================================================================
// Tests funciones auxiliares
// ============================================================================

describe('getSuccessfulResults', () => {
  it('filtra solo resultados exitosos', () => {
    const results: SourceResult[] = [
      {
        sourceId: 'LOCAL',
        sourceName: 'Datos Locales',
        authorityWeight: 0.95,
        result: { coordinates: { x: 524538, y: 4229920 } },
        error: null,
        responseTimeMs: 10,
        status: 'success'
      },
      {
        sourceId: 'CARTOCIUDAD',
        sourceName: 'CartoCiudad',
        authorityWeight: 0.80,
        result: null,
        error: null,
        responseTimeMs: 100,
        status: 'no_results'
      },
      {
        sourceId: 'CDAU',
        sourceName: 'CDAU',
        authorityWeight: 0.80,
        result: { coordinates: { x: 524540, y: 4229925 } },
        error: null,
        responseTimeMs: 50,
        status: 'success'
      }
    ];

    const successful = getSuccessfulResults(results);
    expect(successful).toHaveLength(2);
    expect(successful[0].sourceId).toBe('LOCAL');
    expect(successful[1].sourceId).toBe('CDAU');
  });

  it('devuelve array vacío si no hay éxitos', () => {
    const results: SourceResult[] = [
      {
        sourceId: 'LOCAL',
        sourceName: 'Datos Locales',
        authorityWeight: 0.95,
        result: null,
        error: null,
        responseTimeMs: 10,
        status: 'error'
      }
    ];

    expect(getSuccessfulResults(results)).toHaveLength(0);
  });
});

describe('extractCoordinates', () => {
  it('extrae coordenadas de resultados exitosos', () => {
    const results: SourceResult[] = [
      {
        sourceId: 'LOCAL',
        sourceName: 'Datos Locales',
        authorityWeight: 0.95,
        result: { coordinates: { x: 524538, y: 4229920 } },
        error: null,
        responseTimeMs: 10,
        status: 'success'
      },
      {
        sourceId: 'CARTOCIUDAD',
        sourceName: 'CartoCiudad',
        authorityWeight: 0.80,
        result: null,
        error: null,
        responseTimeMs: 100,
        status: 'error'
      },
      {
        sourceId: 'CDAU',
        sourceName: 'CDAU',
        authorityWeight: 0.80,
        result: { coordinates: { x: 524545, y: 4229930 } },
        error: null,
        responseTimeMs: 50,
        status: 'success'
      }
    ];

    const coords = extractCoordinates(results);
    expect(coords).toHaveLength(2);
    expect(coords[0]).toEqual({ x: 524538, y: 4229920 });
    expect(coords[1]).toEqual({ x: 524545, y: 4229930 });
  });
});
