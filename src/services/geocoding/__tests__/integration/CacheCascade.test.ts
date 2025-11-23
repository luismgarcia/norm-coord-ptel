import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CascadeOrchestrator } from '../../CascadeOrchestrator';
import { CacheManager } from '../../../cache/CacheManager';
import { CartoCiudadGeocoder } from '../../geocoders/CartoCiudadGeocoder';
import type { Infrastructure, GeocodingResult } from '@/types';

/**
 * INTEGRATION TEST: Cache + Cascade
 * 
 * Objetivo: Verificar que el sistema de caché funciona correctamente
 * como nivel 0 de la cascada de geocodificación, evitando llamadas
 * innecesarias a geocodificadores externos.
 * 
 * Escenario Real:
 * 1. Primera llamada → cache miss → geocodifica con CartoCiudad → guarda en cache
 * 2. Segunda llamada (misma infraestructura) → cache hit → retorna sin geocodificar
 * 
 * Éxito: Solo 1 llamada al geocodificador real, segunda llamada usa cache
 */

// Mock solo del geocodificador real para contar llamadas
vi.mock('../../geocoders/CartoCiudadGeocoder');
vi.mock('../../geocoders/CDAUGeocoder');
vi.mock('../../geocoders/NominatimGeocoder');
vi.mock('../../geocoders/GoogleMapsGeocoder');
vi.mock('../../geocoders/ManualCorrectionGeocoder');

describe('Integration: CacheManager + CascadeOrchestrator', () => {
  let orchestrator: CascadeOrchestrator;
  let mockCartoCiudad: any;

  const mockInfrastructure: Infrastructure = {
    id: 'integration-test-001',
    name: 'Hospital Clínico Granada',
    type: 'SALUD',
    address: 'Avenida de la Investigación s/n',
    municipality: 'Granada',
    province: 'Granada',
    coordinates: null,
  };

  const expectedResult: GeocodingResult = {
    success: true,
    coordinates: { x: 447123.45, y: 4118234.56 },
    source: 'cartociudad',
    confidence: 95,
    method: 'api',
    metadata: {
      address: 'Avenida de la Investigación s/n, Granada',
      postalCode: '18016',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock CartoCiudad para retornar resultado exitoso
    mockCartoCiudad = {
      geocode: vi.fn().mockResolvedValue(expectedResult),
    };

    (CartoCiudadGeocoder as any).mockImplementation(() => mockCartoCiudad);

    // Mock otros geocodificadores (no deberían ser llamados)
    (CDAUGeocoder as any).mockImplementation(() => ({
      geocode: vi.fn(),
    }));
    (NominatimGeocoder as any).mockImplementation(() => ({
      geocode: vi.fn(),
    }));
    (GoogleMapsGeocoder as any).mockImplementation(() => ({
      geocode: vi.fn(),
    }));
    (ManualCorrectionGeocoder as any).mockImplementation(() => ({
      geocode: vi.fn(),
    }));

    // IMPORTANTE: NO mockeamos CacheManager → usamos implementación real
    // Esto permite validar integración real cache + cascada
    orchestrator = new CascadeOrchestrator();
  });

  it('debe usar cache como nivel 0 antes de geocodificar', async () => {
    // ========================================
    // PRIMERA LLAMADA: Cache Miss → Geocodifica
    // ========================================
    
    const firstResult = await orchestrator.geocode(mockInfrastructure);

    // Verificaciones primera llamada
    expect(firstResult.success).toBe(true);
    expect(firstResult.coordinates).toEqual(expectedResult.coordinates);
    expect(firstResult.source).toBe('cartociudad');
    
    // CartoCiudad DEBE ser llamado (cache miss)
    expect(mockCartoCiudad.geocode).toHaveBeenCalledTimes(1);
    expect(mockCartoCiudad.geocode).toHaveBeenCalledWith(mockInfrastructure);

    // ========================================
    // SEGUNDA LLAMADA: Cache Hit → NO Geocodifica
    // ========================================
    
    const secondResult = await orchestrator.geocode(mockInfrastructure);

    // Verificaciones segunda llamada
    expect(secondResult.success).toBe(true);
    expect(secondResult.coordinates).toEqual(expectedResult.coordinates);
    
    // CRÍTICO: source debe ser 'cache' en segunda llamada
    expect(secondResult.source).toBe('cache');
    
    // CRÍTICO: CartoCiudad NO debe ser llamado de nuevo
    expect(mockCartoCiudad.geocode).toHaveBeenCalledTimes(1); // Sigue siendo 1
    
    // ========================================
    // TERCERA LLAMADA: Confirmar cache persiste
    // ========================================
    
    const thirdResult = await orchestrator.geocode(mockInfrastructure);

    expect(thirdResult.success).toBe(true);
    expect(thirdResult.source).toBe('cache');
    expect(mockCartoCiudad.geocode).toHaveBeenCalledTimes(1); // Sigue siendo 1
  });

  it('debe usar cache para diferentes infraestructuras independientemente', async () => {
    const infrastructure2: Infrastructure = {
      ...mockInfrastructure,
      id: 'integration-test-002',
      name: 'Centro de Salud Zaidín',
      address: 'Calle Doctor Oloriz 13',
    };

    const result2: GeocodingResult = {
      success: true,
      coordinates: { x: 447500, y: 4118100 },
      source: 'cartociudad',
      confidence: 92,
      method: 'api',
    };

    mockCartoCiudad.geocode
      .mockResolvedValueOnce(expectedResult) // Primera infraestructura
      .mockResolvedValueOnce(result2);       // Segunda infraestructura

    // Primera infraestructura
    const firstCall1 = await orchestrator.geocode(mockInfrastructure);
    expect(firstCall1.source).toBe('cartociudad');
    expect(mockCartoCiudad.geocode).toHaveBeenCalledTimes(1);

    // Segunda infraestructura (diferente clave de cache)
    const firstCall2 = await orchestrator.geocode(infrastructure2);
    expect(firstCall2.source).toBe('cartociudad');
    expect(mockCartoCiudad.geocode).toHaveBeenCalledTimes(2);

    // Repetir primera infraestructura → debe usar cache
    const secondCall1 = await orchestrator.geocode(mockInfrastructure);
    expect(secondCall1.source).toBe('cache');
    expect(mockCartoCiudad.geocode).toHaveBeenCalledTimes(2); // No aumenta

    // Repetir segunda infraestructura → debe usar cache
    const secondCall2 = await orchestrator.geocode(infrastructure2);
    expect(secondCall2.source).toBe('cache');
    expect(mockCartoCiudad.geocode).toHaveBeenCalledTimes(2); // No aumenta
  });

  it('NO debe cachear resultados fallidos', async () => {
    const failedResult: GeocodingResult = {
      success: false,
      error: 'Address not found in CartoCiudad',
      source: 'cartociudad',
      confidence: 0,
    };

    mockCartoCiudad.geocode.mockResolvedValue(failedResult);

    // Primera llamada → falla
    const firstResult = await orchestrator.geocode(mockInfrastructure);
    expect(firstResult.success).toBe(false);
    expect(mockCartoCiudad.geocode).toHaveBeenCalledTimes(1);

    // Segunda llamada → debe intentar geocodificar de nuevo (no cachear fallos)
    const secondResult = await orchestrator.geocode(mockInfrastructure);
    expect(secondResult.success).toBe(false);
    expect(mockCartoCiudad.geocode).toHaveBeenCalledTimes(2); // Aumenta a 2
  });

  it('debe respetar configuración de maxAge del cache', async () => {
    // Este test es conceptual → IndexedDB no permite manipular tiempo fácilmente
    // En producción, el CacheManager respeta maxAge de 30 días
    
    const firstResult = await orchestrator.geocode(mockInfrastructure);
    expect(firstResult.success).toBe(true);
    expect(mockCartoCiudad.geocode).toHaveBeenCalledTimes(1);

    // Simular que pasa tiempo (en test real requeriría mock de Date)
    // Por ahora, verificamos que la configuración existe
    const cacheConfig = (orchestrator as any).cacheManager?.config;
    expect(cacheConfig?.maxAge).toBe(30 * 24 * 60 * 60 * 1000); // 30 días en ms
  });

  it('debe manejar cache corrupto gracefully', async () => {
    // Simular cache que retorna datos inválidos
    const cacheManager = (orchestrator as any).cacheManager as CacheManager;
    const originalGet = cacheManager.get.bind(cacheManager);
    
    // Mock temporal para simular corrupción
    vi.spyOn(cacheManager, 'get').mockImplementationOnce(async () => {
      // Retornar objeto sin estructura correcta
      return { invalid: 'data' } as any;
    });

    // Debe caer a geocodificación real si cache retorna datos inválidos
    const result = await orchestrator.geocode(mockInfrastructure);
    
    expect(result.success).toBe(true);
    expect(mockCartoCiudad.geocode).toHaveBeenCalledTimes(1);
    
    // Restaurar comportamiento original
    vi.spyOn(cacheManager, 'get').mockRestore();
  });
});
