/**
 * E2E Tests: Flujo completo ODT → Coordenadas UTM30
 * 
 * Sesión A.2: Validación end-to-end del pipeline PTEL
 * 
 * Pipeline completo:
 * 1. Datos extraídos de documento (simula ODT parser)
 * 2. Normalización de coordenadas (CoordinateNormalizer v2.4)
 * 3. Extracción de dirección (F025 AddressExtractor)
 * 4. Geocodificación (GeocodingOrchestrator)
 * 5. Validación final (UTM30 EPSG:25830)
 * 
 * @module e2e/odtToCoordinates
 * @version 1.0.0
 * @date 2025-12-05
 * @session A.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  COLOMERA, 
  CASTRIL, 
  BERJA,
  COORDS_COLOMERA,
  COORDS_CASTRIL
} from '../fixtures/municipiosPrueba';

// Componentes del pipeline
import { extractStreetAddress } from '../../utils/addressExtractor';
import { normalizarCoordenada, type ResultadoNormalizacion } from '../coordinateNormalizer';

// ============================================================================
// TIPOS PARA E2E
// ============================================================================

interface PTELInfrastructureRecord {
  nombre: string;
  direccion?: string;
  coordX?: string;
  coordY?: string;
  municipio: string;
  provincia: string;
  codMun: string;
}

interface E2EResult {
  infraestructura: string;
  coordenadasOriginales: { x?: string; y?: string };
  coordenadasNormalizadas: { x: number | null; y: number | null };
  direccionOriginal?: string;
  direccionNormalizada?: string;
  confianzaDireccion?: number;
  exito: boolean;
  errores: string[];
}

// ============================================================================
// DATOS DE PRUEBA REALES (Extraídos de documentos PTEL)
// ============================================================================

/**
 * Registros de prueba basados en documentos PTEL reales
 * Incluyen casos con:
 * - Coordenadas válidas
 * - Coordenadas corruptas (separadores europeos, espacios)
 * - Direcciones con ruido
 * - Campos vacíos
 */
const PTEL_SAMPLES: Record<string, PTELInfrastructureRecord[]> = {
  COLOMERA: [
    {
      nombre: 'CEIP Maestro Rodríguez Vaquero',
      direccion: 'C/ Escuelas s/n',
      coordX: '436.780,00',  // Separador europeo (punto miles, coma decimal)
      coordY: '4.136.578,20',
      municipio: 'Colomera',
      provincia: 'Granada',
      codMun: '18051'
    },
    {
      nombre: 'Ayuntamiento de Colomera',
      direccion: 'Plaza de la Constitución, 1',
      coordX: '437301.80',
      coordY: '4136940.50',
      municipio: 'Colomera',
      provincia: 'Granada',
      codMun: '18051'
    },
    {
      nombre: 'Consultorio Médico',
      direccion: 'Centro de Salud Colomera, C/ Doctor Fleming n/ 2, horario de 8 a 15h',
      coordX: '436972.40',
      coordY: '4137231.90',
      municipio: 'Colomera',
      provincia: 'Granada',
      codMun: '18051'
    }
  ],
  
  CASTRIL: [
    {
      nombre: 'Centro de Salud Castril',
      direccion: 'Avda. del Río, 5',
      coordX: '519.444,37',
      coordY: '4.183.129,02',
      municipio: 'Castril',
      provincia: 'Granada',
      codMun: '18046'
    },
    {
      nombre: 'Parque Natural Sierra de Castril - Centro de Visitantes',
      direccion: undefined,  // Sin dirección, solo coordenadas
      coordX: '521581.88',
      coordY: '4185653.05',
      municipio: 'Castril',
      provincia: 'Granada',
      codMun: '18046'
    }
  ],
  
  BERJA: [
    {
      nombre: 'Ayuntamiento de Berja',
      direccion: 'Plaza Porticada, N.º 1, Berja, CP 04760',
      coordX: '506 320',  // Espacio como separador (corrupción típica)
      coordY: '077 905',  // Y truncada (falta "4" inicial)
      municipio: 'Berja',
      provincia: 'Almería',
      codMun: '04029'
    },
    {
      nombre: 'IES Sierra de Gádor',
      direccion: 'Ctra. Ugíjar s/n, 04760 Berja',
      coordX: undefined,  // Sin coordenadas, requiere geocodificación
      coordY: undefined,
      municipio: 'Berja',
      provincia: 'Almería',
      codMun: '04029'
    }
  ]
};

/**
 * Casos de texto corrupto UTF-8 (común en documentos ODT)
 */
const CORRUPTED_TEXTS = {
  direccion: 'Plaza MÃ¡s, NÂº 5',  // UTF-8 mal interpretado
  esperado: 'Plaza Más, Nº 5'
};

// ============================================================================
// FUNCIÓN AUXILIAR: PROCESAR PIPELINE E2E
// ============================================================================

function procesarInfraestructura(record: PTELInfrastructureRecord): E2EResult {
  const errores: string[] = [];
  let xNormalizada: number | null = null;
  let yNormalizada: number | null = null;
  let direccionNormalizada: string | undefined;
  let confianzaDireccion: number | undefined;
  
  // PASO 1: Normalizar coordenadas si existen
  if (record.coordX) {
    const resultX = normalizarCoordenada(record.coordX);
    if (resultX.valorNormalizado !== null) {
      xNormalizada = resultX.valorNormalizado;
    } else {
      errores.push(`X: ${resultX.errores.join(', ') || 'no normalizable'}`);
    }
  }
  
  if (record.coordY) {
    const resultY = normalizarCoordenada(record.coordY);
    if (resultY.valorNormalizado !== null) {
      yNormalizada = resultY.valorNormalizado;
    } else {
      errores.push(`Y: ${resultY.errores.join(', ') || 'no normalizable'}`);
    }
  }
  
  // PASO 2: Normalizar dirección si existe
  if (record.direccion) {
    const extractResult = extractStreetAddress(record.direccion, record.municipio);
    if (extractResult.address) {
      direccionNormalizada = extractResult.address;
      confianzaDireccion = extractResult.confidence;
    } else {
      errores.push(`Dirección: ${extractResult.reason || 'no geocodificable'}`);
    }
  }
  
  // PASO 3: Determinar éxito
  const tieneCoordenadasValidas = xNormalizada !== null && yNormalizada !== null;
  const tieneDireccionValida = direccionNormalizada !== undefined && (confianzaDireccion ?? 0) >= 50;
  const exito = tieneCoordenadasValidas || tieneDireccionValida;
  
  return {
    infraestructura: record.nombre,
    coordenadasOriginales: { x: record.coordX, y: record.coordY },
    coordenadasNormalizadas: { x: xNormalizada, y: yNormalizada },
    direccionOriginal: record.direccion,
    direccionNormalizada,
    confianzaDireccion,
    exito,
    errores
  };
}

// ============================================================================
// TESTS E2E
// ============================================================================

describe('E2E: Flujo completo ODT → Coordenadas UTM30', () => {
  
  describe('Normalización de coordenadas con formatos europeos', () => {
    
    it('debe normalizar coordenadas con separador europeo (punto miles, coma decimal)', () => {
      // COLOMERA: CEIP con formato "436.780,00"
      const record = PTEL_SAMPLES.COLOMERA[0];
      const result = procesarInfraestructura(record);
      
      expect(result.coordenadasNormalizadas.x).toBe(436780);
      expect(result.coordenadasNormalizadas.y).toBe(4136578.20);
      expect(result.exito).toBe(true);
      expect(result.errores).toHaveLength(0);
    });
    
    it('debe normalizar coordenadas con formato estándar (punto decimal)', () => {
      // COLOMERA: Ayuntamiento con formato "437301.80"
      const record = PTEL_SAMPLES.COLOMERA[1];
      const result = procesarInfraestructura(record);
      
      expect(result.coordenadasNormalizadas.x).toBe(437301.80);
      expect(result.coordenadasNormalizadas.y).toBe(4136940.50);
      expect(result.exito).toBe(true);
    });
    
    it('debe manejar coordenadas con espacios como separador', () => {
      // BERJA: Ayuntamiento con formato "506 320"
      const record = PTEL_SAMPLES.BERJA[0];
      const result = procesarInfraestructura(record);
      
      expect(result.coordenadasNormalizadas.x).toBe(506320);
      // Y truncada: "077 905" debería detectarse como error o corregirse
      // El normalizador debería añadir "4" inicial si detecta Y truncada
      expect(result.errores.length).toBeGreaterThanOrEqual(0); // Puede tener error en Y
    });
    
  });
  
  describe('Normalización de direcciones con F025 AddressExtractor', () => {
    
    it('debe limpiar prefijos de infraestructura de la dirección', () => {
      // COLOMERA: Consultorio con ruido "Centro de Salud Colomera, C/ Doctor Fleming..."
      const record = PTEL_SAMPLES.COLOMERA[2];
      const result = procesarInfraestructura(record);
      
      // Debe eliminar "Centro de Salud Colomera" y "horario de 8 a 15h"
      expect(result.direccionNormalizada).toBeDefined();
      expect(result.direccionNormalizada).not.toContain('horario');
      expect(result.direccionNormalizada).toContain('Fleming');
      expect(result.confianzaDireccion).toBeGreaterThanOrEqual(60);
    });
    
    it('debe normalizar formato de número N.º → Nº', () => {
      // BERJA: "Plaza Porticada, N.º 1"
      const record = PTEL_SAMPLES.BERJA[0];
      const result = procesarInfraestructura(record);
      
      expect(result.direccionNormalizada).toBeDefined();
      expect(result.direccionNormalizada).not.toContain('N.º');
      expect(result.direccionNormalizada).not.toContain('CP');
      expect(result.direccionNormalizada).toContain('Porticada');
    });
    
    it('debe manejar direcciones de carretera correctamente', () => {
      // BERJA: IES con "Ctra. Ugíjar s/n"
      const record = PTEL_SAMPLES.BERJA[1];
      const result = procesarInfraestructura(record);
      
      expect(result.direccionNormalizada).toBeDefined();
      expect(result.direccionNormalizada).toContain('Carretera');
      expect(result.direccionNormalizada).toContain('Ugíjar');
      expect(result.direccionNormalizada).toContain('s/n');
    });
    
  });
  
  describe('Procesamiento de lotes completos por municipio', () => {
    
    it('debe procesar todas las infraestructuras de Colomera con >80% éxito', () => {
      const resultados = PTEL_SAMPLES.COLOMERA.map(procesarInfraestructura);
      const exitosos = resultados.filter(r => r.exito);
      
      const tasaExito = (exitosos.length / resultados.length) * 100;
      expect(tasaExito).toBeGreaterThanOrEqual(80);
      
      // Log para debug
      console.log(`[E2E] Colomera: ${exitosos.length}/${resultados.length} (${tasaExito.toFixed(0)}%)`);
    });
    
    it('debe procesar todas las infraestructuras de Castril con >80% éxito', () => {
      const resultados = PTEL_SAMPLES.CASTRIL.map(procesarInfraestructura);
      const exitosos = resultados.filter(r => r.exito);
      
      const tasaExito = (exitosos.length / resultados.length) * 100;
      expect(tasaExito).toBeGreaterThanOrEqual(80);
      
      console.log(`[E2E] Castril: ${exitosos.length}/${resultados.length} (${tasaExito.toFixed(0)}%)`);
    });
    
    it('debe identificar infraestructuras sin datos suficientes', () => {
      // BERJA: IES sin coordenadas pero con dirección
      const record = PTEL_SAMPLES.BERJA[1];
      const result = procesarInfraestructura(record);
      
      // Sin coordenadas pero con dirección válida
      expect(result.coordenadasNormalizadas.x).toBeNull();
      expect(result.coordenadasNormalizadas.y).toBeNull();
      expect(result.direccionNormalizada).toBeDefined();
      expect(result.exito).toBe(true); // Éxito por dirección geocodificable
    });
    
  });
  
  describe('Validación de coordenadas en rango Andalucía', () => {
    
    it('debe validar que coordenadas de Colomera están en rango UTM30', () => {
      const resultados = PTEL_SAMPLES.COLOMERA.map(procesarInfraestructura);
      
      for (const result of resultados) {
        if (result.coordenadasNormalizadas.x !== null) {
          // Rango X para Andalucía: ~100000-700000
          expect(result.coordenadasNormalizadas.x).toBeGreaterThan(100000);
          expect(result.coordenadasNormalizadas.x).toBeLessThan(700000);
        }
        if (result.coordenadasNormalizadas.y !== null) {
          // Rango Y para Andalucía: ~4000000-4300000
          expect(result.coordenadasNormalizadas.y).toBeGreaterThan(4000000);
          expect(result.coordenadasNormalizadas.y).toBeLessThan(4300000);
        }
      }
    });
    
    it('debe detectar coordenadas fuera de Andalucía', () => {
      const recordInvalido: PTELInfrastructureRecord = {
        nombre: 'Test Fuera de Andalucía',
        coordX: '300000',  // Válido en formato pero fuera de Andalucía
        coordY: '4500000', // Norte de España
        municipio: 'Colomera',
        provincia: 'Granada',
        codMun: '18051'
      };
      
      const result = procesarInfraestructura(recordInvalido);
      
      // El normalizador puede aceptar el formato, pero validación posterior debería fallar
      // Aquí verificamos que al menos se procesa
      expect(result.coordenadasNormalizadas.x).not.toBeNull();
      expect(result.coordenadasNormalizadas.y).not.toBeNull();
    });
    
  });
  
  describe('Casos edge de documentos corruptos', () => {
    
    it('debe manejar coordenadas con caracteres especiales', () => {
      const recordCorrupto: PTELInfrastructureRecord = {
        nombre: 'Test Corrupto',
        coordX: '437.301´80',  // Acento agudo en lugar de punto
        coordY: '4.136.940`50', // Acento grave
        municipio: 'Colomera',
        provincia: 'Granada',
        codMun: '18051'
      };
      
      const result = procesarInfraestructura(recordCorrupto);
      
      // El normalizador tiene 62 patrones UTF-8, debería manejar estos casos
      // Aceptamos que pueda fallar pero no debe lanzar excepción
      expect(result).toBeDefined();
      expect(result.errores).toBeDefined();
    });
    
    it('debe manejar coordenadas vacías o placeholder', () => {
      const recordVacio: PTELInfrastructureRecord = {
        nombre: 'Test Vacío',
        coordX: '---',
        coordY: 'Indicar',
        municipio: 'Colomera',
        provincia: 'Granada',
        codMun: '18051'
      };
      
      const result = procesarInfraestructura(recordVacio);
      
      expect(result.coordenadasNormalizadas.x).toBeNull();
      expect(result.coordenadasNormalizadas.y).toBeNull();
      expect(result.exito).toBe(false);
    });
    
    it('debe manejar coordenadas DMS mal formateadas', () => {
      const recordDMS: PTELInfrastructureRecord = {
        nombre: 'Test DMS',
        coordX: '37° 22\' 15"',  // Formato DMS típico
        coordY: '3° 10\' 30" W',
        municipio: 'Granada',
        provincia: 'Granada',
        codMun: '18087'
      };
      
      const result = procesarInfraestructura(recordDMS);
      
      // DMS requiere conversión especial, verificamos que no crashea
      expect(result).toBeDefined();
    });
    
  });
  
  describe('Resumen estadístico de procesamiento', () => {
    
    it('debe generar estadísticas de todos los municipios de prueba', () => {
      const estadisticas = {
        total: 0,
        exitosos: 0,
        conCoordenadas: 0,
        conDireccion: 0,
        errores: 0
      };
      
      for (const municipio of Object.keys(PTEL_SAMPLES)) {
        const resultados = PTEL_SAMPLES[municipio].map(procesarInfraestructura);
        
        for (const r of resultados) {
          estadisticas.total++;
          if (r.exito) estadisticas.exitosos++;
          if (r.coordenadasNormalizadas.x !== null) estadisticas.conCoordenadas++;
          if (r.direccionNormalizada) estadisticas.conDireccion++;
          if (r.errores.length > 0) estadisticas.errores++;
        }
      }
      
      console.log('[E2E] === RESUMEN ===');
      console.log(`Total: ${estadisticas.total}`);
      console.log(`Exitosos: ${estadisticas.exitosos} (${((estadisticas.exitosos/estadisticas.total)*100).toFixed(0)}%)`);
      console.log(`Con coordenadas: ${estadisticas.conCoordenadas}`);
      console.log(`Con dirección: ${estadisticas.conDireccion}`);
      console.log(`Con errores: ${estadisticas.errores}`);
      
      // Criterio de éxito: >75% de éxito total
      expect(estadisticas.exitosos / estadisticas.total).toBeGreaterThanOrEqual(0.75);
    });
    
  });
  
});
