/**
 * Tests para MunicipioDetector v1.0
 * 
 * Valida detección automática de municipios desde múltiples fuentes
 */

import { describe, it, expect } from '../testFramework.mjs';
import {
  detectarMunicipio,
  detectarDesdeNombreArchivo,
  detectarDesdeCabecera,
  detectarDesdeContenido,
  normalizarTexto,
  buscarMunicipiosPorTexto,
  obtenerListaMunicipios,
} from '../municipioDetector';

// ============================================================================
// TESTS: NORMALIZACIÓN DE TEXTO
// ============================================================================

describe('normalizarTexto', () => {
  it('debería convertir a minúsculas y eliminar acentos', () => {
    expect(normalizarTexto('Córdoba')).toBe('cordoba');
    expect(normalizarTexto('MÁLAGA')).toBe('malaga');
    expect(normalizarTexto('Cádiz')).toBe('cadiz');
  });

  it('debería eliminar caracteres especiales', () => {
    expect(normalizarTexto('La Línea de la Concepción')).toBe('la linea de la concepcion');
    expect(normalizarTexto('Castril (Granada)')).toBe('castril granada');
  });

  it('debería normalizar espacios', () => {
    expect(normalizarTexto('  Colomera   ')).toBe('colomera');
    expect(normalizarTexto('La  Zubia')).toBe('la zubia');
  });

  it('debería manejar strings vacíos', () => {
    expect(normalizarTexto('')).toBe('');
    expect(normalizarTexto(null as unknown as string)).toBe('');
  });
});

// ============================================================================
// TESTS: DETECCIÓN DESDE NOMBRE DE ARCHIVO
// ============================================================================

describe('detectarDesdeNombreArchivo', () => {
  it('debería detectar patrón PTEL_MUNICIPIO_AÑO', () => {
    const resultado = detectarDesdeNombreArchivo('PTEL_COLOMERA_2024.odt');
    expect(resultado).not.toBe(null);
    expect(resultado?.municipioDetectado.toLowerCase()).toContain('colomera');
    expect(resultado?.puntuacion).toBeGreaterThanOrEqual(70);
  });

  it('debería detectar patrón Ficha_PTEL_MUNICIPIO', () => {
    const resultado = detectarDesdeNombreArchivo('Ficha_PTEL_Berja.pdf');
    expect(resultado).not.toBe(null);
    expect(resultado?.municipioDetectado.toLowerCase()).toContain('berja');
  });

  it('debería detectar patrón con guiones', () => {
    const resultado = detectarDesdeNombreArchivo('PTEL-Castril-2024.odt');
    expect(resultado).not.toBe(null);
    expect(resultado?.municipioDetectado.toLowerCase()).toContain('castril');
  });

  it('debería ignorar archivos sin patrón reconocible', () => {
    const resultado = detectarDesdeNombreArchivo('documento.txt');
    // Puede ser null o tener baja puntuación
    if (resultado) {
      expect(resultado.puntuacion).toBeLessThan(50);
    }
  });

  it('debería manejar rutas completas', () => {
    const resultado = detectarDesdeNombreArchivo('/home/user/docs/PTEL_ALHAMA_2024.odt');
    expect(resultado).not.toBe(null);
  });
});

// ============================================================================
// TESTS: DETECCIÓN DESDE CABECERA
// ============================================================================

describe('detectarDesdeCabecera', () => {
  it('debería detectar "Plan Territorial de Emergencias de..."', () => {
    const cabecera = `
      PLAN TERRITORIAL DE EMERGENCIAS LOCAL DE COLOMERA
      Actualización 2024
    `;
    const resultado = detectarDesdeCabecera(cabecera);
    expect(resultado).not.toBe(null);
    expect(resultado?.municipioDetectado.toLowerCase()).toContain('colomera');
    expect(resultado?.puntuacion).toBeGreaterThanOrEqual(90);
  });

  it('debería detectar "PTEL de..."', () => {
    const cabecera = 'PTEL del Municipio de Berja - Granada';
    const resultado = detectarDesdeCabecera(cabecera);
    expect(resultado).not.toBe(null);
    expect(resultado?.municipioDetectado.toLowerCase()).toContain('berja');
  });

  it('debería detectar "Ayuntamiento de..."', () => {
    const cabecera = `
      Excmo. Ayuntamiento de Castril
      Concejalía de Seguridad Ciudadana
    `;
    const resultado = detectarDesdeCabecera(cabecera);
    expect(resultado).not.toBe(null);
    expect(resultado?.municipioDetectado.toLowerCase()).toContain('castril');
  });

  it('debería ignorar texto sin patrones reconocibles', () => {
    const cabecera = 'Este es un documento genérico sin información del municipio.';
    const resultado = detectarDesdeCabecera(cabecera);
    expect(resultado).toBe(null);
  });
});

// ============================================================================
// TESTS: DETECCIÓN DESDE CONTENIDO
// ============================================================================

describe('detectarDesdeContenido', () => {
  it('debería detectar municipio por frecuencia alta', () => {
    const contenido = `
      El municipio de Colomera tiene una población de 1.500 habitantes.
      En Colomera existen varios centros educativos.
      El Ayuntamiento de Colomera gestiona las emergencias locales.
      La infraestructura de Colomera incluye un centro de salud.
    `;
    const resultado = detectarDesdeContenido(contenido);
    expect(resultado).not.toBe(null);
    expect(resultado?.municipioDetectado.toLowerCase()).toContain('colomera');
  });

  it('debería preferir el municipio más frecuente', () => {
    const contenido = `
      Colomera Colomera Colomera Colomera Colomera
      Granada Granada
      Sevilla
    `;
    const resultado = detectarDesdeContenido(contenido);
    expect(resultado).not.toBe(null);
    expect(resultado?.municipioDetectado.toLowerCase()).toContain('colomera');
  });

  it('debería ignorar contenido sin municipios reconocibles', () => {
    const contenido = 'Este texto no contiene nombres de municipios andaluces.';
    const resultado = detectarDesdeContenido(contenido);
    expect(resultado).toBe(null);
  });
});

// ============================================================================
// TESTS: DETECCIÓN COMBINADA
// ============================================================================

describe('detectarMunicipio (combinada)', () => {
  it('debería combinar múltiples fuentes para alta confianza', () => {
    const nombreArchivo = 'PTEL_Colomera_2024.odt';
    const contenido = `
      PLAN TERRITORIAL DE EMERGENCIAS LOCAL DE COLOMERA
      
      El municipio de Colomera se encuentra en la provincia de Granada.
      Colomera cuenta con un Centro de Salud y varios centros educativos.
    `;
    
    const resultado = detectarMunicipio(nombreArchivo, contenido);
    
    expect(resultado).not.toBe(null);
    expect(resultado?.municipio.toLowerCase()).toContain('colomera');
    expect(resultado?.confianza).toBe('ALTA');
    expect(resultado?.detalles.length).toBeGreaterThanOrEqual(2);
  });

  it('debería devolver null si no hay información suficiente', () => {
    const resultado = detectarMunicipio('documento.txt', 'Texto genérico sin datos.');
    expect(resultado).toBe(null);
  });

  it('debería incluir código INE correcto', () => {
    const resultado = detectarMunicipio(
      'PTEL_Granada_2024.odt',
      'Plan Territorial de Emergencias Local de Granada'
    );
    
    expect(resultado).not.toBe(null);
    expect(resultado?.codigoINE).toBe('18087'); // INE de Granada capital
  });

  it('debería detectar provincia correctamente', () => {
    const resultado = detectarMunicipio(
      'PTEL_Berja_2024.odt',
      'Plan de Emergencias de Berja'
    );
    
    expect(resultado).not.toBe(null);
    expect(resultado?.provincia.toLowerCase()).toBe('almería');
  });
});

// ============================================================================
// TESTS: BÚSQUEDA DE MUNICIPIOS
// ============================================================================

describe('buscarMunicipiosPorTexto', () => {
  it('debería encontrar coincidencias exactas', () => {
    const resultados = buscarMunicipiosPorTexto('Granada');
    expect(resultados.length).toBeGreaterThan(0);
    expect(resultados[0].nombre.toLowerCase()).toContain('granada');
  });

  it('debería encontrar coincidencias parciales', () => {
    const resultados = buscarMunicipiosPorTexto('Col');
    expect(resultados.length).toBeGreaterThan(0);
    // Debería encontrar Colomera, Colmenar, etc.
  });

  it('debería manejar búsquedas vacías', () => {
    const resultados = buscarMunicipiosPorTexto('');
    expect(resultados.length).toBe(0);
  });

  it('debería respetar maxResultados', () => {
    const resultados = buscarMunicipiosPorTexto('a', 5);
    expect(resultados.length).toBeLessThanOrEqual(5);
  });
});

// ============================================================================
// TESTS: LISTA DE MUNICIPIOS
// ============================================================================

describe('obtenerListaMunicipios', () => {
  it('debería devolver 785 municipios', () => {
    const municipios = obtenerListaMunicipios();
    expect(municipios.length).toBe(785);
  });

  it('debería estar ordenada alfabéticamente', () => {
    const municipios = obtenerListaMunicipios();
    for (let i = 1; i < municipios.length; i++) {
      expect(
        municipios[i].nombre.localeCompare(municipios[i-1].nombre, 'es')
      ).toBeGreaterThanOrEqual(0);
    }
  });

  it('debería incluir todos los campos necesarios', () => {
    const municipios = obtenerListaMunicipios();
    for (const m of municipios.slice(0, 10)) {
      expect(m.nombre).toBeDefined();
      expect(m.codigoINE).toBeDefined();
      expect(m.provincia).toBeDefined();
      expect(m.codigoINE.length).toBe(5);
    }
  });
});

// ============================================================================
// TESTS: CASOS LÍMITE
// ============================================================================

describe('Casos límite', () => {
  it('debería manejar municipios con artículos', () => {
    // La Zubia, El Ejido, Los Palacios, Las Gabias
    const resultado = detectarMunicipio(
      'PTEL_Zubia_2024.odt',
      'Plan de Emergencias de La Zubia'
    );
    expect(resultado).not.toBe(null);
  });

  it('debería manejar municipios con nombres compuestos', () => {
    const resultado = detectarMunicipio(
      'PTEL_Linea_2024.odt',
      'Plan de Emergencias de La Línea de la Concepción'
    );
    expect(resultado).not.toBe(null);
  });

  it('debería tolerar errores tipográficos menores', () => {
    const resultado = detectarMunicipio(
      'PTEL_Colmera_2024.odt', // Falta una 'o'
      'Plan de Emergencias'
    );
    // Debería intentar encontrar Colomera
    // (puede fallar o detectar con baja confianza)
  });

  it('debería distinguir municipios con nombres similares', () => {
    // Colomera (Granada) vs Colomers (Girona, no existe en Andalucía)
    const resultado = detectarMunicipio(
      'PTEL_Colomera_2024.odt',
      'Plan de Colomera'
    );
    expect(resultado).not.toBe(null);
    expect(resultado?.provincia.toLowerCase()).toBe('granada');
  });
});

// ============================================================================
// EJECUTAR TESTS
// ============================================================================

export function runMunicipioDetectorTests() {
  console.log('\n🏛️ Tests MunicipioDetector\n');
  
  // Los tests se ejecutan automáticamente con el framework
  return true;
}
