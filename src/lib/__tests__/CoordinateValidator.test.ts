/**
 * Tests para CoordinateValidator
 * Valida las 3 medidas con coordenadas reales de documentos PTEL
 * 
 * IMPORTANTE: Usa fixtures centralizados para códigos INE validados
 * Los códigos INE son verificados automáticamente contra municipiosCentroides.ts
 */

import {
  validarDistanciaCentroide,
  normalizarNombreMunicipio,
  compararMunicipios,
  distanciaUTM,
  utmToWgs84Approx,
  CENTROIDES_MUNICIPIOS,
} from '../CoordinateValidator';

// Importar fixtures con códigos INE validados
import { GRANADA, ALMERIA, JAEN, COORDS_REALES } from './fixtures/municipiosTest';

// ============================================================================
// TEST: NORMALIZACIÓN DE NOMBRES
// ============================================================================

describe('normalizarNombreMunicipio', () => {
  test('elimina acentos', () => {
    expect(normalizarNombreMunicipio('Tíjola')).toBe('tijola');
    expect(normalizarNombreMunicipio('Quéntar')).toBe('quentar');
    expect(normalizarNombreMunicipio('Castril de la Peña')).toBe('castril de la pena');
  });

  test('elimina artículos iniciales', () => {
    expect(normalizarNombreMunicipio('El Ejido')).toBe('ejido');
    expect(normalizarNombreMunicipio('La Mojonera')).toBe('mojonera');
    expect(normalizarNombreMunicipio('Los Gallardos')).toBe('gallardos');
  });

  test('maneja casos especiales', () => {
    expect(normalizarNombreMunicipio('')).toBe('');
    expect(normalizarNombreMunicipio('  COLOMERA  ')).toBe('colomera');
  });
});

describe('compararMunicipios', () => {
  test('coincidencia exacta', () => {
    expect(compararMunicipios('Colomera', 'Colomera')).toBe(true);
    expect(compararMunicipios('COLOMERA', 'colomera')).toBe(true);
  });

  test('uno contiene al otro', () => {
    expect(compararMunicipios('Castril', 'Castril de la Peña')).toBe(true);
    expect(compararMunicipios('Castril de la Peña', 'Castril')).toBe(true);
  });

  test('similitud por Levenshtein', () => {
    expect(compararMunicipios('Colomera', 'Colomers')).toBe(true); // Error típico
    expect(compararMunicipios('Tijola', 'Tijola')).toBe(true);
  });

  test('municipios diferentes', () => {
    expect(compararMunicipios('Colomera', 'Castril')).toBe(false);
    expect(compararMunicipios('Berja', 'Adra')).toBe(false);
  });
});

// ============================================================================
// TEST: DISTANCIA UTM
// ============================================================================

describe('distanciaUTM', () => {
  test('distancia cero para mismo punto', () => {
    expect(distanciaUTM(436780, 4136578, 436780, 4136578)).toBe(0);
  });

  test('distancia correcta entre puntos Colomera', () => {
    // Entre CEIP y Ayuntamiento
    const d = distanciaUTM(436780, 4136578.2, 437301.8, 4136940.5);
    expect(d).toBeGreaterThan(0.5); // > 500m
    expect(d).toBeLessThan(1.0);    // < 1km
  });

  test('distancia razonable entre municipios', () => {
    // Colomera a Castril ~85km
    const d = distanciaUTM(437000, 4137000, 519500, 4184500);
    expect(d).toBeGreaterThan(80);
    expect(d).toBeLessThan(100);
  });
});

// ============================================================================
// TEST: CONVERSIÓN UTM A WGS84
// ============================================================================

describe('utmToWgs84Approx', () => {
  test('Colomera: ~37.37°N, ~3.71°W', () => {
    const { lat, lon } = utmToWgs84Approx(437000, 4137000);
    expect(lat).toBeGreaterThan(37.0);
    expect(lat).toBeLessThan(38.0);
    expect(lon).toBeGreaterThan(-4.0);
    expect(lon).toBeLessThan(-3.0);
  });

  test('Castril: ~37.80°N, ~2.78°W', () => {
    const { lat, lon } = utmToWgs84Approx(519500, 4184500);
    expect(lat).toBeGreaterThan(37.5);
    expect(lat).toBeLessThan(38.5);
    expect(lon).toBeGreaterThan(-3.5);
    expect(lon).toBeLessThan(-2.0);
  });
});

// ============================================================================
// TEST: VALIDACIÓN DISTANCIA CENTROIDE
// ============================================================================

describe('validarDistanciaCentroide', () => {
  test('Colomera: coordenadas reales dentro del radio', () => {
    COORDS_REALES.COLOMERA.forEach(coord => {
      const resultado = validarDistanciaCentroide(coord.x, coord.y, GRANADA.COLOMERA.codigo);
      expect(resultado.exito).toBe(true);
      expect(resultado.dentroRadio).toBe(true);
      expect(resultado.distanciaKm).toBeLessThan(5); // < 5km del centro
      expect(resultado.confianza).toBe('ALTA');
    });
  });

  test('Castril: coordenadas reales dentro del radio', () => {
    COORDS_REALES.CASTRIL.forEach(coord => {
      const resultado = validarDistanciaCentroide(coord.x, coord.y, GRANADA.CASTRIL.codigo);
      expect(resultado.exito).toBe(true);
      // Castril es un municipio extenso
      expect(resultado.distanciaKm).toBeLessThan(20);
    });
  });

  test('Municipio no en catálogo: exito=false', () => {
    const resultado = validarDistanciaCentroide(500000, 4100000, '99999');
    expect(resultado.exito).toBe(false);
    expect(resultado.confianza).toBe('BAJA');
  });

  test('Coordenada muy lejana: dentroRadio=false', () => {
    // Coordenada de Castril probada contra centroide de Colomera
    const resultado = validarDistanciaCentroide(519500, 4184500, GRANADA.COLOMERA.codigo, 15);
    expect(resultado.dentroRadio).toBe(false);
    expect(resultado.distanciaKm).toBeGreaterThan(50);
  });
});

// ============================================================================
// TEST: INTEGRACIÓN (sin llamadas de red)
// ============================================================================

describe('Integración offline', () => {
  test('Coordenadas Colomera: distancia OK', () => {
    const coord = COORDS_REALES.COLOMERA[0];
    const dist = validarDistanciaCentroide(coord.x, coord.y, GRANADA.COLOMERA.codigo);
    
    expect(dist.exito).toBe(true);
    expect(dist.confianza).toBe('ALTA');
  });

  test('Resumen batch simulado', () => {
    const resultados = new Map();
    
    // Simular 3 validaciones
    const niveles = ['CONFIRMADA', 'ALTA', 'MEDIA'];
    niveles.forEach((nivel, i) => {
      resultados.set(`coord_${i}`, {
        nivelConfianza: nivel,
        tiempoTotalMs: 100 + i * 50,
      });
    });
    
    let confirmadas = 0, alta = 0, media = 0;
    resultados.forEach(r => {
      if (r.nivelConfianza === 'CONFIRMADA') confirmadas++;
      if (r.nivelConfianza === 'ALTA') alta++;
      if (r.nivelConfianza === 'MEDIA') media++;
    });
    
    expect(confirmadas).toBe(1);
    expect(alta).toBe(1);
    expect(media).toBe(1);
  });
});
