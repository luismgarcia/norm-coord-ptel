/**
 * spatialIndex.test.ts
 * 
 * Tests para el índice espacial Flatbush R-tree.
 * 
 * @version 1.0.0
 * @date 2025-12-04
 * @see F023 Fase 3.2 - Flatbush
 */

import { describe, test, expect, beforeEach } from 'vitest';
import SpatialIndex, { 
  calculateDistance, 
  createBBoxFromPoint, 
  mergeBBoxes,
  isPointInBBox,
  expandBBox,
  type SpatialFeature 
} from '../../lib/spatialIndex';

describe('spatialIndex', () => {

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILIDADES GEOMÉTRICAS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Utilidades geométricas', () => {
    
    describe('calculateDistance', () => {
      test('distancia entre mismo punto es 0', () => {
        expect(calculateDistance(500000, 4200000, 500000, 4200000)).toBe(0);
      });

      test('distancia horizontal correcta', () => {
        expect(calculateDistance(500000, 4200000, 501000, 4200000)).toBe(1000);
      });

      test('distancia vertical correcta', () => {
        expect(calculateDistance(500000, 4200000, 500000, 4201000)).toBe(1000);
      });

      test('distancia diagonal correcta (Pitágoras)', () => {
        const dist = calculateDistance(0, 0, 3, 4);
        expect(dist).toBe(5);
      });
    });

    describe('createBBoxFromPoint', () => {
      test('crea bbox con buffer correcto', () => {
        const bbox = createBBoxFromPoint(500000, 4200000, 100);
        expect(bbox.minX).toBe(499900);
        expect(bbox.maxX).toBe(500100);
        expect(bbox.minY).toBe(4199900);
        expect(bbox.maxY).toBe(4200100);
      });
    });

    describe('mergeBBoxes', () => {
      test('combina múltiples bboxes', () => {
        const boxes = [
          { minX: 0, minY: 0, maxX: 10, maxY: 10 },
          { minX: 5, minY: 5, maxX: 20, maxY: 20 },
        ];
        const merged = mergeBBoxes(boxes);
        
        expect(merged).not.toBeNull();
        expect(merged!.minX).toBe(0);
        expect(merged!.minY).toBe(0);
        expect(merged!.maxX).toBe(20);
        expect(merged!.maxY).toBe(20);
      });

      test('devuelve null para array vacío', () => {
        expect(mergeBBoxes([])).toBeNull();
      });
    });

    describe('isPointInBBox', () => {
      const bbox = { minX: 0, minY: 0, maxX: 100, maxY: 100 };

      test('punto dentro devuelve true', () => {
        expect(isPointInBBox(50, 50, bbox)).toBe(true);
      });

      test('punto fuera devuelve false', () => {
        expect(isPointInBBox(150, 50, bbox)).toBe(false);
        expect(isPointInBBox(50, 150, bbox)).toBe(false);
      });

      test('punto en borde devuelve true', () => {
        expect(isPointInBBox(0, 0, bbox)).toBe(true);
        expect(isPointInBBox(100, 100, bbox)).toBe(true);
      });
    });

    describe('expandBBox', () => {
      test('expande bbox por factor', () => {
        const bbox = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
        const expanded = expandBBox(bbox, 2);
        
        expect(expanded.minX).toBe(-50);
        expect(expanded.maxX).toBe(150);
        expect(expanded.minY).toBe(-50);
        expect(expanded.maxY).toBe(150);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SPATIAL INDEX CLASS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('SpatialIndex class', () => {
    interface TestFeature extends SpatialFeature {
      nombre: string;
    }

    let index: SpatialIndex<TestFeature>;
    let features: TestFeature[];

    beforeEach(() => {
      index = new SpatialIndex<TestFeature>();
      features = [
        { id: '1', x: 500000, y: 4200000, nombre: 'Centro A' },
        { id: '2', x: 500100, y: 4200100, nombre: 'Centro B' },
        { id: '3', x: 500500, y: 4200500, nombre: 'Centro C' },
        { id: '4', x: 510000, y: 4210000, nombre: 'Centro D' },
      ];
    });

    describe('build', () => {
      test('construye índice correctamente', () => {
        index.build(features);
        expect(index.built).toBe(true);
        expect(index.size).toBe(4);
      });

      test('maneja array vacío', () => {
        index.build([]);
        expect(index.built).toBe(false);
        expect(index.size).toBe(0);
      });
    });

    describe('searchBBox', () => {
      beforeEach(() => {
        index.build(features);
      });

      test('encuentra features en bbox', () => {
        const results = index.searchBBox({
          minX: 499900,
          minY: 4199900,
          maxX: 500200,
          maxY: 4200200,
        });
        
        expect(results.length).toBe(2);
        expect(results.map(r => r.id)).toContain('1');
        expect(results.map(r => r.id)).toContain('2');
      });

      test('devuelve vacío si no hay matches', () => {
        const results = index.searchBBox({
          minX: 600000,
          minY: 4300000,
          maxX: 600100,
          maxY: 4300100,
        });
        
        expect(results.length).toBe(0);
      });

      test('devuelve vacío si índice no construido', () => {
        const emptyIndex = new SpatialIndex<TestFeature>();
        const results = emptyIndex.searchBBox({
          minX: 0,
          minY: 0,
          maxX: 1000000,
          maxY: 5000000,
        });
        
        expect(results.length).toBe(0);
      });
    });

    describe('searchRadius', () => {
      beforeEach(() => {
        index.build(features);
      });

      test('encuentra features en radio', () => {
        const results = index.searchRadius(500000, 4200000, 200);
        
        expect(results.length).toBeGreaterThanOrEqual(1);
        expect(results.map(r => r.id)).toContain('1');
      });

      test('radio pequeño encuentra solo cercanos', () => {
        const results = index.searchRadius(500000, 4200000, 50);
        
        expect(results.length).toBe(1);
        expect(results[0].id).toBe('1');
      });

      test('radio grande encuentra todos', () => {
        const results = index.searchRadius(500000, 4200000, 20000);
        
        expect(results.length).toBe(4);
      });
    });

    describe('kNearest', () => {
      beforeEach(() => {
        index.build(features);
      });

      test('encuentra k vecinos más cercanos', () => {
        const results = index.kNearest(500000, 4200000, 2);
        
        expect(results.length).toBe(2);
        expect(results[0].feature.id).toBe('1');  // Más cercano
        expect(results[0].distance).toBeLessThan(results[1].distance);
      });

      test('k mayor que total devuelve todos', () => {
        const results = index.kNearest(500000, 4200000, 10);
        
        expect(results.length).toBe(4);
      });

      test('incluye distancia correcta', () => {
        const results = index.kNearest(500000, 4200000, 1);
        
        expect(results[0].distance).toBe(0);  // Mismo punto
      });
    });

    describe('nearest', () => {
      beforeEach(() => {
        index.build(features);
      });

      test('encuentra el más cercano', () => {
        const result = index.nearest(500050, 4200050);
        
        expect(result).not.toBeNull();
        expect(result!.feature.id).toBe('1');
      });

      test('devuelve null si índice vacío', () => {
        const emptyIndex = new SpatialIndex<TestFeature>();
        expect(emptyIndex.nearest(500000, 4200000)).toBeNull();
      });
    });

    describe('findNear', () => {
      beforeEach(() => {
        index.build(features);
      });

      test('encuentra features cercanos excluyendo origen', () => {
        const origin = features[0];
        const results = index.findNear(origin, 200);
        
        // No debe incluir el propio origen
        expect(results.map(r => r.id)).not.toContain('1');
        expect(results.map(r => r.id)).toContain('2');
      });
    });

    describe('clear', () => {
      test('limpia el índice', () => {
        index.build(features);
        expect(index.built).toBe(true);
        
        index.clear();
        expect(index.built).toBe(false);
        expect(index.size).toBe(0);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CASOS REALES PTEL (Coordenadas UTM)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Casos reales PTEL', () => {
    interface InfraFeature extends SpatialFeature {
      nombre: string;
      municipio: string;
    }

    const infraestructuras: InfraFeature[] = [
      // Colomera (Granada)
      { id: 'cs1', x: 461234, y: 4138567, nombre: 'Centro Salud Colomera', municipio: 'Colomera' },
      { id: 'col1', x: 461300, y: 4138600, nombre: 'CEIP San José', municipio: 'Colomera' },
      // Guadix (Granada)
      { id: 'cs2', x: 492567, y: 4139890, nombre: 'Centro Salud Guadix', municipio: 'Guadix' },
      { id: 'hosp1', x: 492600, y: 4139950, nombre: 'Hospital de Guadix', municipio: 'Guadix' },
    ];

    test('búsqueda por proximidad en municipio', () => {
      const index = new SpatialIndex<InfraFeature>();
      index.build(infraestructuras);
      
      // Buscar cerca del centro de Colomera
      const results = index.searchRadius(461250, 4138580, 500);
      
      expect(results.length).toBe(2);
      expect(results.every(r => r.municipio === 'Colomera')).toBe(true);
    });

    test('kNearest para validación cruzada', () => {
      const index = new SpatialIndex<InfraFeature>();
      index.build(infraestructuras);
      
      // Buscar los 2 más cercanos a una coordenada
      const results = index.kNearest(461234, 4138567, 2);
      
      expect(results[0].distance).toBe(0);  // Mismo punto
      expect(results[1].feature.id).toBe('col1');  // CEIP cercano
    });
  });
});
