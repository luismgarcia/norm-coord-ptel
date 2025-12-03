/**
 * addressCleaner.test.ts
 * 
 * Tests con casos reales extraídos de documentos PTEL:
 * Colomera, Quéntar, Hornos, Castril, Tíjola, Berja
 * 
 * @version 1.0.0
 * @date 2025-12-03
 * @see F023 Fase 1.3
 */

import { describe, test, expect } from 'vitest';
import { cleanAddress, isGeocodable, cleanAddressBatch } from '../../utils/addressCleaner';

describe('addressCleaner', () => {

  // ═══════════════════════════════════════════════════════════════════════════
  // CASOS REALES PTEL COLOMERA
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Casos reales PTEL Colomera', () => {
    
    test('C/ erillas, 2Colomera → Calle Erillas, 2, Colomera', () => {
      const result = cleanAddress('C/ erillas, 2Colomera');
      expect(result.cleaned).toBe('Calle Erillas, 2, Colomera');
      expect(result.wasModified).toBe(true);
      expect(result.modifications).toContain('abreviatura expandida');
      expect(result.modifications).toContain('número separado de localidad');
    });

    test('Avd Virgen de la Cabeza, 9. Colomera', () => {
      const result = cleanAddress('Avd Virgen de la Cabeza, 9. Colomera');
      expect(result.cleaned).toBe('Avenida Virgen de la Cabeza, 9, Colomera');
      expect(result.components.viaType).toBe('Avenida');
      expect(result.components.number).toBe('9');
      expect(result.components.locality).toBe('Colomera');
    });

    test('c/ sol, 17. Cerro Cauro', () => {
      const result = cleanAddress('c/ sol, 17. Cerro Cauro');
      expect(result.cleaned).toBe('Calle Sol, 17, Cerro Cauro');
      expect(result.components.viaType).toBe('Calle');
      expect(result.components.viaName).toBe('Sol');
      expect(result.components.locality).toBe('Cerro Cauro');
    });

    test('C/ Pilar Leones, 13. Colomera', () => {
      const result = cleanAddress('C/ Pilar Leones, 13. Colomera');
      expect(result.cleaned).toBe('Calle Pilar Leones, 13, Colomera');
      expect(result.quality).toBeGreaterThanOrEqual(70);
    });

    test('c/erillas 2. Colomera (sin espacios)', () => {
      const result = cleanAddress('c/erillas 2. Colomera');
      expect(result.cleaned).toContain('Calle');
      expect(result.cleaned).toContain('Colomera');
      expect(result.components.number).toBe('2');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPANSIÓN DE ABREVIATURAS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Expansión de abreviaturas', () => {
    
    const abbreviationCases = [
      { input: 'C/ Mayor, 1', expected: 'Calle' },
      { input: 'c/ menor, 2', expected: 'Calle' },
      { input: 'Avd. Andalucía, 5', expected: 'Avenida' },
      { input: 'Avda Real, 10', expected: 'Avenida' },
      { input: 'Pza. España, 1', expected: 'Plaza' },
      { input: 'Ctra. Granada, km 5', expected: 'Carretera' },
      { input: 'Pº de la Estación, 3', expected: 'Paseo' },
      { input: 'Urb. Los Pinos, 7', expected: 'Urbanización' },
      { input: 'Pol. Industrial, nave 3', expected: 'Polígono' },
    ];

    test.each(abbreviationCases)('$input → contiene $expected', ({ input, expected }) => {
      const result = cleanAddress(input);
      expect(result.cleaned).toContain(expected);
      expect(result.modifications).toContain('abreviatura expandida');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ELIMINACIÓN DE TELÉFONOS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Eliminación de teléfonos', () => {
    
    test('Tel: 950123456 eliminado', () => {
      const result = cleanAddress('C/ Mayor, 1. Tel: 950123456');
      expect(result.cleaned).not.toContain('950123456');
      expect(result.removed.phones).toContain('950123456');
      expect(result.modifications).toContain('teléfono eliminado');
    });

    test('Tlf. 958 12 34 56 eliminado', () => {
      const result = cleanAddress('Avda. Andalucía, 5. Tlf. 958 12 34 56');
      expect(result.cleaned).not.toContain('958');
      expect(result.removed.phones.length).toBeGreaterThan(0);
    });

    test('+34 950 123 456 eliminado', () => {
      const result = cleanAddress('Plaza Mayor, 1. +34 950 123 456');
      expect(result.cleaned).not.toContain('+34');
      expect(result.removed.phones.length).toBeGreaterThan(0);
    });

    test('Teléfono al final: 958123456', () => {
      const result = cleanAddress('C/ Sol, 2. 958123456');
      expect(result.removed.phones).toContain('958123456');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ELIMINACIÓN DE HORARIOS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Eliminación de horarios', () => {
    
    test('24h eliminado', () => {
      const result = cleanAddress('C/ Mayor, 1. 24h');
      expect(result.cleaned.toLowerCase()).not.toContain('24h');
      expect(result.removed.schedules.length).toBeGreaterThan(0);
    });

    test('24 horas eliminado', () => {
      const result = cleanAddress('C/ Mayor, 1. Abierto 24 horas');
      expect(result.removed.schedules.length).toBeGreaterThan(0);
    });

    test('L-V 8:00-15:00 eliminado', () => {
      const result = cleanAddress('C/ Mayor, 1. L-V 8:00-15:00');
      expect(result.cleaned).not.toMatch(/L-V/i);
      expect(result.removed.schedules.length).toBeGreaterThan(0);
    });

    test('de 9 a 14h eliminado', () => {
      const result = cleanAddress('C/ Mayor, 1. de 9 a 14h');
      expect(result.removed.schedules.length).toBeGreaterThan(0);
    });

    test('Horario: Lunes a Viernes de 8 a 15 eliminado', () => {
      const result = cleanAddress('C/ Mayor, 1. Horario: Lunes a Viernes');
      expect(result.removed.schedules.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ELIMINACIÓN DE EQUIPAMIENTO
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Eliminación de equipamiento', () => {
    
    test('1 mesa, 2 sillas eliminado', () => {
      const result = cleanAddress('C/ Mayor, 1. 1 mesa, 2 sillas');
      expect(result.removed.equipment.length).toBeGreaterThan(0);
    });

    test('3 ordenadores eliminado', () => {
      const result = cleanAddress('C/ Mayor, 1. 3 ordenadores');
      expect(result.removed.equipment.length).toBeGreaterThan(0);
    });

    test('Capacidad: 50 personas eliminado', () => {
      const result = cleanAddress('C/ Mayor, 1. Capacidad: 50 personas');
      expect(result.removed.equipment.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // NORMALIZACIÓN DE PUNTUACIÓN
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Normalización de puntuación', () => {
    
    test('Punto antes de municipio → coma', () => {
      const result = cleanAddress('C/ Mayor, 1. Granada');
      expect(result.cleaned).toContain(', Granada');
      expect(result.cleaned).not.toContain('. Granada');
    });

    test('Coma sin espacio → coma con espacio', () => {
      const result = cleanAddress('C/ Mayor,1,Granada');
      expect(result.cleaned).toMatch(/, \d/);  // coma espacio número
    });

    test('Espacios múltiples → espacio simple', () => {
      const result = cleanAddress('C/  Mayor,   1');
      expect(result.cleaned).not.toMatch(/\s{2,}/);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEPARACIÓN NÚMERO-LOCALIDAD
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Separación número-localidad', () => {
    
    test('2Colomera → 2, Colomera', () => {
      const result = cleanAddress('C/ Sol, 2Colomera');
      expect(result.cleaned).toContain('2, Colomera');
    });

    test('15Granada → 15, Granada', () => {
      const result = cleanAddress('Avda. Constitución, 15Granada');
      expect(result.cleaned).toContain('15, Granada');
    });

    test('No separar números dentro de nombre', () => {
      // "A-92" no debe separarse
      const result = cleanAddress('Carretera A-92, km 5');
      expect(result.cleaned).toContain('A-92');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CAPITALIZACIÓN
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Capitalización', () => {
    
    test('c/ SOL → Calle Sol', () => {
      const result = cleanAddress('c/ SOL, 1');
      expect(result.cleaned).toContain('Calle Sol');
    });

    test('Preservar artículos en minúscula', () => {
      const result = cleanAddress('C/ Virgen de la Cabeza, 1');
      expect(result.cleaned).toContain('de la');
    });

    test('s/n permanece en minúscula', () => {
      const result = cleanAddress('C/ Mayor, s/n');
      expect(result.cleaned).toContain('s/n');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXTRACCIÓN DE COMPONENTES
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Extracción de componentes', () => {
    
    test('Dirección completa extrae todos los componentes', () => {
      const result = cleanAddress('Calle Mayor, 15, 18001, Granada');
      expect(result.components.viaType).toBe('Calle');
      expect(result.components.viaName).toBe('Mayor');
      expect(result.components.number).toBe('15');
      expect(result.components.postalCode).toBe('18001');
      expect(result.components.locality).toBe('Granada');
    });

    test('Sin código postal', () => {
      const result = cleanAddress('Calle Sol, 5, Colomera');
      expect(result.components.postalCode).toBeNull();
      expect(result.components.locality).toBe('Colomera');
    });

    test('Solo localidad', () => {
      const result = cleanAddress('Colomera');
      expect(result.components.viaType).toBeNull();
      expect(result.components.number).toBeNull();
      expect(result.quality).toBeLessThan(40);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CÁLCULO DE CALIDAD
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Cálculo de calidad', () => {
    
    test('Dirección completa → calidad alta (>=70)', () => {
      const result = cleanAddress('Calle Mayor, 15, Granada');
      expect(result.quality).toBeGreaterThanOrEqual(70);
    });

    test('Dirección sin número → calidad media-alta', () => {
      const result = cleanAddress('Calle Mayor, Granada');
      expect(result.quality).toBeLessThanOrEqual(85);
      expect(result.quality).toBeGreaterThanOrEqual(40);
    });

    test('Solo localidad → calidad baja (<40)', () => {
      const result = cleanAddress('Colomera');
      expect(result.quality).toBeLessThan(40);
    });

    test('Texto vacío → calidad 0', () => {
      const result = cleanAddress('');
      expect(result.quality).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FUNCIÓN isGeocodable
  // ═══════════════════════════════════════════════════════════════════════════
  describe('isGeocodable', () => {
    
    test('Dirección completa es geocodificable', () => {
      const result = isGeocodable('Calle Mayor, 15, Granada');
      expect(result.geocodable).toBe(true);
      expect(result.quality).toBeGreaterThanOrEqual(70);
    });

    test('Dirección parcial con localidad puede ser geocodificable', () => {
      const result = isGeocodable('Plaza España, Granada');
      expect(result.quality).toBeGreaterThanOrEqual(30);
    });

    test('Solo texto corto no es geocodificable', () => {
      const result = isGeocodable('XYZ');
      expect(result.geocodable).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FUNCIÓN cleanAddressBatch
  // ═══════════════════════════════════════════════════════════════════════════
  describe('cleanAddressBatch', () => {
    
    test('Procesa múltiples direcciones', () => {
      const addresses = [
        'C/ Mayor, 1',
        'Avd. Andalucía, 5',
        'Pza. España, s/n',
      ];
      const results = cleanAddressBatch(addresses);
      
      expect(results).toHaveLength(3);
      expect(results[0].cleaned).toContain('Calle');
      expect(results[1].cleaned).toContain('Avenida');
      expect(results[2].cleaned).toContain('Plaza');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CASOS EDGE
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Casos edge', () => {
    
    test('null/undefined manejado gracefully', () => {
      // @ts-expect-error - Testing null input
      const result1 = cleanAddress(null);
      expect(result1.quality).toBe(0);
      
      // @ts-expect-error - Testing undefined input
      const result2 = cleanAddress(undefined);
      expect(result2.quality).toBe(0);
    });

    test('String vacío', () => {
      const result = cleanAddress('');
      expect(result.cleaned).toBe('');
      expect(result.wasModified).toBe(false);
    });

    test('Solo espacios', () => {
      const result = cleanAddress('   ');
      expect(result.cleaned).toBe('');
    });

    test('Dirección muy larga', () => {
      const longAddress = 'Calle ' + 'A'.repeat(200) + ', 1, Granada';
      const result = cleanAddress(longAddress);
      expect(result.components.viaType).toBe('Calle');
      expect(result.components.locality).toBe('Granada');
    });

    test('Caracteres especiales preservados', () => {
      const result = cleanAddress('C/ Virgen de la Cabeza, 9ª, Granada');
      expect(result.cleaned).toContain('9ª');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TRAZABILIDAD [F023-1.3]
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Trazabilidad [F023-1.3]', () => {
    
    test('modifications lista todos los cambios', () => {
      const result = cleanAddress('c/ sol, 2Colomera. Tel: 950123456. 24h');
      
      // Debe tener múltiples modificaciones
      expect(result.modifications.length).toBeGreaterThan(2);
      
      // Verificar que se registran los tipos correctos
      expect(result.modifications.some(m => m.includes('abreviatura'))).toBe(true);
      expect(result.modifications.some(m => m.includes('teléfono'))).toBe(true);
      expect(result.modifications.some(m => m.includes('horario'))).toBe(true);
    });

    test('removed contiene elementos eliminados', () => {
      const result = cleanAddress('C/ Mayor, 1. Tel: 958123456. L-V 9-14h. 2 mesas');
      
      expect(result.removed.phones.length).toBeGreaterThan(0);
      expect(result.removed.schedules.length).toBeGreaterThan(0);
      expect(result.removed.equipment.length).toBeGreaterThan(0);
    });
  });

}); // fin describe principal
