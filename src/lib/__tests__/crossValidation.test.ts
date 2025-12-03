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


// ============================================================================
// SESIÓN 2B: Tests de Clustering
// ============================================================================

import {
  simpleCentroid,
  huberCentroid,
  identifyOutliers,
  calculateClusterRadius,
  calculateConcordanceScore,
  analyzeResultClusters
} from '../crossValidation';

describe('simpleCentroid', () => {
  it('lanza error con array vacío', () => {
    expect(() => simpleCentroid([])).toThrow('array vacío');
  });

  it('devuelve el mismo punto para un solo elemento', () => {
    const p: UTMPoint = { x: 524538, y: 4229920 };
    const result = simpleCentroid([p]);
    expect(result).toEqual(p);
  });

  it('calcula centroide correcto para 2 puntos', () => {
    const points: UTMPoint[] = [
      { x: 0, y: 0 },
      { x: 100, y: 100 }
    ];
    const result = simpleCentroid(points);
    expect(result.x).toBe(50);
    expect(result.y).toBe(50);
  });

  it('calcula centroide correcto para 4 puntos (cuadrado)', () => {
    const points: UTMPoint[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 }
    ];
    const result = simpleCentroid(points);
    expect(result.x).toBe(50);
    expect(result.y).toBe(50);
  });
});

describe('huberCentroid', () => {
  it('lanza error con array vacío', () => {
    expect(() => huberCentroid([])).toThrow('array vacío');
  });

  it('devuelve el punto original para un solo elemento', () => {
    const p: UTMPoint = { x: 524538, y: 4229920 };
    const { centroid, weights } = huberCentroid([p]);
    expect(centroid).toEqual(p);
    expect(weights).toEqual([1]);
  });

  it('devuelve centroide simple para 2 puntos', () => {
    const points: UTMPoint[] = [
      { x: 0, y: 0 },
      { x: 100, y: 100 }
    ];
    const { centroid, weights } = huberCentroid(points);
    expect(centroid.x).toBe(50);
    expect(centroid.y).toBe(50);
    expect(weights).toEqual([1, 1]);
  });

  it('reduce influencia de outlier', () => {
    const points: UTMPoint[] = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 5, y: 5 },
      { x: 1000, y: 1000 }  // Outlier muy lejano
    ];
    
    const { centroid, weights } = huberCentroid(points);
    
    // El centroide debería estar más cerca de los 3 puntos agrupados
    // que de la media simple (que sería ~254, ~254)
    expect(centroid.x).toBeLessThan(100);
    expect(centroid.y).toBeLessThan(100);
    
    // El outlier debería tener peso reducido
    expect(weights[3]).toBeLessThan(0.5);
  });

  it('trata puntos cercanos con peso igual', () => {
    const points: UTMPoint[] = [
      { x: 524538, y: 4229920 },
      { x: 524540, y: 4229922 },
      { x: 524535, y: 4229918 }
    ];
    
    const { weights } = huberCentroid(points);
    
    // Todos los puntos están cerca, deberían tener peso ~1
    weights.forEach(w => {
      expect(w).toBeGreaterThan(0.9);
    });
  });
});


describe('identifyOutliers', () => {
  it('devuelve array vacío sin outliers', () => {
    const results: SourceResult[] = [
      {
        sourceId: 'LOCAL',
        sourceName: 'Local',
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
        result: { coordinates: { x: 524540, y: 4229922 } },
        error: null,
        responseTimeMs: 50,
        status: 'success'
      }
    ];
    
    const centroid = { x: 524539, y: 4229921 };
    const weights = [1, 1];
    
    const outliers = identifyOutliers(results, centroid, weights);
    expect(outliers).toEqual([]);
  });

  it('identifica outlier por distancia', () => {
    const results: SourceResult[] = [
      {
        sourceId: 'LOCAL',
        sourceName: 'Local',
        authorityWeight: 0.95,
        result: { coordinates: { x: 524538, y: 4229920 } },
        error: null,
        responseTimeMs: 10,
        status: 'success'
      },
      {
        sourceId: 'NOMINATIM',
        sourceName: 'Nominatim',
        authorityWeight: 0.55,
        result: { coordinates: { x: 525000, y: 4230500 } }, // ~700m lejos
        error: null,
        responseTimeMs: 200,
        status: 'success'
      }
    ];
    
    const centroid = { x: 524538, y: 4229920 };
    const weights = [1, 0.3]; // Peso bajo para Nominatim
    
    const outliers = identifyOutliers(results, centroid, weights, 100);
    expect(outliers).toContain('NOMINATIM');
    expect(outliers).not.toContain('LOCAL');
  });

  it('identifica outlier por peso bajo', () => {
    const results: SourceResult[] = [
      {
        sourceId: 'LOCAL',
        sourceName: 'Local',
        authorityWeight: 0.95,
        result: { coordinates: { x: 524538, y: 4229920 } },
        error: null,
        responseTimeMs: 10,
        status: 'success'
      }
    ];
    
    const centroid = { x: 524538, y: 4229920 };
    const weights = [0.3]; // Peso bajo
    
    const outliers = identifyOutliers(results, centroid, weights);
    expect(outliers).toContain('LOCAL');
  });
});

describe('calculateClusterRadius', () => {
  it('devuelve 0 para array vacío', () => {
    const radius = calculateClusterRadius([], { x: 0, y: 0 });
    expect(radius).toBe(0);
  });

  it('devuelve 0 para punto único en el centroide', () => {
    const points = [{ x: 100, y: 100 }];
    const radius = calculateClusterRadius(points, { x: 100, y: 100 });
    expect(radius).toBe(0);
  });

  it('calcula radio máximo correctamente', () => {
    const points: UTMPoint[] = [
      { x: 0, y: 0 },
      { x: 30, y: 40 },  // A 50m del origen
      { x: 10, y: 10 }   // A ~14m del origen
    ];
    const centroid = { x: 0, y: 0 };
    
    const radius = calculateClusterRadius(points, centroid);
    expect(radius).toBe(50);
  });

  it('excluye outliers del cálculo del radio', () => {
    const points: UTMPoint[] = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 1000, y: 1000 }  // Outlier
    ];
    const centroid = { x: 5, y: 5 };
    const weights = [1, 1, 0.2]; // Último es outlier
    
    const radius = calculateClusterRadius(points, centroid, weights);
    // Solo cuenta los dos primeros puntos
    expect(radius).toBeLessThan(20);
  });
});


describe('calculateConcordanceScore', () => {
  it('devuelve 0 sin resultados exitosos', () => {
    const results: SourceResult[] = [
      {
        sourceId: 'LOCAL',
        sourceName: 'Local',
        authorityWeight: 0.95,
        result: null,
        error: null,
        responseTimeMs: 10,
        status: 'error'
      }
    ];
    
    const score = calculateConcordanceScore(results, []);
    expect(score).toBe(0);
  });

  it('devuelve 1 para único resultado', () => {
    const results: SourceResult[] = [
      {
        sourceId: 'LOCAL',
        sourceName: 'Local',
        authorityWeight: 0.95,
        result: { coordinates: { x: 524538, y: 4229920 } },
        error: null,
        responseTimeMs: 10,
        status: 'success'
      }
    ];
    
    const score = calculateConcordanceScore(results, []);
    expect(score).toBe(1);
  });

  it('devuelve 1 cuando todas las fuentes concuerdan', () => {
    const results: SourceResult[] = [
      {
        sourceId: 'LOCAL',
        sourceName: 'Local',
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
        result: { coordinates: { x: 524540, y: 4229922 } },
        error: null,
        responseTimeMs: 50,
        status: 'success'
      }
    ];
    
    const score = calculateConcordanceScore(results, []);
    expect(score).toBe(1);
  });

  it('reduce score con outliers (ponderado por autoridad)', () => {
    const results: SourceResult[] = [
      {
        sourceId: 'LOCAL',
        sourceName: 'Local',
        authorityWeight: 0.95,
        result: { coordinates: { x: 524538, y: 4229920 } },
        error: null,
        responseTimeMs: 10,
        status: 'success'
      },
      {
        sourceId: 'NOMINATIM',
        sourceName: 'Nominatim',
        authorityWeight: 0.55,
        result: { coordinates: { x: 525000, y: 4230500 } },
        error: null,
        responseTimeMs: 200,
        status: 'success'
      }
    ];
    
    // Nominatim es outlier
    const score = calculateConcordanceScore(results, ['NOMINATIM']);
    // Score = 0.95 / (0.95 + 0.55) = 0.633
    expect(score).toBeCloseTo(0.633, 2);
  });
});

describe('analyzeResultClusters', () => {
  it('devuelve null sin resultados exitosos', () => {
    const results: SourceResult[] = [
      {
        sourceId: 'LOCAL',
        sourceName: 'Local',
        authorityWeight: 0.95,
        result: null,
        error: null,
        responseTimeMs: 10,
        status: 'error'
      }
    ];
    
    const analysis = analyzeResultClusters(results);
    expect(analysis).toBeNull();
  });

  it('maneja un solo resultado correctamente', () => {
    const results: SourceResult[] = [
      {
        sourceId: 'LOCAL',
        sourceName: 'Local',
        authorityWeight: 0.95,
        result: { coordinates: { x: 524538, y: 4229920 } },
        error: null,
        responseTimeMs: 10,
        status: 'success'
      }
    ];
    
    const analysis = analyzeResultClusters(results);
    
    expect(analysis).not.toBeNull();
    expect(analysis!.centroid.x).toBe(524538);
    expect(analysis!.centroid.y).toBe(4229920);
    expect(analysis!.radiusMeters).toBe(0);
    expect(analysis!.concordantSources).toBe(1);
    expect(analysis!.outlierSources).toEqual([]);
    expect(analysis!.concordanceScore).toBe(1);
  });


  it('detecta alta concordancia (fuentes cercanas)', () => {
    const results: SourceResult[] = [
      {
        sourceId: 'LOCAL',
        sourceName: 'Local',
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
        result: { coordinates: { x: 524540, y: 4229922 } }, // ~3m
        error: null,
        responseTimeMs: 50,
        status: 'success'
      },
      {
        sourceId: 'CDAU',
        sourceName: 'CDAU',
        authorityWeight: 0.80,
        result: { coordinates: { x: 524535, y: 4229918 } }, // ~4m
        error: null,
        responseTimeMs: 60,
        status: 'success'
      }
    ];
    
    const analysis = analyzeResultClusters(results);
    
    expect(analysis).not.toBeNull();
    expect(analysis!.concordantSources).toBe(3);
    expect(analysis!.outlierSources).toHaveLength(0);
    expect(analysis!.concordanceScore).toBeGreaterThan(0.9);
    expect(analysis!.radiusMeters).toBeLessThan(10);
  });

  it('detecta discordancia (fuente outlier)', () => {
    const results: SourceResult[] = [
      {
        sourceId: 'LOCAL',
        sourceName: 'Local',
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
        result: { coordinates: { x: 524540, y: 4229922 } },
        error: null,
        responseTimeMs: 50,
        status: 'success'
      },
      {
        sourceId: 'NOMINATIM',
        sourceName: 'Nominatim',
        authorityWeight: 0.55,
        result: { coordinates: { x: 525500, y: 4230800 } }, // ~1.2km lejos
        error: null,
        responseTimeMs: 200,
        status: 'success'
      }
    ];
    
    const analysis = analyzeResultClusters(results);
    
    expect(analysis).not.toBeNull();
    expect(analysis!.outlierSources).toContain('NOMINATIM');
    expect(analysis!.concordantSources).toBe(2);
    expect(analysis!.concordanceScore).toBeLessThan(1);
    // El centroide debe estar cerca de LOCAL y CARTOCIUDAD, no del outlier
    expect(analysis!.centroid.x).toBeCloseTo(524539, -1);
  });

  it('filtra resultados no exitosos', () => {
    const results: SourceResult[] = [
      {
        sourceId: 'LOCAL',
        sourceName: 'Local',
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
        responseTimeMs: 50,
        status: 'timeout'
      },
      {
        sourceId: 'CDAU',
        sourceName: 'CDAU',
        authorityWeight: 0.80,
        result: null,
        error: null,
        responseTimeMs: 60,
        status: 'no_results'
      }
    ];
    
    const analysis = analyzeResultClusters(results);
    
    expect(analysis).not.toBeNull();
    // Solo cuenta LOCAL que es el único exitoso
    expect(analysis!.concordantSources).toBe(1);
    expect(analysis!.concordanceScore).toBe(1);
  });
});
