#!/usr/bin/env node
/**
 * Tests independientes para documentExtractor.ts v3.2
 * Ejecutar: node src/lib/__tests__/runTests.mjs
 */

// =============================================================================
// PATRONES DE COLUMNAS (reproduccidos del código)
// =============================================================================

const COLUMN_PATTERNS = {
  name: /\b(nombre|denominaci[oó]n|descripci[oó]n|elemento|infraestructura|instalaci[oó]n)\b/i,
  address: /\b(direcci[oó]n|ubicaci[oó]n|localizaci[oó]n|domicilio|emplazamiento)\b/i,
  type: /\b(tipo|tipolog[ií]a|categor[ií]a|clase|naturaleza)\b/i,
  // v3.2: Sin falso positivo de "y" española
  coordX: /\b(longitud|este|easting)\b|coord[^y]*x|^x\s*[-_]|^x$/i,
  coordY: /\b(latitud|norte|northing)\b|coord[^x]*y|^y\s*[-_]|^y$/i,
  coordCombined: /coordenadas?/i,
};

// =============================================================================
// FUNCIONES DEL EXTRACTOR (simplificadas para testing)
// =============================================================================

function cleanCoordinateValue(val) {
  if (!val || typeof val !== 'string') return '';
  
  let cleaned = val.trim();
  
  // Detectar placeholders
  if (/^(indicar|sin\s*datos?|-+|n\/?[ac]|\.+|_+|xxx?|completar)$/i.test(cleaned)) {
    return '';
  }
  
  // Eliminar comillas especiales
  cleaned = cleaned.replace(/[´`''""]+/g, '');
  
  // Espacios como separadores de miles
  if (/^\d[\d\s]+\d$/.test(cleaned) && cleaned.includes(' ')) {
    const noSpaces = cleaned.replace(/\s/g, '');
    if (/^\d+$/.test(noSpaces) && noSpaces.length > 6) {
      cleaned = noSpaces.slice(0, -2) + '.' + noSpaces.slice(-2);
    } else {
      cleaned = noSpaces;
    }
  }
  
  // Puntos como separadores de miles
  const dotCount = (cleaned.match(/\./g) || []).length;
  if (dotCount > 1) {
    cleaned = cleaned.replace(/\./g, '');
  } else if (dotCount === 1) {
    const parts = cleaned.split('.');
    if (parts[1]?.length === 3 && /^\d+$/.test(parts[0]) && /^\d+$/.test(parts[1])) {
      const combined = parseInt(parts[0] + parts[1]);
      const isValidX = combined >= 100000 && combined <= 800000;
      const isValidY = combined >= 3980000 && combined <= 4320000;
      if (isValidX || isValidY) {
        cleaned = cleaned.replace('.', '');
      }
    }
  }
  
  // Coma por punto decimal
  cleaned = cleaned.replace(',', '.');
  cleaned = cleaned.replace(/\s/g, '');
  
  return cleaned;
}

function isValidUTMValue(val, type) {
  const num = parseFloat(val);
  if (isNaN(num) || num === 0) return false;
  
  if (type === 'x') {
    return num >= 100000 && num <= 800000;
  } else {
    return num >= 4000000 && num <= 4350000;
  }
}

// =============================================================================
// FRAMEWORK DE TESTING SIMPLE
// =============================================================================

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    failures.push({ name, error: e.message });
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${e.message}`);
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toBeTrue() {
      if (actual !== true) {
        throw new Error(`Expected true, got ${JSON.stringify(actual)}`);
      }
    },
    toBeFalse() {
      if (actual !== false) {
        throw new Error(`Expected false, got ${JSON.stringify(actual)}`);
      }
    }
  };
}

function describe(name, fn) {
  console.log(`\n${name}`);
  fn();
}

// =============================================================================
// TESTS
// =============================================================================

console.log('\n' + '='.repeat(70));
console.log('🧪 TESTS DOCUMENTEXTRACTOR v3.2');
console.log('='.repeat(70));

// --- PATRÓN coordX ---
describe('Patrón coordX - Debe detectar:', () => {
  const cases = ['x', 'X', 'x-', 'x -', 'X - Longitud', 'x_', 'X_UTM', 'Longitud', 'Este', 'EASTING'];
  cases.forEach(c => {
    test(`"${c}"`, () => expect(COLUMN_PATTERNS.coordX.test(c)).toBeTrue());
  });
});

describe('Patrón coordX - NO debe detectar:', () => {
  const cases = ['y', 'Latitud', 'Cantidad y tipo', 'Dirección', 'Nombre'];
  cases.forEach(c => {
    test(`"${c}"`, () => expect(COLUMN_PATTERNS.coordX.test(c)).toBeFalse());
  });
});

// --- PATRÓN coordY ---
describe('Patrón coordY - Debe detectar:', () => {
  const cases = ['y', 'Y', 'y-', 'y -', 'y- Latitud', 'Y - Latitud', 'y_', 'Y_UTM', 'Latitud', 'Norte', 'NORTHING'];
  cases.forEach(c => {
    test(`"${c}"`, () => expect(COLUMN_PATTERNS.coordY.test(c)).toBeTrue());
  });
});

describe('Patrón coordY - NO debe detectar (FIX v3.2 falso positivo):', () => {
  const cases = [
    'Cantidad y tipo',
    'Lugar y afección',
    'Medios humanos Cantidad y tipo',
    'Responsable y suplente',
    'Nombre y apellidos',
    'x',
    'Longitud'
  ];
  cases.forEach(c => {
    test(`"${c}"`, () => expect(COLUMN_PATTERNS.coordY.test(c)).toBeFalse());
  });
});

// --- cleanCoordinateValue ---
describe('cleanCoordinateValue - Separadores de miles:', () => {
  const cases = [
    ['524.538', '524538'],
    ['4.229.920', '4229920'],
    ['524.891', '524891'],
    ['4.230.105', '4230105'],
    ['506 527', '506527'],
  ];
  cases.forEach(([input, expected]) => {
    test(`"${input}" → "${expected}"`, () => expect(cleanCoordinateValue(input)).toBe(expected));
  });
});

describe('cleanCoordinateValue - Placeholders:', () => {
  const cases = ['Indicar', 'indicar', 'Sin datos', '---', '...', '___', 'N/A', 'xxx', 'Completar'];
  cases.forEach(c => {
    test(`"${c}" → ""`, () => expect(cleanCoordinateValue(c)).toBe(''));
  });
});

// --- isValidUTMValue ---
describe('isValidUTMValue - Coordenada X:', () => {
  test('524538 válida', () => expect(isValidUTMValue('524538', 'x')).toBeTrue());
  test('99999 inválida (bajo)', () => expect(isValidUTMValue('99999', 'x')).toBeFalse());
  test('800001 inválida (alto)', () => expect(isValidUTMValue('800001', 'x')).toBeFalse());
});

describe('isValidUTMValue - Coordenada Y:', () => {
  test('4229920 válida', () => expect(isValidUTMValue('4229920', 'y')).toBeTrue());
  test('3999999 inválida (bajo)', () => expect(isValidUTMValue('3999999', 'y')).toBeFalse());
  test('4350001 inválida (alto)', () => expect(isValidUTMValue('4350001', 'y')).toBeFalse());
});

// --- CASOS REALES HORNOS ---
describe('Casos reales Hornos.odt:', () => {
  test('Header "X - Longitud" detecta X', () => 
    expect(COLUMN_PATTERNS.coordX.test('X - Longitud')).toBeTrue());
  
  test('Header "y- Latitud" detecta Y', () => 
    expect(COLUMN_PATTERNS.coordY.test('y- Latitud')).toBeTrue());
  
  test('Header "Coordenadas (UTM- Geográficas)" detecta combinada', () => 
    expect(COLUMN_PATTERNS.coordCombined.test('Coordenadas (UTM- Geográficas)')).toBeTrue());
  
  test('Header "Medios humanos Cantidad y tipo" NO detecta Y', () => 
    expect(COLUMN_PATTERNS.coordY.test('Medios humanos Cantidad y tipo')).toBeFalse());
  
  test('Castillo Hornos X: 524.643 → 524643', () => 
    expect(cleanCoordinateValue('524.643')).toBe('524643'));
  
  test('Castillo Hornos Y: 4.229.868 → 4229868', () => 
    expect(cleanCoordinateValue('4.229.868')).toBe('4229868'));
});

// =============================================================================
// RESUMEN
// =============================================================================

console.log('\n' + '='.repeat(70));
console.log(`📊 RESUMEN: ${passed} passed, ${failed} failed`);
console.log('='.repeat(70));

if (failed > 0) {
  console.log('\n❌ TESTS FALLIDOS:');
  failures.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
  process.exit(1);
} else {
  console.log('\n✅ TODOS LOS TESTS PASARON');
  process.exit(0);
}
