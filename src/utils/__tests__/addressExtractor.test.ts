/**
 * F025: Address Extractor - Tests
 * 
 * 63 casos totales: 39 reales (extraídos de documentos PTEL) + 24 sintéticos
 * Copiado desde docs/analisis/addressExtractor.testCases.ts
 * 
 * @created 2025-12-04
 */

import { describe, it, expect } from 'vitest';
import { extractStreetAddress } from '../addressExtractor';

// ============================================================================
// CASOS REALES - TÍJOLA (13)
// ============================================================================
describe('addressExtractor - Casos Reales Tíjola', () => {
  
  it('T01: nombre infraestructura + dirección + horario', () => {
    const result = extractStreetAddress(
      'Centro de Salud Tíjola, Plaza Luis Gonzaga, n/ 1, de Tíjola, disponible 24 horas',
      'Tíjola'
    );
    expect(result.address).toBe('Plaza Luis Gonzaga, 1, Tíjola');
    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });

  it('T02: nombre + extra + teléfono + horario', () => {
    const result = extractStreetAddress(
      'Ayuntamiento de Tíjola, despachos municipales, Plaza de España, n/ 1, Tíjola, 950420300- Disponible 24 horas',
      'Tíjola'
    );
    expect(result.address).toBe('Plaza de España, 1, Tíjola');
    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });

  it('T03: dirección + piso + horario', () => {
    const result = extractStreetAddress(
      'C/Garcilaso de la Vega, n/ 5, bajo, Tíjola, disponible 24 horas',
      'Tíjola'
    );
    expect(result.address).toBe('Calle Garcilaso de la Vega, 5, Tíjola');
    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });

  it('T04: nombre + dirección + piso', () => {
    const result = extractStreetAddress(
      'Policía Local, C/Garcilaso de la Vega, n/ 5, bajo, Tíjola',
      'Tíjola'
    );
    expect(result.address).toBe('Calle Garcilaso de la Vega, 5, Tíjola');
    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });

  it('T05: nombre + dirección + otro municipio', () => {
    const result = extractStreetAddress(
      'Consorcio de Bomberos Levante Almeriense, Avda. De la Estación s/n, Albox (Almería)',
      'Tíjola'
    );
    expect(result.address).toBe('Avenida de la Estación, s/n, Albox');
    expect(result.confidence).toBeGreaterThanOrEqual(70);
  });

  it('T06: nombre + dirección simple', () => {
    const result = extractStreetAddress(
      'Pabellón Municipal de Deportes, C/ Francisco Quevedo, s/n, Tíjola',
      'Tíjola'
    );
    expect(result.address).toBe('Calle Francisco Quevedo, s/n, Tíjola');
    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });

  it('T07: polígono + typo', () => {
    const result = extractStreetAddress(
      'Poligono Industrial Tíjola, s/n, Diponibilidad 24 horas',
      'Tíjola'
    );
    expect(result.address).toBe('Polígono Industrial, s/n, Tíjola');
    expect(result.confidence).toBeGreaterThanOrEqual(60);
  });

  it('T08: carretera + referencia relativa', () => {
    const result = extractStreetAddress(
      'Carretera 334, frente Cuartel Guardia Civil, Tíjola',
      'Tíjola'
    );
    expect(result.address).toBe('Carretera 334, Tíjola');
    expect(result.confidence).toBeGreaterThanOrEqual(60);
  });

  it('T09: NO geocodificable - descripción genérica', () => {
    const result = extractStreetAddress(
      'Lugar más próximo donde se localice la emergencia',
      'Tíjola'
    );
    expect(result.address).toBeNull();
    expect(result.confidence).toBe(0);
    expect(result.reason).toBe('not_geocodable');
  });

  it('T10: NO geocodificable - listado personal', () => {
    const result = extractStreetAddress(
      '3,- Cargos Políticos, 3,- Funcionarios de Ayuntamiento Tíjola',
      'Tíjola'
    );
    expect(result.address).toBeNull();
    expect(result.confidence).toBe(0);
  });

  it('T11: dirección simple con n/', () => {
    const result = extractStreetAddress(
      'Avda José Antonio, n/ 18, Tíjola',
      'Tíjola'
    );
    expect(result.address).toBe('Avenida José Antonio, 18, Tíjola');
    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });

  it('T12: dirección sin municipio', () => {
    const result = extractStreetAddress(
      'C/ Santa María, n/ 1',
      'Tíjola'
    );
    expect(result.address).toBe('Calle Santa María, 1');
    expect(result.confidence).toBeGreaterThanOrEqual(70);
  });

  it('T13: typo s7n', () => {
    const result = extractStreetAddress(
      'C/ Enriqueta Reche, s7n',
      'Tíjola'
    );
    expect(result.address).toBe('Calle Enriqueta Reche, s/n');
    expect(result.confidence).toBeGreaterThanOrEqual(70);
  });
});


// ============================================================================
// CASOS REALES - COLOMERA (10)
// ============================================================================
describe('addressExtractor - Casos Reales Colomera', () => {

  it('C14: número pegado al municipio', () => {
    const result = extractStreetAddress(
      'C/ erillas, 2Colomera',
      'Colomera'
    );
    expect(result.address).toBe('Calle Erillas, 2, Colomera');
    expect(result.confidence).toBeGreaterThanOrEqual(70);
  });

  it('C15: punto en vez de coma', () => {
    const result = extractStreetAddress(
      'Avd Virgen de la Cabeza, 9. Colomera',
      'Colomera'
    );
    expect(result.address).toBe('Avenida Virgen de la Cabeza, 9, Colomera');
    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });

  it('C16: NO geocodificable - solo nombre', () => {
    const result = extractStreetAddress(
      'CONSULTORIO MÉDICO DE COLOMERA Y DEL CONSULTORIO AUXILIAR DEL CAURO',
      'Colomera'
    );
    expect(result.address).toBeNull();
    expect(result.confidence).toBe(0);
  });

  it('C17: NO geocodificable - múltiples direcciones', () => {
    const result = extractStreetAddress(
      'Avd. Benalua C/ Paz 1 C/ Amapola 8',
      'Colomera'
    );
    expect(result.address).toBeNull();
    expect(result.reason).toBe('multiple_addresses');
  });

  it('C18: NO geocodificable - parcela catastral', () => {
    const result = extractStreetAddress(
      'Pol 14- P 146',
      'Colomera'
    );
    expect(result.address).toBeNull();
    expect(result.reason).toBe('cadastral');
  });

  it('C19: NO geocodificable - múltiples C/', () => {
    const result = extractStreetAddress(
      'C/ Pilarillo s/n C/ Cuesta de las Fuentes s/n',
      'Colomera'
    );
    expect(result.address).toBeNull();
    expect(result.reason).toBe('multiple_addresses');
  });

  it('C20: dirección limpia', () => {
    const result = extractStreetAddress(
      'Calle Iglesia, 1',
      'Colomera'
    );
    expect(result.address).toBe('Calle Iglesia, 1');
    expect(result.confidence).toBeGreaterThanOrEqual(90);
  });

  it('C21: vereda sin número', () => {
    const result = extractStreetAddress(
      'Vereda del Camino Real de Madrid',
      'Colomera'
    );
    expect(result.address).toBe('Vereda del Camino Real de Madrid');
    expect(result.confidence).toBeGreaterThanOrEqual(50);
  });

  it('C22: paraje', () => {
    const result = extractStreetAddress(
      'Paraje cortijo el chopo',
      'Colomera'
    );
    expect(result.address).toBe('Paraje Cortijo El Chopo');
    expect(result.confidence).toBeGreaterThanOrEqual(50);
  });

  it('C23: mayúsculas con abreviatura', () => {
    const result = extractStreetAddress(
      'AV. Benalúa s/n',
      'Colomera'
    );
    expect(result.address).toBe('Avenida Benalúa, s/n');
    expect(result.confidence).toBeGreaterThanOrEqual(70);
  });
});

// ============================================================================
// CASOS REALES - BERJA (9)
// ============================================================================
describe('addressExtractor - Casos Reales Berja', () => {

  it('B24: dirección + código postal', () => {
    const result = extractStreetAddress(
      'Plaza de la Constitución 1.  Berja 04760',
      'Berja'
    );
    expect(result.address).toBe('Plaza de la Constitución, 1, Berja');
    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });

  it('B25: dirección + teléfono', () => {
    const result = extractStreetAddress(
      'C/ Carretera de Adra s/n Berja. Teléfono. 600 10 90 00',
      'Berja'
    );
    expect(result.address).toBe('Calle Carretera de Adra, s/n, Berja');
    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });

  it('B26: nave + typo ACTECAS', () => {
    const result = extractStreetAddress(
      'C/LOS ACTECAS NAVE N.º 11',
      'Berja'
    );
    expect(result.address).toBe('Calle Los Aztecas, nave 11');
    expect(result.confidence).toBeGreaterThanOrEqual(70);
  });

  it('B27: polígono + calle', () => {
    const result = extractStreetAddress(
      'POLIGONO C/ QUINTA AVENIDA S/N',
      'Berja'
    );
    expect(result.address).toBe('Polígono, Calle Quinta Avenida, s/n');
    expect(result.confidence).toBeGreaterThanOrEqual(60);
  });

  it('B28: C/ PLAZA redundante', () => {
    const result = extractStreetAddress(
      'C/ PLAZA DE LA CONSTITUCIÓN N.º 6',
      'Berja'
    );
    expect(result.address).toBe('Plaza de la Constitución, 6');
    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });

  it('B29: nombre + jefatura + dirección', () => {
    const result = extractStreetAddress(
      'Policía Local Municipal. Jefatura: Plaza de la Constitución 1. Berja 04760',
      'Berja'
    );
    expect(result.address).toBe('Plaza de la Constitución, 1, Berja');
    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });

  it('B30: nombre largo + dirección', () => {
    const result = extractStreetAddress(
      'Consultorio Centro de Salud de Berja - URGENCIAS. C/ Carretera de Adra s/n Berja',
      'Berja'
    );
    expect(result.address).toBe('Calle Carretera de Adra, s/n, Berja');
    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });

  it('B31: minúsculas', () => {
    const result = extractStreetAddress(
      'c/ llano Vilches 21',
      'Berja'
    );
    expect(result.address).toBe('Calle Llano Vilches, 21');
    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });

  it('B32: guion como separador de número', () => {
    const result = extractStreetAddress(
      'C/ LOS Geranios - 2',
      'Berja'
    );
    expect(result.address).toBe('Calle Los Geranios, 2');
    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });
});

// ============================================================================
// CASOS REALES - DBF/ODS (7)
// ============================================================================
describe('addressExtractor - Casos Reales DBF/ODS', () => {

  it('D33: UTF-8 corrupto NÂº', () => {
    const result = extractStreetAddress(
      'CALLE ESCUELAS NÂº 1',
      'TestMunicipio'
    );
    expect(result.address).toBe('Calle Escuelas, 1');
    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });

  it('D34: mayúsculas con cuesta', () => {
    const result = extractStreetAddress(
      'CUESTA MATUETE S/N',
      'TestMunicipio'
    );
    expect(result.address).toBe('Cuesta Matuete, s/n');
    expect(result.confidence).toBeGreaterThanOrEqual(70);
  });

  it('D35: autovía', () => {
    const result = extractStreetAddress(
      'AUTOVIA A-92 DIRECCION GRANADA',
      'TestMunicipio'
    );
    expect(result.address).toBe('Autovía A-92, dirección Granada');
    expect(result.confidence).toBeGreaterThanOrEqual(50);
  });

  it('D36: sin tipo de vía', () => {
    const result = extractStreetAddress(
      'Moredal, 15',
      'TestMunicipio'
    );
    expect(result.address).toBe('Moredal, 15');
    expect(result.confidence).toBeGreaterThanOrEqual(60);
  });

  it('D37: CL. con punto', () => {
    const result = extractStreetAddress(
      'CL. Ramón y Cajal 5.',
      'TestMunicipio'
    );
    expect(result.address).toBe('Calle Ramón y Cajal, 5');
    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });

  it('D38: camino', () => {
    const result = extractStreetAddress(
      'CAMINO CAMPO FUTBOL 7',
      'TestMunicipio'
    );
    expect(result.address).toBe('Camino Campo Fútbol, 7');
    expect(result.confidence).toBeGreaterThanOrEqual(70);
  });

  it('D39: N pegado al número', () => {
    const result = extractStreetAddress(
      'CAMINO CAMPO DE FÚTBOL N4',
      'TestMunicipio'
    );
    expect(result.address).toBe('Camino Campo de Fútbol, 4');
    expect(result.confidence).toBeGreaterThanOrEqual(70);
  });
});


// ============================================================================
// CASOS SINTÉTICOS - VARIACIONES DE ORDEN (7)
// ============================================================================
describe('addressExtractor - Casos Sintéticos: Orden', () => {

  it('S40: orden normal con comas', () => {
    const result = extractStreetAddress(
      'Calle Mayor, 15, Granada',
      'Granada'
    );
    expect(result.address).toBe('Calle Mayor, 15, Granada');
    expect(result.confidence).toBeGreaterThanOrEqual(90);
  });

  it('S41: sin comas', () => {
    const result = extractStreetAddress(
      'Calle Mayor 15 Granada',
      'Granada'
    );
    expect(result.address).toBe('Calle Mayor, 15, Granada');
    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });

  it('S42: tipo vía pegado', () => {
    const result = extractStreetAddress(
      'C/Mayor, 15, Granada',
      'Granada'
    );
    expect(result.address).toBe('Calle Mayor, 15, Granada');
    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });

  it('S43: municipio primero', () => {
    const result = extractStreetAddress(
      'Granada, Calle Mayor, 15',
      'Granada'
    );
    expect(result.address).toBe('Calle Mayor, 15, Granada');
    expect(result.confidence).toBeGreaterThanOrEqual(70);
  });

  it('S44: con puntos', () => {
    const result = extractStreetAddress(
      'Calle Mayor. 15. Granada',
      'Granada'
    );
    expect(result.address).toBe('Calle Mayor, 15, Granada');
    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });

  it('S45: con n/', () => {
    const result = extractStreetAddress(
      'Calle Mayor, n/ 15, Granada',
      'Granada'
    );
    expect(result.address).toBe('Calle Mayor, 15, Granada');
    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });

  it('S46: con nº', () => {
    const result = extractStreetAddress(
      'Calle Mayor, nº 15, Granada',
      'Granada'
    );
    expect(result.address).toBe('Calle Mayor, 15, Granada');
    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });
});


// ============================================================================
// CASOS SINTÉTICOS - PREFIJOS INFRAESTRUCTURA (8)
// ============================================================================
describe('addressExtractor - Casos Sintéticos: Prefijos', () => {

  it('S47: Centro de Salud', () => {
    const result = extractStreetAddress(
      'Centro de Salud, Calle Real, 5',
      'TestMunicipio'
    );
    expect(result.address).toBe('Calle Real, 5');
    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });

  it('S48: Centro de Salud de Municipio', () => {
    const result = extractStreetAddress(
      'Centro de Salud de Almería, Calle Real, 5',
      'Almería'
    );
    expect(result.address).toBe('Calle Real, 5');
    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });

  it('S49: Consultorio Local', () => {
    const result = extractStreetAddress(
      'Consultorio Local, Plaza Mayor, 1',
      'TestMunicipio'
    );
    expect(result.address).toBe('Plaza Mayor, 1');
    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });

  it('S50: CEIP', () => {
    const result = extractStreetAddress(
      'CEIP San José, Avenida de la Paz, 10',
      'TestMunicipio'
    );
    expect(result.address).toBe('Avenida de la Paz, 10');
    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });

  it('S51: Residencia de Mayores', () => {
    const result = extractStreetAddress(
      'Residencia de Mayores Santa Ana, Calle Olivos, 3',
      'TestMunicipio'
    );
    expect(result.address).toBe('Calle Olivos, 3');
    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });

  it('S52: Policía Local', () => {
    const result = extractStreetAddress(
      'Policía Local, Calle Nueva, s/n',
      'TestMunicipio'
    );
    expect(result.address).toBe('Calle Nueva, s/n');
    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });

  it('S53: Ayuntamiento', () => {
    const result = extractStreetAddress(
      'Ayuntamiento, Plaza de España, 1',
      'TestMunicipio'
    );
    expect(result.address).toBe('Plaza de España, 1');
    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });

  it('S54: Ayuntamiento de Municipio', () => {
    const result = extractStreetAddress(
      'Ayuntamiento de Córdoba, Plaza Mayor, 1',
      'Córdoba'
    );
    expect(result.address).toBe('Plaza Mayor, 1');
    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });
});

// ============================================================================
// CASOS SINTÉTICOS - SUFIJOS PROBLEMÁTICOS (9)
// ============================================================================
describe('addressExtractor - Casos Sintéticos: Sufijos', () => {

  it('S55: disponible 24 horas', () => {
    const result = extractStreetAddress(
      'Calle Real, 5, disponible 24 horas',
      'TestMunicipio'
    );
    expect(result.address).toBe('Calle Real, 5');
    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });

  it('S56: Disponibilidad 24 horas.', () => {
    const result = extractStreetAddress(
      'Calle Real, 5. Disponibilidad 24 horas.',
      'TestMunicipio'
    );
    expect(result.address).toBe('Calle Real, 5');
    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });

  it('S57: 24h', () => {
    const result = extractStreetAddress(
      'Calle Real, 5, 24h',
      'TestMunicipio'
    );
    expect(result.address).toBe('Calle Real, 5');
    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });

  it('S58: Tel:', () => {
    const result = extractStreetAddress(
      'Calle Real, 5. Tel: 958123456',
      'TestMunicipio'
    );
    expect(result.address).toBe('Calle Real, 5');
    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });

  it('S59: Tlf.', () => {
    const result = extractStreetAddress(
      'Calle Real, 5, Tlf. 666123456',
      'TestMunicipio'
    );
    expect(result.address).toBe('Calle Real, 5');
    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });

  it('S60: provincia entre paréntesis', () => {
    const result = extractStreetAddress(
      'Calle Real, 5, Almería (Almería)',
      'Almería'
    );
    expect(result.address).toBe('Calle Real, 5, Almería');
    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });

  it('S61: piso bajo', () => {
    const result = extractStreetAddress(
      'Calle Real, 5, bajo',
      'TestMunicipio'
    );
    expect(result.address).toBe('Calle Real, 5');
    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });

  it('S62: código postal', () => {
    const result = extractStreetAddress(
      'Calle Real, 5, Almería, 04001',
      'Almería'
    );
    expect(result.address).toBe('Calle Real, 5, Almería');
    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });

  it('S63: horario L-V', () => {
    const result = extractStreetAddress(
      'Calle Real, 5 - horario L-V 8-15',
      'TestMunicipio'
    );
    expect(result.address).toBe('Calle Real, 5');
    expect(result.confidence).toBeGreaterThanOrEqual(70);
  });
});
