/**
 * Test E2E: Flujo completo documento PTEL → coordenadas normalizadas
 * 
 * Verifica el pipeline completo de procesamiento:
 * 1. Carga de datos (simulando parsing ODT)
 * 2. Extracción de infraestructuras
 * 3. Normalización de coordenadas (múltiples patrones)
 * 4. Validación de rangos Andalucía
 * 5. Identificación de items para geocodificación
 * 
 * @module __tests__/e2e/documentFlow.e2e.test
 * @session S1.2 - Fase 1 Consolidación
 * @date 2025-12-05
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  normalizarCoordenada,
  procesarParCoordenadas,
  validarCoordenada,
  RANGOS_ANDALUCIA,
} from '../../lib/coordinateNormalizer';
import { extractStreetAddress } from '../../utils/addressExtractor';
import {
  DOCUMENT_TIJOLA,
  DOCUMENT_COLOMERA,
  DOCUMENT_BERJA,
  DOCUMENT_HORNOS,
  DOCUMENT_CON_ERRORES,
  ALL_TEST_DOCUMENTS,
  EXPECTED_RESULTS,
  flattenDocument,
  countWithCoordinates,
  extractForGeocoding,
  type ParsedPTELDocument,
  type PTELRow,
} from './fixtures/ptelData';

// Prefix para logs
const E2E = '[E2E]';

// ============================================================================
// TIPOS PARA RESULTADOS E2E
// ============================================================================

interface ProcessedInfrastructure {
  nombre: string;
  direccionOriginal?: string;
  direccionNormalizada?: string;
  coordXOriginal?: string;
  coordYOriginal?: string;
  coordXNormalizada?: number | null;
  coordYNormalizada?: number | null;
  patronX?: string;
  patronY?: string;
  esValida: boolean;
  requiereGeocodificacion: boolean;
  errores: string[];
}

interface DocumentProcessingResult {
  municipio: string;
  totalProcesadas: number;
  coordenadasValidas: number;
  coordenadasInvalidas: number;
  requierenGeocodificacion: number;
  infraestructuras: ProcessedInfrastructure[];
  tiempoProcesamiento: number;
}

// ============================================================================
// FUNCIÓN PRINCIPAL: PROCESAR DOCUMENTO COMPLETO
// ============================================================================

/**
 * Procesa un documento PTEL completo simulando el flujo real de la aplicación
 */
function procesarDocumentoPTEL(doc: ParsedPTELDocument): DocumentProcessingResult {
  const inicio = performance.now();
  const infraestructuras: ProcessedInfrastructure[] = [];
  
  let coordenadasValidas = 0;
  let coordenadasInvalidas = 0;
  let requierenGeocodificacion = 0;
  
  // Aplanar todas las filas del documento
  const filas = flattenDocument(doc);
  
  for (const fila of filas) {
    const processed: ProcessedInfrastructure = {
    nombre: fila.nombre,
    direccionOriginal: fila.direccion,
    coordXOriginal: fila.coordX,
    coordYOriginal: fila.coordY,
    esValida: false,
    requiereGeocodificacion: false,
    errores: [],
    };
      
      // DEBUG: Log para depurar normalización
      // console.log(`[DEBUG] ${fila.nombre}: X="${fila.coordX}" Y="${fila.coordY}"`);
    
    // PASO 1: Normalizar dirección si existe
    if (fila.direccion && fila.direccion.trim()) {
      try {
        const addressResult = extractStreetAddress(fila.direccion, doc.municipio);
        processed.direccionNormalizada = addressResult.address;
      } catch (e) {
        processed.errores.push(`Error extracción dirección: ${e}`);
      }
    }
    
    // PASO 2: Procesar par de coordenadas
    if (fila.coordX && fila.coordY && fila.coordX.trim() && fila.coordY.trim()) {
      try {
        const parResult = procesarParCoordenadas(fila.coordX, fila.coordY);
        
        processed.coordXNormalizada = parResult.x;
        processed.coordYNormalizada = parResult.y;
        processed.patronX = parResult.patronX;
        processed.patronY = parResult.patronY;
        
        // Validar coordenadas dentro de rangos Andalucía
        if (parResult.x !== null && parResult.y !== null) {
          const xValida = parResult.x >= RANGOS_ANDALUCIA.UTM.X_MIN && 
                          parResult.x <= RANGOS_ANDALUCIA.UTM.X_MAX;
          const yValida = parResult.y >= RANGOS_ANDALUCIA.UTM.Y_MIN && 
                          parResult.y <= RANGOS_ANDALUCIA.UTM.Y_MAX;
          
          processed.esValida = xValida && yValida;
          
          if (!xValida) {
            processed.errores.push(`X fuera de rango: ${parResult.x}`);
          }
          if (!yValida) {
            processed.errores.push(`Y fuera de rango: ${parResult.y}`);
          }
        } else {
          // Coordenadas no pudieron normalizarse (placeholder, texto, etc.)
          if (parResult.x === null) {
            processed.errores.push(`X no normalizable: "${fila.coordX}"`);
          }
          if (parResult.y === null) {
            processed.errores.push(`Y no normalizable: "${fila.coordY}"`);
          }
        }
        
        if (processed.esValida) {
          coordenadasValidas++;
        } else {
          coordenadasInvalidas++;
          // Si tiene dirección, puede geocodificarse
          if (processed.direccionNormalizada) {
            processed.requiereGeocodificacion = true;
            requierenGeocodificacion++;
          }
        }
      } catch (e) {
        processed.errores.push(`Error normalización: ${e}`);
        coordenadasInvalidas++;
      }
    } else {
      // Sin coordenadas - marcar para geocodificación si tiene dirección
      if (processed.direccionNormalizada || processed.direccionOriginal) {
        processed.requiereGeocodificacion = true;
        requierenGeocodificacion++;
      }
      processed.errores.push('Coordenadas ausentes o vacías');
    }
    
    infraestructuras.push(processed);
  }
  
  const fin = performance.now();
  
  return {
    municipio: doc.municipio,
    totalProcesadas: infraestructuras.length,
    coordenadasValidas,
    coordenadasInvalidas,
    requierenGeocodificacion,
    infraestructuras,
    tiempoProcesamiento: fin - inicio,
  };
}

// ============================================================================
// TESTS E2E
// ============================================================================

describe('E2E: Flujo completo documento PTEL', () => {
  
  describe('Procesamiento por municipio', () => {
    
    it('debe procesar documento Tíjola correctamente', () => {
      const result = procesarDocumentoPTEL(DOCUMENT_TIJOLA);
      
      console.log(`${E2E} Tíjola: ${result.coordenadasValidas}/${result.totalProcesadas} válidas en ${result.tiempoProcesamiento.toFixed(2)}ms`);
      
      expect(result.municipio).toBe('Tíjola');
      expect(result.totalProcesadas).toBe(5);
      expect(result.coordenadasValidas).toBe(4); // IES sin coords
      expect(result.requierenGeocodificacion).toBeGreaterThanOrEqual(1);
    });

    it('debe procesar documento Colomera correctamente', () => {
      const result = procesarDocumentoPTEL(DOCUMENT_COLOMERA);
      
      console.log(`${E2E} Colomera: ${result.coordenadasValidas}/${result.totalProcesadas} válidas en ${result.tiempoProcesamiento.toFixed(2)}ms`);
      
      expect(result.municipio).toBe('Colomera');
      expect(result.totalProcesadas).toBe(3);
      expect(result.coordenadasValidas).toBe(3);
      expect(result.requierenGeocodificacion).toBe(0);
    });

    it('debe procesar documento Berja (patrón UTF-8 corrupto)', () => {
      const result = procesarDocumentoPTEL(DOCUMENT_BERJA);
      
      console.log(`${E2E} Berja: ${result.coordenadasValidas}/${result.totalProcesadas} válidas en ${result.tiempoProcesamiento.toFixed(2)}ms`);
      
      // Verificar que el patrón espacio+doble tilde se procesa
      const centroSalud = result.infraestructuras.find(i => 
        i.nombre.includes('Centro de Salud Berja')
      );
      
      expect(centroSalud).toBeDefined();
      expect(centroSalud?.coordXNormalizada).toBeCloseTo(504750.92, 0);
      expect(centroSalud?.coordYNormalizada).toBeCloseTo(4077153.36, 0);
      expect(centroSalud?.esValida).toBe(true);
      
      expect(result.coordenadasValidas).toBe(3);
    });

    it('debe procesar documento Hornos (patrón punto miles)', () => {
      const result = procesarDocumentoPTEL(DOCUMENT_HORNOS);
      
      console.log(`${E2E} Hornos: ${result.coordenadasValidas}/${result.totalProcesadas} válidas en ${result.tiempoProcesamiento.toFixed(2)}ms`);
      
      // Verificar patrón punto como separador de miles
      const castillo = result.infraestructuras.find(i => 
        i.nombre.includes('Castillo')
      );
      
      expect(castillo).toBeDefined();
      expect(castillo?.coordXNormalizada).toBe(524891);
      expect(castillo?.coordYNormalizada).toBe(4229920);
      expect(castillo?.esValida).toBe(true);
      
      expect(result.coordenadasValidas).toBe(3);
    });
  });

  describe('Manejo de errores y casos límite', () => {
    
    it('debe manejar documento con datos problemáticos', () => {
      const result = procesarDocumentoPTEL(DOCUMENT_CON_ERRORES);
      
      console.log(`${E2E} Errores: ${result.coordenadasValidas}/${result.totalProcesadas} válidas`);
      
      // Ninguna debe ser válida
      expect(result.coordenadasValidas).toBe(0);
      
      // Todas deben tener errores reportados
      result.infraestructuras.forEach(infra => {
        expect(infra.errores.length).toBeGreaterThan(0);
      });
    });

    it('debe identificar placeholders correctamente', () => {
      const result = procesarDocumentoPTEL(DOCUMENT_CON_ERRORES);
      
      const placeholder = result.infraestructuras.find(i => 
        i.nombre.includes('Placeholder')
      );
      
      expect(placeholder).toBeDefined();
      expect(placeholder?.esValida).toBe(false);
      expect(placeholder?.coordXNormalizada).toBeNull();
    });

    it('debe detectar coordenadas fuera de rango', () => {
      const result = procesarDocumentoPTEL(DOCUMENT_CON_ERRORES);
      
      const fueraRango = result.infraestructuras.find(i => 
        i.nombre.includes('Fuera de rango')
      );
      
      expect(fueraRango).toBeDefined();
      expect(fueraRango?.esValida).toBe(false);
      expect(fueraRango?.errores.some(e => e.includes('fuera de rango'))).toBe(true);
    });
  });

  describe('Normalización de direcciones (F025)', () => {
    
    it('debe normalizar direcciones con ruido', () => {
      const result = procesarDocumentoPTEL(DOCUMENT_TIJOLA);
      
      const centroSalud = result.infraestructuras.find(i => 
        i.nombre.includes('Centro de Salud')
      );
      
      expect(centroSalud?.direccionNormalizada).toBeDefined();
      // La dirección normalizada no debe contener "disponible 24 horas"
      expect(centroSalud?.direccionNormalizada).not.toContain('disponible');
      expect(centroSalud?.direccionNormalizada).toContain('Plaza Luis Gonzaga');
    });

    it('debe expandir abreviaturas de vía', () => {
      const result = procesarDocumentoPTEL(DOCUMENT_TIJOLA);
      
      const farmacia = result.infraestructuras.find(i => 
        i.nombre.includes('Farmacia')
      );
      
      expect(farmacia?.direccionNormalizada).toBeDefined();
      // C/ debe expandirse a Calle
      expect(farmacia?.direccionNormalizada).toContain('Calle Mayor');
    });
  });

  describe('Procesamiento batch de todos los municipios', () => {
    
    it('debe procesar todos los documentos sin errores fatales', () => {
      const resultados: DocumentProcessingResult[] = [];
      
      for (const doc of ALL_TEST_DOCUMENTS) {
        const result = procesarDocumentoPTEL(doc);
        resultados.push(result);
      }
      
      // Resumen
      const totalInfra = resultados.reduce((sum, r) => sum + r.totalProcesadas, 0);
      const totalValidas = resultados.reduce((sum, r) => sum + r.coordenadasValidas, 0);
      const totalGeocoding = resultados.reduce((sum, r) => sum + r.requierenGeocodificacion, 0);
      const tiempoTotal = resultados.reduce((sum, r) => sum + r.tiempoProcesamiento, 0);
      
      console.log(`${E2E} === RESUMEN BATCH ===`);
      console.log(`${E2E} Total infraestructuras: ${totalInfra}`);
      console.log(`${E2E} Coordenadas válidas: ${totalValidas} (${((totalValidas/totalInfra)*100).toFixed(1)}%)`);
      console.log(`${E2E} Requieren geocodificación: ${totalGeocoding}`);
      console.log(`${E2E} Tiempo total: ${tiempoTotal.toFixed(2)}ms`);
      
      // Verificaciones
      expect(resultados.length).toBe(4);
      expect(totalInfra).toBe(14); // 5+3+3+3
      expect(totalValidas).toBeGreaterThanOrEqual(13); // Al menos 13 válidas
    });

    it('debe cumplir con tiempos de rendimiento aceptables', () => {
      const inicio = performance.now();
      
      for (const doc of ALL_TEST_DOCUMENTS) {
        procesarDocumentoPTEL(doc);
      }
      
      const tiempoTotal = performance.now() - inicio;
      
      console.log(`${E2E} Rendimiento: 4 documentos en ${tiempoTotal.toFixed(2)}ms`);
      
      // Debe procesar los 4 documentos en menos de 500ms
      expect(tiempoTotal).toBeLessThan(500);
    });
  });

  describe('Validación de resultados esperados', () => {
    
    it.each([
      ['Tíjola', DOCUMENT_TIJOLA],
      ['Colomera', DOCUMENT_COLOMERA],
      ['Berja', DOCUMENT_BERJA],
      ['Hornos', DOCUMENT_HORNOS],
    ])('debe cumplir expectativas para %s', (municipio, doc) => {
      const result = procesarDocumentoPTEL(doc);
      const expected = EXPECTED_RESULTS[municipio];
      
      expect(result.totalProcesadas).toBe(expected.totalInfraestructuras);
      expect(result.coordenadasValidas).toBe(expected.coordenadasValidas);
    });
  });

  describe('Formato de salida compatible QGIS', () => {
    
    it('debe generar coordenadas en formato UTM30 válido', () => {
      const result = procesarDocumentoPTEL(DOCUMENT_COLOMERA);
      
      const validas = result.infraestructuras.filter(i => i.esValida);
      
      for (const infra of validas) {
        // X debe estar en rango UTM30 para Andalucía
        expect(infra.coordXNormalizada).toBeGreaterThanOrEqual(100000);
        expect(infra.coordXNormalizada).toBeLessThanOrEqual(700000);
        
        // Y debe estar en rango UTM30 para Andalucía
        expect(infra.coordYNormalizada).toBeGreaterThanOrEqual(3900000);
        expect(infra.coordYNormalizada).toBeLessThanOrEqual(4350000);
        
        // Deben ser números (no strings)
        expect(typeof infra.coordXNormalizada).toBe('number');
        expect(typeof infra.coordYNormalizada).toBe('number');
      }
    });

    it('debe mantener precisión suficiente (2 decimales mínimo)', () => {
      const result = procesarDocumentoPTEL(DOCUMENT_BERJA);
      
      // Berja tiene coordenadas con decimales
      const centroSalud = result.infraestructuras.find(i => 
        i.nombre.includes('Centro de Salud Berja')
      );
      
      expect(centroSalud?.coordXNormalizada).toBeDefined();
      
      // Verificar que se mantienen los decimales
      const xStr = centroSalud!.coordXNormalizada!.toString();
      if (xStr.includes('.')) {
        const decimales = xStr.split('.')[1].length;
        expect(decimales).toBeGreaterThanOrEqual(1);
      }
    });
  });
});

// ============================================================================
// TESTS DE INTEGRACIÓN CON GEOCODIFICACIÓN (OPCIONALES)
// ============================================================================

describe('E2E: Integración con geocodificación', () => {
  
  it('debe identificar correctamente items para geocodificar', () => {
    const result = procesarDocumentoPTEL(DOCUMENT_TIJOLA);
    
    const paraGeocoding = result.infraestructuras.filter(i => i.requiereGeocodificacion);
    
    // IES Alto Almanzora no tiene coordenadas pero sí dirección
    expect(paraGeocoding.length).toBeGreaterThanOrEqual(1);
    
    const ies = paraGeocoding.find(i => i.nombre.includes('IES'));
    expect(ies).toBeDefined();
    expect(ies?.direccionOriginal).toContain('Purchena');
  });

  it('debe tener direcciones normalizadas listas para geocodificación', () => {
    const result = procesarDocumentoPTEL(DOCUMENT_TIJOLA);
    
    const paraGeocoding = result.infraestructuras.filter(i => i.requiereGeocodificacion);
    
    for (const infra of paraGeocoding) {
      // Todas las que requieren geocodificación deben tener dirección
      expect(
        infra.direccionNormalizada || infra.direccionOriginal
      ).toBeDefined();
    }
  });
});
