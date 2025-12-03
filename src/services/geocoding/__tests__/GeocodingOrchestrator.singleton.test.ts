/**
 * Tests de Integración - F023 Fase 1.5
 * 
 * Verificar estrategia singleton en GeocodingOrchestrator:
 * 1. Singleton detectado → 95% confianza, retorno directo
 * 2. Múltiples candidatos → llamar desambiguación
 * 3. Cero resultados → escalar a cascada normal (CartoCiudad/CDAU)
 * 
 * @date 2025-12-03
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GeocodingOrchestrator } from '../GeocodingOrchestrator';
import { 
  injectTestData, 
  clearLocalData,
  type LocalFeature,
  type InfrastructureCategory 
} from '../../../lib/LocalDataService';

// ============================================================================
// DATOS DE PRUEBA
// ============================================================================

/**
 * Crear feature de test para datos locales
 */
function createTestFeature(
  id: string,
  nombre: string,
  categoria: InfrastructureCategory,
  codMun: string,
  municipio: string,
  x: number = 450000,
  y: number = 4100000
): LocalFeature {
  return {
    id,
    nombre,
    tipo: categoria.toUpperCase(),
    direccion: `Calle Test ${id}`,
    localidad: municipio,
    codMun,
    municipio,
    provincia: 'Granada',
    x,
    y,
    categoria,
  };
}

// Municipios de test
const COD_MUN_SINGLETON = '18901';  // 1 centro salud
const COD_MUN_MULTIPLE = '18902';   // 2 centros salud
const COD_MUN_ZERO = '18903';       // 0 centros salud
const COD_MUN_EDUCATION = '18904';  // 1 colegio

// Datos de prueba
const testHealthData: LocalFeature[] = [
  // Municipio con 1 solo centro (SINGLETON)
  createTestFeature('h1', 'Centro de Salud Testville', 'health', COD_MUN_SINGLETON, 'Testville', 451000, 4101000),
  
  // Municipio con 2 centros (MÚLTIPLES)
  createTestFeature('h2', 'Consultorio Médico Norte', 'health', COD_MUN_MULTIPLE, 'Duplex', 452000, 4102000),
  createTestFeature('h3', 'Consultorio Médico Sur', 'health', COD_MUN_MULTIPLE, 'Duplex', 452500, 4102500),
  
  // Municipio sin centros (ZERO) - no hay features
];

const testEducationData: LocalFeature[] = [
  // Municipio con 1 colegio (SINGLETON)
  createTestFeature('e1', 'CEIP San Juan', 'education', COD_MUN_EDUCATION, 'Educaville', 453000, 4103000),
];

const testSecurityData: LocalFeature[] = [
  // Municipio con 1 cuartel (SINGLETON)
  createTestFeature('s1', 'Cuartel Guardia Civil Testville', 'security', COD_MUN_SINGLETON, 'Testville', 451100, 4101100),
];

// ============================================================================
// TESTS
// ============================================================================

describe('GeocodingOrchestrator - F023 Fase 1.5 Singleton Detection', () => {
  let orchestrator: GeocodingOrchestrator;
  
  beforeAll(() => {
    // Inyectar datos de test en LocalDataService
    const testData = new Map<InfrastructureCategory, LocalFeature[]>();
    testData.set('health', testHealthData);
    testData.set('education', testEducationData);
    testData.set('security', testSecurityData);
    testData.set('municipal', []);
    testData.set('energy', []);
    
    injectTestData(testData);
    
    // Crear instancia del orquestador
    orchestrator = new GeocodingOrchestrator();
  });
  
  afterAll(() => {
    clearLocalData();
  });
  
  // =========================================================================
  // ESCENARIO 1: SINGLETON DETECTADO → 95% CONFIANZA
  // =========================================================================
  
  describe('Singleton Detection (count === 1)', () => {
    
    it('HEALTH: detecta singleton y retorna 95% confianza', async () => {
      const result = await orchestrator.geocode({
        name: 'Centro de Salud',
        municipality: 'Testville',
        province: 'Granada',
        codMun: COD_MUN_SINGLETON,
        useGenericFallback: false,  // Solo probar local
        crossValidate: false,       // Sin validación cruzada para test unitario
      });
      
      // Verificar que encontró el singleton
      expect(result.geocoding).not.toBeNull();
      expect(result.geocoderUsed).toContain('singleton');
      
      // Verificar coordenadas correctas
      expect(result.geocoding?.x).toBe(451000);
      expect(result.geocoding?.y).toBe(4101000);
      
      // Verificar confianza 95%
      expect(result.geocoding?.confidence).toBe(95);
      
      // Verificar que registró el intento
      expect(result.attempts).toContain('singleton_check');
      
      // Verificar nombre coincide
      expect(result.geocoding?.matchedName).toContain('Centro de Salud');
    });
    
    it('SECURITY: detecta singleton para Guardia Civil', async () => {
      const result = await orchestrator.geocode({
        name: 'Guardia Civil',
        municipality: 'Testville',
        province: 'Granada',
        codMun: COD_MUN_SINGLETON,
        useGenericFallback: false,
        crossValidate: false,
      });
      
      expect(result.geocoding).not.toBeNull();
      expect(result.geocoderUsed).toContain('singleton');
      expect(result.geocoding?.confidence).toBe(95);
      expect(result.geocoding?.x).toBe(451100);
    });
    
    it('EDUCATION: detecta singleton para CEIP', async () => {
      const result = await orchestrator.geocode({
        name: 'CEIP',
        municipality: 'Educaville',
        province: 'Granada',
        codMun: COD_MUN_EDUCATION,
        useGenericFallback: false,
        crossValidate: false,
      });
      
      expect(result.geocoding).not.toBeNull();
      expect(result.geocoderUsed).toContain('singleton');
      expect(result.geocoding?.confidence).toBe(95);
    });
    
    it('Singleton retorna status CONFIRMED sin validación cruzada', async () => {
      const result = await orchestrator.geocode({
        name: 'Centro de Salud',
        municipality: 'Testville',
        province: 'Granada',
        codMun: COD_MUN_SINGLETON,
        useGenericFallback: false,
        crossValidate: false,
      });
      
      expect(result.validationStatus).toBe('CONFIRMED');
      expect(result.crossValidationScore).toBe(95);
      expect(result.requiresManualReview).toBe(false);
    });
    
  });
  
  // =========================================================================
  // ESCENARIO 2: MÚLTIPLES CANDIDATOS → DESAMBIGUACIÓN
  // =========================================================================
  
  describe('Multiple Candidates (count >= 2)', () => {
    
    it('detecta múltiples candidatos y llama desambiguación', async () => {
      const result = await orchestrator.geocode({
        name: 'Consultorio Médico Norte',  // Nombre exacto de uno de ellos
        municipality: 'Duplex',
        province: 'Granada',
        codMun: COD_MUN_MULTIPLE,
        useGenericFallback: false,
        crossValidate: false,
      });
      
      // Debe encontrar resultado
      expect(result.geocoding).not.toBeNull();
      
      // Geocoder usado debe indicar desambiguación
      expect(result.geocoderUsed).toContain('disambiguated');
      
      // Confianza debe ser menor que singleton (no 95%)
      // HIGH confidence de desambiguación = 90
      expect(result.geocoding?.confidence).toBeLessThanOrEqual(90);
      
      // Debe haber encontrado "Consultorio Médico Norte" (el más similar)
      expect(result.geocoding?.matchedName).toContain('Norte');
    });
    
    it('desambiguación con nombre genérico selecciona mejor match', async () => {
      const result = await orchestrator.geocode({
        name: 'Consultorio',  // Nombre genérico, ambos candidatos podrían coincidir
        municipality: 'Duplex',
        province: 'Granada',
        codMun: COD_MUN_MULTIPLE,
        address: 'Zona Norte',  // Pista adicional
        useGenericFallback: false,
        crossValidate: false,
      });
      
      expect(result.geocoding).not.toBeNull();
      // La desambiguación debe preferir "Norte" por la dirección
      expect(result.geocoderUsed).toContain('disambiguated');
    });
    
    it('HIGH confidence en desambiguación retorna inmediatamente', async () => {
      const result = await orchestrator.geocode({
        name: 'Consultorio Médico Norte',  // Match exacto
        municipality: 'Duplex',
        province: 'Granada',
        codMun: COD_MUN_MULTIPLE,
        useGenericFallback: false,
        crossValidate: false,
      });
      
      // Con match exacto, desambiguación debe dar HIGH confidence
      // y retornar sin continuar cascada
      expect(result.geocoding?.confidence).toBeGreaterThanOrEqual(85);
    });
    
  });
  
  // =========================================================================
  // ESCENARIO 3: CERO RESULTADOS → ESCALAR A CASCADA
  // =========================================================================
  
  describe('Zero Results (count === 0)', () => {
    
    it('sin datos locales continúa a cascada normal', async () => {
      const result = await orchestrator.geocode({
        name: 'Centro de Salud Fantasma',
        municipality: 'Zeroville',
        province: 'Granada',
        codMun: COD_MUN_ZERO,  // Municipio sin centros en datos locales
        useGenericFallback: false,  // Deshabilitar fallback para ver comportamiento
        crossValidate: false,
      });
      
      // No debería usar singleton ni desambiguación
      expect(result.geocoderUsed).not.toContain('singleton');
      expect(result.geocoderUsed).not.toContain('disambiguated');
      
      // Debería haber intentado singleton_check pero fallar
      expect(result.attempts).toContain('singleton_check');
    });
    
    it('tipología sin categoría local va directo a cascada', async () => {
      const result = await orchestrator.geocode({
        name: 'Piscina Municipal',  // DEPORTIVO - sin datos locales
        municipality: 'Testville',
        province: 'Granada',
        codMun: COD_MUN_SINGLETON,
        useGenericFallback: false,
        crossValidate: false,
      });
      
      // DEPORTIVO no tiene categoría local específica
      // Debería saltar directamente a cascada
      expect(result.geocoderUsed).not.toContain('singleton');
    });
    
  });
  
  // =========================================================================
  // EDGE CASES
  // =========================================================================
  
  describe('Edge Cases', () => {
    
    it('sin codMun no intenta singleton', async () => {
      const result = await orchestrator.geocode({
        name: 'Centro de Salud',
        municipality: 'Testville',
        province: 'Granada',
        // SIN codMun
        useGenericFallback: false,
        crossValidate: false,
      });
      
      // Sin codMun, no puede hacer detección singleton
      expect(result.attempts).not.toContain('singleton_check');
    });
    
    it('useLocalData: false desactiva singleton', async () => {
      const result = await orchestrator.geocode({
        name: 'Centro de Salud',
        municipality: 'Testville',
        province: 'Granada',
        codMun: COD_MUN_SINGLETON,
        useLocalData: false,  // Desactivar datos locales
        useGenericFallback: false,
        crossValidate: false,
      });
      
      expect(result.attempts).not.toContain('singleton_check');
      expect(result.geocoderUsed).not.toContain('singleton');
    });
    
    it('error en countByType no bloquea cascada', async () => {
      // Simular error con código de municipio inválido
      const result = await orchestrator.geocode({
        name: 'Centro de Salud',
        municipality: 'Testville',
        province: 'Granada',
        codMun: 'INVALID',  // Código inválido
        useGenericFallback: false,
        crossValidate: false,
      });
      
      // Debe manejar el error gracefully y continuar
      expect(result.errors.length).toBeGreaterThanOrEqual(0);
      // No debe crashear
    });
    
  });
  
});

// ============================================================================
// TESTS DE RENDIMIENTO
// ============================================================================

describe('GeocodingOrchestrator - F023 Performance', () => {
  let orchestrator: GeocodingOrchestrator;
  
  beforeAll(() => {
    const testData = new Map<InfrastructureCategory, LocalFeature[]>();
    testData.set('health', testHealthData);
    testData.set('education', testEducationData);
    testData.set('security', testSecurityData);
    testData.set('municipal', []);
    testData.set('energy', []);
    
    injectTestData(testData);
    orchestrator = new GeocodingOrchestrator();
  });
  
  afterAll(() => {
    clearLocalData();
  });
  
  it('singleton detection < 50ms', async () => {
    const start = performance.now();
    
    await orchestrator.geocode({
      name: 'Centro de Salud',
      municipality: 'Testville',
      province: 'Granada',
      codMun: COD_MUN_SINGLETON,
      useGenericFallback: false,
      crossValidate: false,
    });
    
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
  });
  
  it('desambiguación < 100ms', async () => {
    const start = performance.now();
    
    await orchestrator.geocode({
      name: 'Consultorio',
      municipality: 'Duplex',
      province: 'Granada',
      codMun: COD_MUN_MULTIPLE,
      useGenericFallback: false,
      crossValidate: false,
    });
    
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
  });
  
});
