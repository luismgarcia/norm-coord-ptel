/**
 * Tests para addressCleaner.ts
 * 
 * @see F023 Fase 1.3
 * @date 2025-12-03
 */

import { describe, it, expect } from 'vitest';
import { cleanAddress, isGeocodable, cleanAddressBatch } from '../addressCleaner';

// ============================================================================
// F023-1.3: ELIMINACIÓN DE TELÉFONOS
// ============================================================================

describe('F023-1.3 Eliminación de teléfonos', () => {
  it('elimina teléfono con prefijo Tel:', () => {
    const result = cleanAddress('Calle Sol, 5. Tel: 950123456');
    expect(result.cleaned).not.toContain('950123456');
    expect(result.removed.phones).toContain('950123456');
    expect(result.modifications).toContain('teléfono eliminado');
  });

  it('elimina teléfono con prefijo Tlf.', () => {
    const result = cleanAddress('Avda. Principal, 10. Tlf. 958 12 34 56');
    expect(result.cleaned).not.toContain('958');
    expect(result.removed.phones.length).toBeGreaterThan(0);
  });

  it('elimina teléfono móvil (6XX)', () => {
    const result = cleanAddress('Plaza Mayor, 1. 654321987');
    expect(result.cleaned).not.toContain('654321987');
    expect(result.removed.phones).toContain('654321987');
  });

  it('elimina teléfono con código internacional +34', () => {
    const result = cleanAddress('Calle Nueva, 3. +34 950 123 456');
    expect(result.cleaned).not.toContain('+34');
    expect(result.removed.phones.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// F023-1.3: ELIMINACIÓN DE HORARIOS
// ============================================================================

describe('F023-1.3 Eliminación de horarios', () => {
  it('elimina "24h"', () => {
    const result = cleanAddress('Centro de Salud, Calle Sol 5. 24h');
    expect(result.cleaned.toLowerCase()).not.toContain('24h');
    expect(result.removed.schedules.length).toBeGreaterThan(0);
  });

  it('elimina "L-V 8:00-15:00"', () => {
    const result = cleanAddress('Consultorio Médico. L-V 8:00-15:00');
    expect(result.cleaned).not.toContain('8:00');
    expect(result.removed.schedules.length).toBeGreaterThan(0);
  });

  it('elimina "de 9 a 14h"', () => {
    const result = cleanAddress('Farmacia Principal, de 9 a 14h');
    expect(result.cleaned).not.toMatch(/de 9 a 14/i);
    expect(result.removed.schedules.length).toBeGreaterThan(0);
  });

  it('elimina "Lunes a Viernes"', () => {
    const result = cleanAddress('Biblioteca. Lunes a Viernes');
    expect(result.cleaned.toLowerCase()).not.toContain('lunes');
    expect(result.removed.schedules.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// F023-1.3: ELIMINACIÓN DE EQUIPAMIENTO
// ============================================================================

describe('F023-1.3 Eliminación de equipamiento', () => {
  it('elimina "2 mesas"', () => {
    const result = cleanAddress('Sala de Reuniones. 2 mesas, 8 sillas');
    expect(result.cleaned).not.toContain('mesas');
    expect(result.removed.equipment.length).toBeGreaterThan(0);
  });

  it('elimina "capacidad: 50 personas"', () => {
    const result = cleanAddress('Salón de Actos. Capacidad: 50 personas');
    expect(result.cleaned.toLowerCase()).not.toContain('capacidad');
    expect(result.removed.equipment.length).toBeGreaterThan(0);
  });

  it('elimina "dotación: 1 desfibrilador"', () => {
    const result = cleanAddress('Polideportivo. Dotación: 1 desfibrilador');
    expect(result.cleaned.toLowerCase()).not.toContain('dotación');
    expect(result.removed.equipment.length).toBeGreaterThan(0);
  });
});


// ============================================================================
// F023-1.3: NORMALIZACIÓN DE ABREVIATURAS
// ============================================================================

describe('F023-1.3 Normalización de abreviaturas', () => {
  it('expande "C/" a "Calle"', () => {
    const result = cleanAddress('C/ Sol, 5');
    expect(result.cleaned).toContain('Calle');
    expect(result.cleaned).not.toMatch(/^C\//);
    expect(result.modifications).toContain('abreviatura expandida');
  });

  it('expande "Avd." a "Avenida"', () => {
    const result = cleanAddress('Avd. Andalucía, 10');
    expect(result.cleaned).toContain('Avenida');
  });

  it('expande "Pza." a "Plaza"', () => {
    const result = cleanAddress('Pza. Mayor, 1');
    expect(result.cleaned).toContain('Plaza');
  });

  it('expande "Ctra." a "Carretera"', () => {
    const result = cleanAddress('Ctra. Granada, km 5');
    expect(result.cleaned).toContain('Carretera');
  });

  it('expande "Urb." a "Urbanización"', () => {
    const result = cleanAddress('Urb. Los Pinos, 23');
    expect(result.cleaned).toContain('Urbanización');
  });

  it('expande múltiples abreviaturas en misma dirección', () => {
    const result = cleanAddress('C/ Mayor, esq. Avda. Constitución');
    expect(result.cleaned).toContain('Calle');
    expect(result.cleaned).toContain('Avenida');
  });
});

// ============================================================================
// F023-1.3: CORRECCIÓN DE ERRORES COMUNES
// ============================================================================

describe('F023-1.3 Corrección de errores comunes', () => {
  it('corrige "Garci laso" → "Garcilaso"', () => {
    const result = cleanAddress('C/ Garci laso de la Vega, 5');
    expect(result.cleaned).toContain('Garcilaso');
    expect(result.cleaned).not.toContain('Garci laso');
  });

  it('corrige "Villa nueva" → "Villanueva"', () => {
    const result = cleanAddress('Plaza Villa nueva, 3');
    expect(result.cleaned).toContain('Villanueva');
  });

  it('añade tildes a "garcia" → "García"', () => {
    const result = cleanAddress('C/ garcia lorca, 10');
    expect(result.cleaned).toContain('García');
  });

  it('añade tildes a "Andalucia" → "Andalucía"', () => {
    const result = cleanAddress('Avda. Andalucia, 1');
    expect(result.cleaned).toContain('Andalucía');
  });

  it('corrige "dela" → "de la"', () => {
    const result = cleanAddress('C/ Virgen dela Cabeza, 5');
    expect(result.cleaned).toContain('de la');
    expect(result.cleaned).not.toContain('dela');
  });

  it('corrige "Constitucion" → "Constitución"', () => {
    const result = cleanAddress('Plaza Constitucion, 1');
    expect(result.cleaned).toContain('Constitución');
  });
});

// ============================================================================
// F023-1.3: SEPARACIÓN NÚMERO-LOCALIDAD
// ============================================================================

describe('F023-1.3 Separación número-localidad', () => {
  it('separa "2Colomera" → "2, Colomera"', () => {
    const result = cleanAddress('C/ Erillas, 2Colomera');
    expect(result.cleaned).toContain('2, Colomera');
    expect(result.modifications).toContain('número separado de localidad');
  });

  it('separa "5Granada" → "5, Granada"', () => {
    const result = cleanAddress('Avda. Principal, 5Granada');
    expect(result.cleaned).toContain('5, Granada');
  });

  it('no separa "A4" (carretera)', () => {
    const result = cleanAddress('Carretera A4, km 250');
    // A4 no debe separarse porque A no es minúscula seguida de mayúscula
    expect(result.cleaned).toContain('A4');
  });
});


// ============================================================================
// F023-1.3: CAPITALIZACIÓN
// ============================================================================

describe('F023-1.3 Capitalización', () => {
  it('capitaliza correctamente "c/ sol" → "Calle Sol"', () => {
    const result = cleanAddress('c/ sol');
    expect(result.cleaned).toBe('Calle Sol');
  });

  it('mantiene minúsculas en preposiciones "de la"', () => {
    const result = cleanAddress('C/ VIRGEN DE LA CABEZA');
    expect(result.cleaned).toContain('de la');
  });

  it('respeta s/n en minúsculas', () => {
    const result = cleanAddress('Plaza Mayor, s/n, Quéntar');
    expect(result.cleaned).toContain('s/n');
  });
});

// ============================================================================
// F023-1.3: CALIDAD DE DIRECCIÓN
// ============================================================================

describe('F023-1.3 Calidad de dirección', () => {
  it('dirección completa tiene alta calidad (>70)', () => {
    const result = cleanAddress('Calle Mayor, 15, Granada');
    expect(result.quality).toBeGreaterThanOrEqual(70);
  });

  it('dirección sin número tiene calidad media-alta', () => {
    const result = cleanAddress('Plaza de la Constitución, Colomera');
    expect(result.quality).toBeGreaterThanOrEqual(40);
    expect(result.quality).toBeLessThanOrEqual(85);
  });

  it('solo localidad tiene calidad baja (<40)', () => {
    const result = cleanAddress('Quéntar');
    expect(result.quality).toBeLessThan(40);
  });

  it('dirección vacía tiene calidad 0', () => {
    const result = cleanAddress('');
    expect(result.quality).toBe(0);
  });
});

// ============================================================================
// F023-1.3: isGeocodable
// ============================================================================

describe('F023-1.3 isGeocodable', () => {
  it('dirección completa es geocodificable', () => {
    const result = isGeocodable('Calle Mayor, 15, Granada');
    expect(result.geocodable).toBe(true);
    expect(result.quality).toBeGreaterThanOrEqual(70);
  });

  it('dirección parcial con localidad puede ser geocodificable', () => {
    const result = isGeocodable('Plaza Mayor, Colomera');
    expect(result.geocodable).toBe(true);
  });

  it('solo localidad no es geocodificable', () => {
    const result = isGeocodable('Quéntar');
    expect(result.geocodable).toBe(false);
    expect(result.reason).toMatch(/incompleta|no válida/i);
  });

  it('cadena vacía no es geocodificable', () => {
    const result = isGeocodable('');
    expect(result.geocodable).toBe(false);
    expect(result.quality).toBe(0);
  });
});

// ============================================================================
// F023-1.3: EXTRACCIÓN DE COMPONENTES
// ============================================================================

describe('F023-1.3 Extracción de componentes', () => {
  it('extrae tipo de vía', () => {
    const result = cleanAddress('Calle Mayor, 15, Granada');
    expect(result.components.viaType).toBe('Calle');
  });

  it('extrae número', () => {
    const result = cleanAddress('Avenida Andalucía, 42, Sevilla');
    expect(result.components.number).toBe('42');
  });

  it('extrae localidad', () => {
    const result = cleanAddress('Plaza España, 1, Córdoba');
    expect(result.components.locality).toBe('Córdoba');
  });

  it('extrae código postal', () => {
    const result = cleanAddress('C/ Sol, 5, 18001 Granada');
    expect(result.components.postalCode).toBe('18001');
  });
});


// ============================================================================
// F023-1.3: CASOS REALES PTEL
// ============================================================================

describe('F023-1.3 Casos reales PTEL', () => {
  it('caso Colomera: "C/ erillas, 2Colomera"', () => {
    const result = cleanAddress('C/ erillas, 2Colomera');
    expect(result.cleaned).toContain('Calle');
    expect(result.cleaned).toContain('Erillas');
    expect(result.cleaned).toContain('2, Colomera');
    expect(result.wasModified).toBe(true);
  });

  it('caso dirección sucia: "C/Garci laso de la Vega, n/ 5, bajo, 24h"', () => {
    const result = cleanAddress('C/Garci laso de la Vega, n/ 5, bajo, 24h');
    expect(result.cleaned).toContain('Calle');
    expect(result.cleaned).toContain('Garcilaso');
    expect(result.cleaned).not.toMatch(/24h/i);
    expect(result.removed.schedules.length).toBeGreaterThan(0);
  });

  it('caso teléfono embebido: "Avd Virgen de la Cabeza, 9. Tel: 958123456"', () => {
    const result = cleanAddress('Avd Virgen de la Cabeza, 9. Tel: 958123456');
    expect(result.cleaned).toContain('Avenida');
    expect(result.cleaned).toContain('Virgen de la Cabeza');
    expect(result.cleaned).not.toContain('958123456');
    expect(result.removed.phones).toContain('958123456');
  });

  it('caso equipamiento: "Pabellón Municipal. 2 vestuarios, capacidad: 200 personas"', () => {
    const result = cleanAddress('Pabellón Municipal. 2 vestuarios, capacidad: 200 personas');
    expect(result.cleaned).not.toContain('vestuario');
    expect(result.cleaned.toLowerCase()).not.toContain('capacidad');
    expect(result.removed.equipment.length).toBeGreaterThan(0);
  });

  it('caso múltiples problemas combinados', () => {
    const result = cleanAddress('c/ garci laso, 5granada. Tel: 958111222. 24h');
    expect(result.cleaned).toContain('Calle');
    expect(result.cleaned).toContain('Garcilaso');
    expect(result.cleaned).toContain('5, Granada');
    expect(result.removed.phones.length).toBeGreaterThan(0);
    expect(result.removed.schedules.length).toBeGreaterThan(0);
    expect(result.quality).toBeGreaterThan(50);
  });
});

// ============================================================================
// F023-1.3: BATCH PROCESSING
// ============================================================================

describe('F023-1.3 Batch processing', () => {
  it('procesa múltiples direcciones', () => {
    const addresses = [
      'C/ Sol, 5',
      'Avd. Andalucía, 10',
      'Plaza Mayor, 1'
    ];
    const results = cleanAddressBatch(addresses);
    expect(results).toHaveLength(3);
    expect(results[0].cleaned).toContain('Calle');
    expect(results[1].cleaned).toContain('Avenida');
    expect(results[2].cleaned).toContain('Plaza');
  });
});

// ============================================================================
// F023-1.3: EDGE CASES
// ============================================================================

describe('F023-1.3 Edge cases', () => {
  it('maneja null gracefully', () => {
    const result = cleanAddress(null as unknown as string);
    expect(result.cleaned).toBe('');
    expect(result.quality).toBe(0);
  });

  it('maneja undefined gracefully', () => {
    const result = cleanAddress(undefined as unknown as string);
    expect(result.cleaned).toBe('');
    expect(result.quality).toBe(0);
  });

  it('maneja espacios múltiples', () => {
    const result = cleanAddress('Calle   Mayor    15');
    expect(result.cleaned).not.toContain('  ');
  });

  it('maneja dirección solo con número', () => {
    const result = cleanAddress('15');
    expect(result.quality).toBeLessThan(20);
  });

  it('preserva caracteres especiales necesarios', () => {
    const result = cleanAddress('C/ Nº 1, s/n');
    expect(result.cleaned).toContain('s/n');
  });
});

// ============================================================================
// F023-1.3: TRAZABILIDAD
// ============================================================================

describe('F023-1.3 Trazabilidad', () => {
  it('registra todas las modificaciones aplicadas', () => {
    const result = cleanAddress('c/ garci laso, 5granada. Tel: 958111222');
    expect(result.wasModified).toBe(true);
    expect(result.modifications).toContain('teléfono eliminado');
    expect(result.modifications).toContain('abreviatura expandida');
    expect(result.modifications).toContain('error corregido');
    expect(result.modifications).toContain('número separado de localidad');
  });

  it('conserva dirección original', () => {
    const original = 'C/ Sol, 5. Tel: 950123456';
    const result = cleanAddress(original);
    expect(result.original).toBe(original);
  });
});
