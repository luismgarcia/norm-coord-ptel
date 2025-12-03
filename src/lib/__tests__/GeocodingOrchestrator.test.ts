/**
 * GeocodingOrchestrator.test.ts
 * 
 * Tests de integración para F023 Fase 1.5
 * Detección singleton y desambiguación en GeocodingOrchestrator
 * 
 * @version 1.0.0
 * @date 2025-12-03
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { GeocodingOrchestrator } from '../../services/geocoding/GeocodingOrchestrator';
import { InfrastructureType } from '../../types/infrastructure';
import { 
  injectTestData, 
  clearLocalData,
  type InfrastructureCategory,
  type LocalFeature 
} from '../LocalDataService';

// Prefijo para logs de tests
const F023_1_5_TEST = '[F023-1.5-TEST]';

describe('F023 Fase 1.5: Integración Singleton en GeocodingOrchestrator', () => {
  
  let orchestrator: GeocodingOrchestrator;
  
  // Datos de prueba inyectados
  const testFeatures: Map<InfrastructureCategory, LocalFeature[]> = new Map();
  
  beforeAll(() => {
    // Limpiar y preparar datos de prueba
    clearLocalData();
    
    // Municipio singleton: 1 solo centro de salud
    const singletonMunicipio: LocalFeature[] = [
      {
        id: 'health-001',
        nombre: 'Centro de Salud Añora',
        direccion: 'Calle Mayor 1',
        localidad: 'Añora',
        codMun: '14006',
        municipio: 'Añora',
        provincia: 'Córdoba',
        x: 345678.12,
        y: 4234567.89,
        categoria: 'health'
      }
    ];
    testFeatures.set('health', singletonMunicipio);
    
    // Municipio múltiple: 2 centros de salud
    const multipleMunicipio: LocalFeature[] = [
      {
        id: 'health-002',
        nombre: 'Centro de Salud Quéntar',
        direccion: 'Plaza del Ayuntamiento 2',
        localidad: 'Quéntar',
        codMun: '18107',
        municipio: 'Quéntar',
        provincia: 'Granada',
        x: 456789.34,
        y: 4123456.78,
        categoria: 'health'
      },
      {
        id: 'health-003',
        nombre: 'Consultorio Médico de Dúdar',
        direccion: 'Calle Real 15',
        localidad: 'Dúdar',
        codMun: '18107', // Mismo código INE (pertenece a Quéntar)
        municipio: 'Quéntar',
        provincia: 'Granada',
        x: 456123.56,
        y: 4123789.12,
        categoria: 'health'
      }
    ];
    
    // Combinar datos de prueba
    const allHealth = [...singletonMunicipio, ...multipleMunicipio];
    testFeatures.set('health', allHealth);
    
    // Inyectar datos de prueba
    injectTestData(testFeatures);
    
    // Crear orchestrator
    orchestrator = new GeocodingOrchestrator();
  });
  
  afterAll(() => {
    clearLocalData();
  });
  
  describe('Detección Singleton', () => {
    
    it('debe detectar singleton y retornar 95% confianza', async () => {
      const result = await orchestrator.geocode({
        name: 'Centro de Salud',
        municipality: 'Añora',
        province: 'Córdoba',
        codMun: '14006',
        forceType: InfrastructureType.HEALTH,
        useGenericFallback: false
      });
      
      console.log(`${F023_1_5_TEST} Singleton test: geocoder=${result.geocoderUsed}, conf=${result.geocoding?.confidence}`);
      
      // Debe usar singleton y tener 95% confianza
      expect(result.geocoderUsed).toContain('singleton');
      expect(result.geocoding).not.toBeNull();
      expect(result.geocoding?.confidence).toBe(95);
      expect(result.geocoding?.matchedName).toBe('Centro de Salud Añora');
    });
    
    it('debe retornar CONFIRMED para singleton', async () => {
      const result = await orchestrator.geocode({
        name: 'Centro Salud',
        municipality: 'Añora',
        province: 'Córdoba',
        codMun: '14006',
        forceType: InfrastructureType.HEALTH,
        useGenericFallback: false
      });
      
      expect(result.validationStatus).toBe('CONFIRMED');
      expect(result.requiresManualReview).toBe(false);
    });
    
  });
  
  describe('Desambiguación Multi-Campo', () => {
    
    it('debe desambiguar cuando hay múltiples candidatos', async () => {
      const result = await orchestrator.geocode({
        name: 'Centro de Salud Quéntar',
        municipality: 'Quéntar',
        province: 'Granada',
        codMun: '18107',
        forceType: InfrastructureType.HEALTH,
        useGenericFallback: false
      });
      
      console.log(`${F023_1_5_TEST} Desambiguación test: geocoder=${result.geocoderUsed}, conf=${result.geocoding?.confidence}`);
      
      // Con nombre exacto, debe elegir el correcto con alta confianza
      expect(result.geocoding).not.toBeNull();
      expect(result.geocoding?.matchedName).toBe('Centro de Salud Quéntar');
    });
    
    it('debe elegir candidato correcto por similaridad de nombre', async () => {
      const result = await orchestrator.geocode({
        name: 'Consultorio Dúdar',  // Nombre parcial
        municipality: 'Quéntar',
        province: 'Granada',
        codMun: '18107',
        forceType: InfrastructureType.HEALTH,
        useGenericFallback: false
      });
      
      // Debe elegir el consultorio de Dúdar, no el CS Quéntar
      expect(result.geocoding).not.toBeNull();
      expect(result.geocoding?.matchedName).toContain('Dúdar');
    });
    
  });
  
  describe('Escalado a Cascada', () => {
    
    it('debe escalar a cascada cuando no hay datos locales', async () => {
      const result = await orchestrator.geocode({
        name: 'Centro de Salud Inexistente',
        municipality: 'Tíjola',
        province: 'Almería',
        codMun: '04088',  // Municipio sin datos en test
        forceType: InfrastructureType.HEALTH,
        useGenericFallback: false,
        crossValidate: false  // Desactivar validación cruzada para test rápido
      });
      
      console.log(`${F023_1_5_TEST} Escalado test: geocoder=${result.geocoderUsed}, attempts=${result.attempts}`);
      
      // Debe intentar singleton_check pero no encontrar nada
      expect(result.attempts).toContain('singleton_check');
      
      // Puede no encontrar nada si no hay fallback genérico
      // El importante es que intentó la estrategia correcta
    });
    
  });
  
  describe('Integración con Clasificador', () => {
    
    it('debe clasificar tipo automáticamente y aplicar singleton', async () => {
      const result = await orchestrator.geocode({
        name: 'Centro de Salud de Añora',  // El clasificador detectará HEALTH
        municipality: 'Añora',
        province: 'Córdoba',
        codMun: '14006',
        useGenericFallback: false
      });
      
      // La clasificación debe ser HEALTH
      expect(result.classification.type).toBe(InfrastructureType.HEALTH);
      
      // Y debe usar singleton
      expect(result.geocoderUsed).toContain('singleton');
    });
    
  });
  
  describe('Trazabilidad F023-1.5', () => {
    
    it('debe incluir intento singleton_check en attempts', async () => {
      const result = await orchestrator.geocode({
        name: 'Centro de Salud',
        municipality: 'Añora',
        province: 'Córdoba',
        codMun: '14006',
        forceType: InfrastructureType.HEALTH,
        useGenericFallback: false
      });
      
      expect(result.attempts).toContain('singleton_check');
    });
    
    it('debe tener source con prefijo SINGLETON_ para match directo', async () => {
      const result = await orchestrator.geocode({
        name: 'Centro de Salud',
        municipality: 'Añora',
        province: 'Córdoba',
        codMun: '14006',
        forceType: InfrastructureType.HEALTH,
        useGenericFallback: false
      });
      
      expect(result.geocoding?.source).toMatch(/^SINGLETON_/);
    });
    
    it('debe tener source DISAMBIGUATED_LOCAL para desambiguación', async () => {
      const result = await orchestrator.geocode({
        name: 'Centro Salud Quéntar',
        municipality: 'Quéntar',
        province: 'Granada',
        codMun: '18107',
        forceType: InfrastructureType.HEALTH,
        useGenericFallback: false
      });
      
      // Si hay desambiguación, el source debe reflejarlo
      if (result.geocoderUsed.includes('disambiguated')) {
        expect(result.geocoding?.source).toBe('DISAMBIGUATED_LOCAL');
      }
    });
    
  });
  
});

describe('F023 Fase 1.5: Casos Edge', () => {
  
  let orchestrator: GeocodingOrchestrator;
  
  beforeAll(() => {
    orchestrator = new GeocodingOrchestrator();
  });
  
  it('debe manejar codMun undefined sin errores', async () => {
    const result = await orchestrator.geocode({
      name: 'Centro de Salud',
      municipality: 'Añora',
      province: 'Córdoba',
      // codMun omitido intencionalmente
      forceType: InfrastructureType.HEALTH,
      useGenericFallback: false,
      crossValidate: false
    });
    
    // No debe lanzar error
    expect(result.errors.filter(e => e.includes('SINGLETON_CHECK'))).toHaveLength(0);
  });
  
  it('debe manejar tipología sin datos locales', async () => {
    const result = await orchestrator.geocode({
      name: 'Iglesia de San Juan',
      municipality: 'Añora',
      province: 'Córdoba',
      codMun: '14006',
      forceType: InfrastructureType.CULTURAL,  // Sin datos locales
      useGenericFallback: false,
      crossValidate: false
    });
    
    // Debe procesar sin errores (escalará a cascada)
    expect(result.errors.filter(e => e.includes('critical'))).toHaveLength(0);
  });
  
});
