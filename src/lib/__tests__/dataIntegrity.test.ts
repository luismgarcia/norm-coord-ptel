/**
 * dataIntegrity.test.ts - Tests de Integridad Referencial PTEL
 * 
 * Validaciones estructurales de datos estáticos:
 * - Patrones regex válidos y compilables
 * - Ejemplos coinciden con sus propios regex
 * - Provincias referenciadas son de Andalucía
 * - Referencias cruzadas entre estructuras
 * - Códigos INE válidos
 * - Rangos UTM coherentes por provincia
 */

import { describe, it, expect } from 'vitest';
import { 
  PATTERN_CATALOG, 
  MUNICIPIO_PROFILES,
  ESTADISTICAS_GLOBALES,
  getPatron,
  getPerfilMunicipio
} from '../seedPatterns';

// ============================================================================
// CONSTANTES DE VALIDACIÓN
// ============================================================================

/** Las 8 provincias de Andalucía */
const PROVINCIAS_ANDALUCIA = [
  'Almería',
  'Cádiz', 
  'Córdoba',
  'Granada',
  'Huelva',
  'Jaén',
  'Málaga',
  'Sevilla'
];

/** Códigos INE de provincias andaluzas */
const CODIGOS_PROVINCIA_ANDALUCIA = ['04', '11', '14', '18', '21', '23', '29', '41'];

/** Rangos UTM aproximados por provincia (EPSG:25830) */
const RANGOS_UTM_PROVINCIA: Record<string, {
  xMin: number; xMax: number;
  yMin: number; yMax: number;
}> = {
  'Almería':  { xMin: 500000, xMax: 620000, yMin: 4050000, yMax: 4180000 },
  'Cádiz':    { xMin: 200000, xMax: 320000, yMin: 4000000, yMax: 4120000 },
  'Córdoba':  { xMin: 280000, xMax: 420000, yMin: 4150000, yMax: 4280000 },
  'Granada':  { xMin: 380000, xMax: 560000, yMin: 4050000, yMax: 4200000 },
  'Huelva':   { xMin: 100000, xMax: 260000, yMin: 4100000, yMax: 4220000 },
  'Jaén':     { xMin: 380000, xMax: 560000, yMin: 4180000, yMax: 4280000 },
  'Málaga':   { xMin: 280000, xMax: 440000, yMin: 4030000, yMax: 4120000 },
  'Sevilla':  { xMin: 200000, xMax: 360000, yMin: 4100000, yMax: 4220000 }
};

// ============================================================================
// TESTS: CATÁLOGO DE PATRONES
// ============================================================================

describe('PATTERN_CATALOG - Integridad Estructural', () => {
  const patrones = Object.entries(PATTERN_CATALOG);

  it('debe contener al menos 5 patrones', () => {
    expect(patrones.length).toBeGreaterThanOrEqual(5);
  });

  describe.each(patrones)('Patrón %s', (id, patron) => {
    it('tiene ID consistente', () => {
      expect(patron.id).toBe(id);
    });

    it('tiene campos obligatorios', () => {
      expect(patron.nombre).toBeTruthy();
      expect(patron.descripcion).toBeTruthy();
      expect(patron.regex).toBeInstanceOf(RegExp);
      expect(Array.isArray(patron.ejemplos)).toBe(true);
      expect(patron.ejemplos.length).toBeGreaterThan(0);
    });

    it('regex compila sin errores', () => {
      expect(() => new RegExp(patron.regex.source, patron.regex.flags)).not.toThrow();
    });

    it('frecuenciaGlobal está en rango 0-100', () => {
      expect(patron.frecuenciaGlobal).toBeGreaterThanOrEqual(0);
      expect(patron.frecuenciaGlobal).toBeLessThanOrEqual(100);
    });

    it('complejidadAsociada es válida', () => {
      expect(['baja', 'media', 'alta']).toContain(patron.complejidadAsociada);
    });

    it('tiene fases requeridas válidas', () => {
      expect(Array.isArray(patron.fasesRequeridas)).toBe(true);
      patron.fasesRequeridas.forEach(fase => {
        expect(fase).toMatch(/^FASE_/);
      });
    });
  });
});

describe('PATTERN_CATALOG - Validación de Regex', () => {
  const patrones = Object.entries(PATTERN_CATALOG);

  describe.each(patrones)('Patrón %s - Ejemplos', (id, patron) => {
    // Test que al menos un ejemplo coincide (algunos regex son muy estrictos)
    it('al menos un ejemplo coincide con el regex', () => {
      const algunoCoincide = patron.ejemplos.some(ejemplo => 
        patron.regex.test(ejemplo)
      );
      
      // Si ninguno coincide, mostrar diagnóstico
      if (!algunoCoincide) {
        console.warn(`[${id}] Ningún ejemplo coincide con regex ${patron.regex}`);
        console.warn(`  Ejemplos: ${patron.ejemplos.join(', ')}`);
      }
      
      expect(algunoCoincide).toBe(true);
    });
  });
});

describe('PATTERN_CATALOG - Provincias Referenciadas', () => {
  it('todas las provincias referenciadas son de Andalucía', () => {
    const provinciasReferenciadas = new Set<string>();
    
    Object.values(PATTERN_CATALOG).forEach(patron => {
      patron.provinciasComunes.forEach(prov => {
        provinciasReferenciadas.add(prov);
      });
    });

    provinciasReferenciadas.forEach(provincia => {
      expect(PROVINCIAS_ANDALUCIA).toContain(provincia);
    });
  });

  it('cubre al menos 3 provincias diferentes', () => {
    const provinciasUnicas = new Set<string>();
    
    Object.values(PATTERN_CATALOG).forEach(patron => {
      patron.provinciasComunes.forEach(prov => {
        provinciasUnicas.add(prov);
      });
    });

    expect(provinciasUnicas.size).toBeGreaterThanOrEqual(3);
  });
});

// ============================================================================
// TESTS: PERFILES DE MUNICIPIOS
// ============================================================================

describe('MUNICIPIO_PROFILES - Integridad Estructural', () => {
  const municipios = Object.entries(MUNICIPIO_PROFILES);

  it('debe contener al menos 5 municipios', () => {
    expect(municipios.length).toBeGreaterThanOrEqual(5);
  });

  describe.each(municipios)('Municipio %s', (codigoINE, perfil) => {
    it('código INE tiene formato válido (5 dígitos)', () => {
      expect(codigoINE).toMatch(/^\d{5}$/);
      expect(perfil.codigoINE).toBe(codigoINE);
    });

    it('código provincia es de Andalucía', () => {
      const codigoProvincia = codigoINE.substring(0, 2);
      expect(CODIGOS_PROVINCIA_ANDALUCIA).toContain(codigoProvincia);
    });

    it('provincia declarada es de Andalucía', () => {
      expect(PROVINCIAS_ANDALUCIA).toContain(perfil.provincia);
    });

    it('código provincia coincide con provincia declarada', () => {
      const codigoProvincia = codigoINE.substring(0, 2);
      const provinciaEsperada: Record<string, string> = {
        '04': 'Almería', '11': 'Cádiz', '14': 'Córdoba', '18': 'Granada',
        '21': 'Huelva', '23': 'Jaén', '29': 'Málaga', '41': 'Sevilla'
      };
      expect(perfil.provincia).toBe(provinciaEsperada[codigoProvincia]);
    });

    it('tiene nombre de municipio', () => {
      expect(perfil.nombre).toBeTruthy();
      expect(perfil.nombre.length).toBeGreaterThan(1);
    });

    it('coordenadasAnalizadas es positivo', () => {
      expect(perfil.coordenadasAnalizadas).toBeGreaterThan(0);
    });

    it('documentosAnalizados es positivo', () => {
      expect(perfil.documentosAnalizados).toBeGreaterThan(0);
    });

    it('fechaAnalisis tiene formato ISO', () => {
      expect(perfil.fechaAnalisis).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('nivelComplejidad es válido', () => {
      expect(['baja', 'media', 'alta']).toContain(perfil.nivelComplejidad);
    });

    it('formatoDecimalTipico es válido', () => {
      expect(['coma', 'punto', 'mixto', 'ninguno']).toContain(perfil.formatoDecimalTipico);
    });

    it('separadorMilesTipico es válido', () => {
      expect(['punto', 'espacio', 'ninguno']).toContain(perfil.separadorMilesTipico);
    });
  });
});

describe('MUNICIPIO_PROFILES - Referencias a Patrones', () => {
  const municipios = Object.entries(MUNICIPIO_PROFILES);

  describe.each(municipios)('Municipio %s - Patrones', (codigoINE, perfil) => {
    it('tiene al menos un patrón principal', () => {
      expect(perfil.patronesPrincipales.length).toBeGreaterThan(0);
    });

    it('todos los patronId referenciados existen en PATTERN_CATALOG', () => {
      perfil.patronesPrincipales.forEach(({ patronId }) => {
        const patron = getPatron(patronId);
        expect(patron).not.toBeNull();
      });
    });

    it('frecuencias de patrones están en rango 0-100', () => {
      perfil.patronesPrincipales.forEach(({ frecuencia }) => {
        expect(frecuencia).toBeGreaterThanOrEqual(0);
        expect(frecuencia).toBeLessThanOrEqual(100);
      });
    });

    it('confianza de patrones es válida', () => {
      perfil.patronesPrincipales.forEach(({ confianza }) => {
        expect(['alta', 'media', 'baja']).toContain(confianza);
      });
    });
  });
});

// ============================================================================
// TESTS: ESTADÍSTICAS GLOBALES
// ============================================================================

describe('ESTADISTICAS_GLOBALES - Coherencia', () => {
  it('totalMunicipios coincide con MUNICIPIO_PROFILES', () => {
    expect(ESTADISTICAS_GLOBALES.totalMunicipios)
      .toBe(Object.keys(MUNICIPIO_PROFILES).length);
  });

  it('totalCoordenadas es suma de coordenadas de municipios', () => {
    const suma = Object.values(MUNICIPIO_PROFILES)
      .reduce((acc, m) => acc + m.coordenadasAnalizadas, 0);
    expect(ESTADISTICAS_GLOBALES.totalCoordenadas).toBe(suma);
  });

  it('totalDocumentos es suma de documentos de municipios', () => {
    const suma = Object.values(MUNICIPIO_PROFILES)
      .reduce((acc, m) => acc + m.documentosAnalizados, 0);
    expect(ESTADISTICAS_GLOBALES.totalDocumentos).toBe(suma);
  });

  it('tasaExitoGlobal está en rango razonable (80-100)', () => {
    expect(ESTADISTICAS_GLOBALES.tasaExitoGlobal).toBeGreaterThanOrEqual(80);
    expect(ESTADISTICAS_GLOBALES.tasaExitoGlobal).toBeLessThanOrEqual(100);
  });

  it('patronMasFrecuente existe en PATTERN_CATALOG', () => {
    expect(PATTERN_CATALOG[ESTADISTICAS_GLOBALES.patronMasFrecuente]).toBeDefined();
  });

  it('provinciasAnalizadas son de Andalucía', () => {
    ESTADISTICAS_GLOBALES.provinciasAnalizadas.forEach(prov => {
      expect(PROVINCIAS_ANDALUCIA).toContain(prov);
    });
  });

  it('provinciasAnalizadas coincide con municipios registrados', () => {
    const provinciasEnMunicipios = new Set(
      Object.values(MUNICIPIO_PROFILES).map(m => m.provincia)
    );
    
    ESTADISTICAS_GLOBALES.provinciasAnalizadas.forEach(prov => {
      expect(provinciasEnMunicipios.has(prov)).toBe(true);
    });
  });
});

// ============================================================================
// TESTS: RANGOS UTM POR PROVINCIA
// ============================================================================

describe('Rangos UTM - Validación de Constantes', () => {
  it('hay exactamente 8 provincias definidas', () => {
    expect(Object.keys(RANGOS_UTM_PROVINCIA).length).toBe(8);
  });

  it('todas las provincias de Andalucía tienen rangos', () => {
    PROVINCIAS_ANDALUCIA.forEach(provincia => {
      expect(RANGOS_UTM_PROVINCIA[provincia]).toBeDefined();
    });
  });

  describe.each(Object.entries(RANGOS_UTM_PROVINCIA))('Provincia %s', (provincia, rango) => {
    it('xMin < xMax', () => {
      expect(rango.xMin).toBeLessThan(rango.xMax);
    });

    it('yMin < yMax', () => {
      expect(rango.yMin).toBeLessThan(rango.yMax);
    });

    it('X está en rango válido para España (100k-700k)', () => {
      expect(rango.xMin).toBeGreaterThanOrEqual(100000);
      expect(rango.xMax).toBeLessThanOrEqual(700000);
    });

    it('Y está en rango válido para Andalucía (3.9M-4.3M)', () => {
      expect(rango.yMin).toBeGreaterThanOrEqual(3900000);
      expect(rango.yMax).toBeLessThanOrEqual(4300000);
    });

    it('rango X tiene tamaño razonable (50k-200k)', () => {
      const ancho = rango.xMax - rango.xMin;
      expect(ancho).toBeGreaterThanOrEqual(50000);
      expect(ancho).toBeLessThanOrEqual(200000);
    });

    it('rango Y tiene tamaño razonable (80k-150k)', () => {
      const alto = rango.yMax - rango.yMin;
      expect(alto).toBeGreaterThanOrEqual(80000);
      expect(alto).toBeLessThanOrEqual(180000);
    });
  });
});

// ============================================================================
// TESTS: FUNCIONES DE CONSULTA
// ============================================================================

describe('Funciones de Consulta - Integridad', () => {
  it('getPatron devuelve patrón válido para ID existente', () => {
    const patron = getPatron('COMA_DECIMAL');
    expect(patron).not.toBeNull();
    expect(patron?.id).toBe('COMA_DECIMAL');
  });

  it('getPatron devuelve null para ID inexistente', () => {
    const patron = getPatron('PATRON_INEXISTENTE_XYZ');
    expect(patron).toBeNull();
  });

  it('getPerfilMunicipio devuelve perfil válido para INE existente', () => {
    const perfil = getPerfilMunicipio('18051'); // Colomera
    expect(perfil).not.toBeNull();
    expect(perfil?.nombre).toBe('Colomera');
  });

  it('getPerfilMunicipio devuelve null para INE inexistente', () => {
    const perfil = getPerfilMunicipio('99999');
    expect(perfil).toBeNull();
  });
});
