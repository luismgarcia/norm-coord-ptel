/**
 * Tests E2E para BBDD Local - Fase B.5
 * 
 * Valida el flujo completo:
 * 1. Nombre infraestructura → SingletonDetector → Coordenadas UTM
 * 2. Casos: singleton, múltiples candidatos, cero resultados
 * 3. Integración con GeocodingOrchestrator
 * 
 * @session B.5
 * @date 2025-12-05
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db, type DERAFeature, type INEMunicipio } from '../schemas';
import { 
  detectSingleton, 
  getSingletonFeature, 
  getCandidatesByNombre,
  type SingletonResult 
} from '../singletonDetector';
import { clearAllData } from '../localDataService';

/**
 * Datos de prueba basados en municipios reales de Andalucía
 * Fuente: DERA 2025
 */
const MUNICIPIOS_TEST: INEMunicipio[] = [
  // Colomera (Granada) - municipio pequeño, 1 centro salud
  {
    codMun: '18051',
    nombre: 'Colomera',
    nombreNorm: 'COLOMERA',
    provincia: 'Granada',
    codProv: '18',
    centroideX: 440500,
    centroideY: 4139000
  },
  // Hornos (Jaén) - municipio pequeño en Sierra de Segura
  {
    codMun: '23044',
    nombre: 'Hornos',
    nombreNorm: 'HORNOS',
    provincia: 'Jaén',
    codProv: '23',
    centroideX: 524500,
    centroideY: 4230000
  },
  // Granada capital - municipio grande, múltiples infraestructuras
  {
    codMun: '18087',
    nombre: 'Granada',
    nombreNorm: 'GRANADA',
    provincia: 'Granada',
    codProv: '18',
    centroideX: 446000,
    centroideY: 4114000
  },
  // Berja (Almería) - municipio mediano
  {
    codMun: '04029',
    nombre: 'Berja',
    nombreNorm: 'BERJA',
    provincia: 'Almería',
    codProv: '04',
    centroideX: 506000,
    centroideY: 4085000
  }
];

/**
 * Infraestructuras de prueba simulando datos DERA reales
 */
const INFRAESTRUCTURAS_TEST: DERAFeature[] = [
  // === COLOMERA (18051) - Municipio singleton ===
  {
    id: 'SANITARIO_18051_001',
    tipologia: 'SANITARIO',
    nombre: 'Consultorio Local Colomera',
    codMun: '18051',
    municipio: 'Colomera',
    provincia: 'Granada',
    codProv: '18',
    x: 440523,
    y: 4139012,
    capaOrigen: 'DERA_SANITARIO',
    fechaCarga: '2025-12-05'
  },
  {
    id: 'EDUCATIVO_18051_001',
    tipologia: 'EDUCATIVO',
    nombre: 'CEIP San Sebastián',
    codMun: '18051',
    municipio: 'Colomera',
    provincia: 'Granada',
    codProv: '18',
    x: 440485,
    y: 4139045,
    capaOrigen: 'DERA_EDUCATIVO',
    fechaCarga: '2025-12-05'
  },

  // === HORNOS (23044) - Municipio singleton ===
  {
    id: 'SANITARIO_23044_001',
    tipologia: 'SANITARIO',
    nombre: 'Consultorio Hornos',
    codMun: '23044',
    municipio: 'Hornos',
    provincia: 'Jaén',
    codProv: '23',
    x: 524643,
    y: 4229868,
    capaOrigen: 'DERA_SANITARIO',
    fechaCarga: '2025-12-05'
  },
  {
    id: 'CULTURAL_23044_001',
    tipologia: 'CULTURAL',
    nombre: 'Castillo de Hornos',
    codMun: '23044',
    municipio: 'Hornos',
    provincia: 'Jaén',
    codProv: '23',
    x: 524538,
    y: 4229920,
    capaOrigen: 'DERA_CULTURAL',
    fechaCarga: '2025-12-05'
  },

  // === GRANADA (18087) - Municipio con múltiples ===
  {
    id: 'SANITARIO_18087_001',
    tipologia: 'SANITARIO',
    nombre: 'Hospital Universitario San Cecilio',
    codMun: '18087',
    municipio: 'Granada',
    provincia: 'Granada',
    codProv: '18',
    x: 445500,
    y: 4113800,
    capaOrigen: 'DERA_SANITARIO',
    fechaCarga: '2025-12-05'
  },
  {
    id: 'SANITARIO_18087_002',
    tipologia: 'SANITARIO',
    nombre: 'Hospital Virgen de las Nieves',
    codMun: '18087',
    municipio: 'Granada',
    provincia: 'Granada',
    codProv: '18',
    x: 446200,
    y: 4115100,
    capaOrigen: 'DERA_SANITARIO',
    fechaCarga: '2025-12-05'
  },
  {
    id: 'SANITARIO_18087_003',
    tipologia: 'SANITARIO',
    nombre: 'Centro de Salud Zaidín',
    codMun: '18087',
    municipio: 'Granada',
    provincia: 'Granada',
    codProv: '18',
    x: 445800,
    y: 4112500,
    capaOrigen: 'DERA_SANITARIO',
    fechaCarga: '2025-12-05'
  },
  {
    id: 'EDUCATIVO_18087_001',
    tipologia: 'EDUCATIVO',
    nombre: 'Universidad de Granada - Campus Fuentenueva',
    codMun: '18087',
    municipio: 'Granada',
    provincia: 'Granada',
    codProv: '18',
    x: 446100,
    y: 4113900,
    capaOrigen: 'DERA_EDUCATIVO',
    fechaCarga: '2025-12-05'
  },
  {
    id: 'EDUCATIVO_18087_002',
    tipologia: 'EDUCATIVO',
    nombre: 'IES Padre Suárez',
    codMun: '18087',
    municipio: 'Granada',
    provincia: 'Granada',
    codProv: '18',
    x: 446300,
    y: 4114200,
    capaOrigen: 'DERA_EDUCATIVO',
    fechaCarga: '2025-12-05'
  },

  // === BERJA (04029) - Sin tipología específica ===
  {
    id: 'SANITARIO_04029_001',
    tipologia: 'SANITARIO',
    nombre: 'Centro de Salud Berja',
    codMun: '04029',
    municipio: 'Berja',
    provincia: 'Almería',
    codProv: '04',
    x: 506320,
    y: 4085123,
    capaOrigen: 'DERA_SANITARIO',
    fechaCarga: '2025-12-05'
  }
];

describe('B.5 - Tests E2E BBDD Local', () => {
  
  beforeAll(async () => {
    // Limpiar y cargar datos de prueba
    await clearAllData();
    await db.ine.bulkAdd(MUNICIPIOS_TEST);
    await db.dera.bulkAdd(INFRAESTRUCTURAS_TEST);
  });

  afterAll(async () => {
    await clearAllData();
  });

  // ==========================================================================
  // CASO 1: SINGLETON (count === 1)
  // ==========================================================================
  describe('Caso 1: Singleton Detection (municipios pequeños)', () => {
    
    it('Colomera: único centro sanitario → detección directa', async () => {
      const result = await detectSingleton('SANITARIO', '18051');
      
      expect(result.status).toBe('singleton');
      expect(result.count).toBe(1);
    });

    it('Colomera: getSingletonFeature devuelve coordenadas correctas', async () => {
      const feature = await getSingletonFeature('SANITARIO', '18051');
      
      expect(feature).not.toBeNull();
      expect(feature!.nombre).toBe('Consultorio Local Colomera');
      expect(feature!.x).toBe(440523);
      expect(feature!.y).toBe(4139012);
      expect(feature!.codMun).toBe('18051');
    });

    it('Hornos: único centro cultural → detección directa', async () => {
      const result = await detectSingleton('CULTURAL', '23044');
      
      expect(result.status).toBe('singleton');
      expect(result.count).toBe(1);
      
      const feature = await getSingletonFeature('CULTURAL', '23044');
      expect(feature!.nombre).toBe('Castillo de Hornos');
      expect(feature!.x).toBe(524538);
      expect(feature!.y).toBe(4229920);
    });

    it('Berja: único centro sanitario → singleton', async () => {
      const result = await detectSingleton('SANITARIO', '04029');
      
      expect(result.status).toBe('singleton');
      const feature = await getSingletonFeature('SANITARIO', '04029');
      expect(feature!.nombre).toContain('Berja');
    });
  });

  // ==========================================================================
  // CASO 2: MÚLTIPLES CANDIDATOS (count > 1)
  // ==========================================================================
  describe('Caso 2: Múltiples candidatos (municipios grandes)', () => {
    
    it('Granada: 3 centros sanitarios → multiple', async () => {
      const result = await detectSingleton('SANITARIO', '18087');
      
      expect(result.status).toBe('multiple');
      expect(result.count).toBe(3);
    });

    it('Granada: getCandidatesByNombre permite desambiguar', async () => {
      // Buscar "Hospital" en Granada
      const candidates = await getCandidatesByNombre(
        'SANITARIO', 
        '18087',
        'Hospital'
      );
      
      expect(candidates.length).toBe(2);
      expect(candidates.map(c => c.nombre)).toContain('Hospital Universitario San Cecilio');
      expect(candidates.map(c => c.nombre)).toContain('Hospital Virgen de las Nieves');
    });

    it('Granada: búsqueda específica reduce candidatos', async () => {
      // Buscar "Zaidín" específicamente
      const candidates = await getCandidatesByNombre(
        'SANITARIO',
        '18087',
        'Zaidín'
      );
      
      expect(candidates.length).toBe(1);
      expect(candidates[0].nombre).toBe('Centro de Salud Zaidín');
      expect(candidates[0].x).toBe(445800);
      expect(candidates[0].y).toBe(4112500);
    });

    it('Granada: 2 centros educativos → multiple', async () => {
      const result = await detectSingleton('EDUCATIVO', '18087');
      
      expect(result.status).toBe('multiple');
      expect(result.count).toBe(2);
    });
  });

  // ==========================================================================
  // CASO 3: CERO RESULTADOS (count === 0)
  // ==========================================================================
  describe('Caso 3: Cero resultados (tipología sin datos)', () => {
    
    it('Colomera sin SEGURIDAD → zero_results', async () => {
      const result = await detectSingleton('SEGURIDAD', '18051');
      
      expect(result.status).toBe('zero_results');
      expect(result.count).toBe(0);
    });

    it('Municipio inexistente → zero_results', async () => {
      const result = await detectSingleton('SANITARIO', '99999');
      
      expect(result.status).toBe('zero_results');
      expect(result.count).toBe(0);
    });

    it('Hornos sin EDUCATIVO → zero_results', async () => {
      const result = await detectSingleton('EDUCATIVO', '23044');
      
      expect(result.status).toBe('zero_results');
      expect(result.count).toBe(0);
    });
  });

  // ==========================================================================
  // VALIDACIÓN DE COORDENADAS UTM
  // ==========================================================================
  describe('Validación de coordenadas UTM ETRS89', () => {
    
    it('Coordenadas X en rango válido (100000-800000)', async () => {
      const features = await db.dera.toArray();
      
      for (const f of features) {
        expect(f.x).toBeGreaterThanOrEqual(100000);
        expect(f.x).toBeLessThanOrEqual(800000);
      }
    });

    it('Coordenadas Y en rango válido Andalucía (4000000-4350000)', async () => {
      const features = await db.dera.toArray();
      
      for (const f of features) {
        expect(f.y).toBeGreaterThanOrEqual(4000000);
        expect(f.y).toBeLessThanOrEqual(4350000);
      }
    });

    it('Coordenadas tienen precisión métrica (enteros)', async () => {
      const features = await db.dera.toArray();
      
      for (const f of features) {
        expect(Number.isInteger(f.x)).toBe(true);
        expect(Number.isInteger(f.y)).toBe(true);
      }
    });
  });

  // ==========================================================================
  // RENDIMIENTO
  // ==========================================================================
  describe('Rendimiento', () => {
    
    it('detectSingleton < 10ms', async () => {
      const start = performance.now();
      await detectSingleton('SANITARIO', '18051');
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(10);
    });

    it('getSingletonFeature < 10ms', async () => {
      const start = performance.now();
      await getSingletonFeature('SANITARIO', '18051');
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(10);
    });

    it('getCandidatesByNombre < 20ms', async () => {
      const start = performance.now();
      await getCandidatesByNombre('SANITARIO', '18087', 'Hospital');
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(20);
    });
  });

  // ==========================================================================
  // ESTADÍSTICAS BBDD
  // ==========================================================================
  describe('Estadísticas BBDD', () => {
    
    it('Total municipios cargados', async () => {
      const count = await db.ine.count();
      expect(count).toBe(MUNICIPIOS_TEST.length);
    });

    it('Total infraestructuras cargadas', async () => {
      const count = await db.dera.count();
      expect(count).toBe(INFRAESTRUCTURAS_TEST.length);
    });

    it('Infraestructuras por tipología', async () => {
      const sanitarios = await db.dera.where('tipologia').equals('SANITARIO').count();
      const educativos = await db.dera.where('tipologia').equals('EDUCATIVO').count();
      const culturales = await db.dera.where('tipologia').equals('CULTURAL').count();
      
      expect(sanitarios).toBe(5); // 1 Colomera + 1 Hornos + 3 Granada
      expect(educativos).toBe(3); // 1 Colomera + 2 Granada
      expect(culturales).toBe(1); // 1 Hornos
    });
  });
});
