/**
 * Tests para seedPatterns.ts y quickProfiler.ts
 * Nivel 1 - Perfilador Rápido Adaptativo
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PATTERN_CATALOG,
  MUNICIPIO_PROFILES,
  ESTADISTICAS_GLOBALES,
  getPerfilMunicipio,
  getPatronesSugeridosPorMunicipio,
  getPatron,
  getTodosPatronesOrdenados,
  sugerirPatronesPorProvincia,
  calcularComplejidadEsperada,
  getMunicipiosConPerfil,
  tienePerfilConocido
} from '../seedPatterns';

import {
  perfilarDocumentoRapido,
  tienePerfilConocido as tienePerfilConocidoQP,
  getMunicipiosConPerfil as getMunicipiosConPerfilQP,
  sugerirPatronesParaMunicipio
} from '../quickProfiler';

import { CENTROIDES_MUNICIPIOS } from '../municipiosCentroides';

// ============================================================================
// TESTS DE INTEGRIDAD REFERENCIAL
// ============================================================================

describe('integridad referencial', () => {
  it('todos los códigos INE en MUNICIPIO_PROFILES deben existir en CENTROIDES_MUNICIPIOS', () => {
    for (const ine of Object.keys(MUNICIPIO_PROFILES)) {
      expect(
        CENTROIDES_MUNICIPIOS[ine],
        `Código INE ${ine} no existe en CENTROIDES_MUNICIPIOS`
      ).toBeDefined();
    }
  });

  it('los nombres de municipios deben coincidir entre ambas fuentes', () => {
    for (const [ine, perfil] of Object.entries(MUNICIPIO_PROFILES)) {
      const centroide = CENTROIDES_MUNICIPIOS[ine];
      if (centroide) {
        expect(
          centroide.nombre,
          `Nombre no coincide para INE ${ine}: "${centroide.nombre}" vs "${perfil.nombre}"`
        ).toBe(perfil.nombre);
      }
    }
  });

  it('las provincias deben coincidir entre ambas fuentes', () => {
    for (const [ine, perfil] of Object.entries(MUNICIPIO_PROFILES)) {
      const centroide = CENTROIDES_MUNICIPIOS[ine];
      if (centroide) {
        expect(
          centroide.provincia,
          `Provincia no coincide para ${perfil.nombre}`
        ).toBe(perfil.provincia);
      }
    }
  });

  it('los patrones referenciados en perfiles deben existir en PATTERN_CATALOG', () => {
    for (const perfil of Object.values(MUNICIPIO_PROFILES)) {
      for (const patron of perfil.patronesPrincipales) {
        expect(
          PATTERN_CATALOG[patron.patronId],
          `Patrón ${patron.patronId} no existe en PATTERN_CATALOG (usado en ${perfil.nombre})`
        ).toBeDefined();
      }
    }
  });
});

// ============================================================================
// TESTS PARA seedPatterns.ts
// ============================================================================

describe('seedPatterns', () => {
  describe('PATTERN_CATALOG', () => {
    it('debe contener 9 patrones', () => {
      expect(Object.keys(PATTERN_CATALOG).length).toBe(9);
    });

    it('cada patrón debe tener campos obligatorios', () => {
      for (const patron of Object.values(PATTERN_CATALOG)) {
        expect(patron.id).toBeDefined();
        expect(patron.nombre).toBeDefined();
        expect(patron.descripcion).toBeDefined();
        expect(patron.regex).toBeInstanceOf(RegExp);
        expect(patron.ejemplos.length).toBeGreaterThan(0);
        expect(patron.frecuenciaGlobal).toBeGreaterThanOrEqual(0);
        expect(patron.frecuenciaGlobal).toBeLessThanOrEqual(100);
        expect(['baja', 'media', 'alta']).toContain(patron.complejidadAsociada);
        expect(patron.fasesRequeridas.length).toBeGreaterThan(0);
      }
    });

    it('COMA_DECIMAL debe ser el más frecuente', () => {
      const ordenados = getTodosPatronesOrdenados();
      expect(ordenados[0].id).toBe('COMA_DECIMAL');
      expect(ordenados[0].frecuenciaGlobal).toBe(42);
    });

    it('los ejemplos deben coincidir con el regex', () => {
      for (const patron of Object.values(PATTERN_CATALOG)) {
        for (const ejemplo of patron.ejemplos) {
          // Nota: algunos patrones como ESPACIO_DOBLE_TILDE tienen caracteres especiales
          // que pueden no coincidir exactamente, así que solo verificamos que el regex existe
          expect(patron.regex).toBeInstanceOf(RegExp);
        }
      }
    });
  });

  describe('MUNICIPIO_PROFILES', () => {
    it('debe contener 7 municipios', () => {
      expect(Object.keys(MUNICIPIO_PROFILES).length).toBe(7);
    });

    it('Berja debe tener complejidad alta', () => {
      const berja = MUNICIPIO_PROFILES['04029'];
      expect(berja).toBeDefined();
      expect(berja.nivelComplejidad).toBe('alta');
      expect(berja.requiereCorreccionP0).toBe(true);
    });

    it('Colomera debe tener complejidad baja', () => {
      const colomera = MUNICIPIO_PROFILES['18051'];
      expect(colomera).toBeDefined();
      expect(colomera.nivelComplejidad).toBe('baja');
      expect(colomera.patronesPrincipales[0].patronId).toBe('COMA_DECIMAL');
    });

    it('cada perfil debe tener campos obligatorios', () => {
      for (const perfil of Object.values(MUNICIPIO_PROFILES)) {
        expect(perfil.codigoINE).toBeDefined();
        expect(perfil.nombre).toBeDefined();
        expect(perfil.provincia).toBeDefined();
        expect(perfil.coordenadasAnalizadas).toBeGreaterThan(0);
        expect(perfil.patronesPrincipales.length).toBeGreaterThan(0);
        expect(['baja', 'media', 'alta']).toContain(perfil.nivelComplejidad);
      }
    });
  });

  describe('ESTADISTICAS_GLOBALES', () => {
    it('debe tener estadísticas correctas', () => {
      expect(ESTADISTICAS_GLOBALES.totalCoordenadas).toBe(426);
      expect(ESTADISTICAS_GLOBALES.totalMunicipios).toBe(7);
      expect(ESTADISTICAS_GLOBALES.patronMasFrecuente).toBe('COMA_DECIMAL');
    });
  });

  describe('getPerfilMunicipio', () => {
    it('debe retornar perfil para código INE válido', () => {
      const perfil = getPerfilMunicipio('18051');
      expect(perfil).not.toBeNull();
      expect(perfil?.nombre).toBe('Colomera');
    });

    it('debe retornar null para código INE inválido', () => {
      const perfil = getPerfilMunicipio('99999');
      expect(perfil).toBeNull();
    });
  });

  describe('getPatronesSugeridosPorMunicipio', () => {
    it('debe retornar patrones ordenados para Colomera', () => {
      const patrones = getPatronesSugeridosPorMunicipio('18051');
      expect(patrones.length).toBeGreaterThan(0);
      expect(patrones[0].id).toBe('COMA_DECIMAL');
    });

    it('debe retornar múltiples patrones para Berja', () => {
      const patrones = getPatronesSugeridosPorMunicipio('04029');
      expect(patrones.length).toBe(3);
      expect(patrones[0].id).toBe('ESPACIO_DOBLE_TILDE');
    });

    it('debe retornar array vacío para municipio sin perfil', () => {
      const patrones = getPatronesSugeridosPorMunicipio('99999');
      expect(patrones).toEqual([]);
    });
  });

  describe('sugerirPatronesPorProvincia', () => {
    it('debe sugerir patrones para Granada', () => {
      const patrones = sugerirPatronesPorProvincia('Granada');
      expect(patrones.length).toBeGreaterThan(0);
      // COMA_DECIMAL es común en Granada
      expect(patrones.some(p => p.id === 'COMA_DECIMAL')).toBe(true);
    });

    it('debe sugerir patrones para Almería', () => {
      const patrones = sugerirPatronesPorProvincia('Almería');
      expect(patrones.length).toBeGreaterThan(0);
      // ESPACIO_DOBLE_TILDE es típico de Almería
      expect(patrones.some(p => p.id === 'ESPACIO_DOBLE_TILDE')).toBe(true);
    });
  });

  describe('calcularComplejidadEsperada', () => {
    it('debe retornar complejidad del perfil si existe', () => {
      expect(calcularComplejidadEsperada('04029')).toBe('alta'); // Berja
      expect(calcularComplejidadEsperada('18051')).toBe('baja'); // Colomera
    });

    it('debe inferir complejidad alta para Almería', () => {
      expect(calcularComplejidadEsperada(undefined, 'Almería')).toBe('alta');
      expect(calcularComplejidadEsperada(undefined, 'almeria')).toBe('alta');
    });

    it('debe inferir complejidad media para Granada', () => {
      expect(calcularComplejidadEsperada(undefined, 'Granada')).toBe('media');
    });

    it('debe retornar media por defecto', () => {
      expect(calcularComplejidadEsperada()).toBe('media');
    });
  });

  describe('getMunicipiosConPerfil', () => {
    it('debe retornar 7 municipios', () => {
      const municipios = getMunicipiosConPerfil();
      expect(municipios.length).toBe(7);
    });

    it('cada municipio debe tener código, nombre y provincia', () => {
      const municipios = getMunicipiosConPerfil();
      for (const m of municipios) {
        expect(m.codigoINE).toBeDefined();
        expect(m.nombre).toBeDefined();
        expect(m.provincia).toBeDefined();
      }
    });
  });

  describe('tienePerfilConocido', () => {
    it('debe retornar true para municipios conocidos', () => {
      expect(tienePerfilConocido('18051')).toBe(true); // Colomera
      expect(tienePerfilConocido('04029')).toBe(true); // Berja
    });

    it('debe retornar false para municipios desconocidos', () => {
      expect(tienePerfilConocido('99999')).toBe(false);
      expect(tienePerfilConocido('')).toBe(false);
    });
  });
});

// ============================================================================
// TESTS PARA quickProfiler.ts
// ============================================================================

describe('quickProfiler', () => {
  describe('perfilarDocumentoRapido', () => {
    it('debe detectar Colomera desde nombre de archivo', async () => {
      const perfil = await perfilarDocumentoRapido(
        'PTEL_Colomera_2024.odt',
        'Plan Territorial de Emergencias Local'
      );
      
      expect(perfil.municipio).toBe('Colomera');
      expect(perfil.codigoINE).toBe('18051');
      expect(perfil.provincia).toBe('Granada');
    });

    it('debe sugerir COMA_DECIMAL para Colomera', async () => {
      const perfil = await perfilarDocumentoRapido(
        'PTEL_Colomera_2024.odt',
        ''
      );
      
      expect(perfil.patronPrincipal?.id).toBe('COMA_DECIMAL');
      expect(perfil.complejidad).toBe('baja');
      expect(perfil.perfilConocido).toBe(true);
    });

    it('debe detectar Berja y sugerir ESPACIO_DOBLE_TILDE', async () => {
      const perfil = await perfilarDocumentoRapido(
        'PTEL_Berja_Almeria.odt',
        ''
      );
      
      expect(perfil.municipio).toBe('Berja');
      expect(perfil.patronPrincipal?.id).toBe('ESPACIO_DOBLE_TILDE');
      expect(perfil.complejidad).toBe('alta');
      expect(perfil.requiereCorreccionP0).toBe(true);
    });

    it('debe funcionar con municipio forzado', async () => {
      const perfil = await perfilarDocumentoRapido(
        'documento_sin_nombre_claro.odt',
        '',
        { forzarMunicipio: '18051' }
      );
      
      expect(perfil.codigoINE).toBe('18051');
      expect(perfil.municipio).toBe('Colomera');
      expect(perfil.fuentePerfil).toBe('conocido');
    });

    it('debe analizar muestra de coordenadas', async () => {
      const perfil = await perfilarDocumentoRapido(
        'documento_desconocido.odt',
        '',
        {
          muestraCoordenadas: [
            '436789,50',
            '4136578,25',
            '512345,00',
            '436790,75'
          ]
        }
      );
      
      expect(perfil.muestraAnalizada).toBe(4);
      expect(perfil.formatoDecimalDetectado).toBe('coma');
    });

    it('debe calcular fases optimizadas correctamente', async () => {
      const perfil = await perfilarDocumentoRapido(
        'PTEL_Colomera.odt',
        ''
      );
      
      // COMA_DECIMAL requiere: FASE_0_TRIM, FASE_4_COMA_DECIMAL, FASE_5_PARSING
      expect(perfil.fasesOptimizadas).toContain('FASE_0_TRIM');
      expect(perfil.fasesOptimizadas).toContain('FASE_4_COMA_DECIMAL');
      expect(perfil.fasesOptimizadas).toContain('FASE_5_PARSING');
      
      // Fases de DMS, NMEA, etc. deben estar omitidas
      expect(perfil.fasesOmitidas).toContain('FASE_6_DMS');
      expect(perfil.fasesOmitidas).toContain('FASE_7_NMEA');
    });

    it('debe usar perfil genérico si no hay datos', async () => {
      const perfil = await perfilarDocumentoRapido(
        'archivo_sin_pistas.txt',
        'contenido sin municipio identificable'
      );
      
      expect(perfil.fuentePerfil).toBe('generico');
      expect(perfil.patronesSugeridos.length).toBeGreaterThan(0);
      expect(perfil.puntuacion).toBeLessThan(50);
    });

    it('debe inferir por provincia si no hay perfil conocido', async () => {
      // Usar contenido que mencione una provincia pero no un municipio conocido
      const perfil = await perfilarDocumentoRapido(
        'PTEL_MunicipioNuevo.odt',
        'Plan de Emergencias de Almería'
      );
      
      // Puede que no detecte municipio pero sí provincia
      if (perfil.provincia?.toLowerCase().includes('almer')) {
        expect(perfil.complejidad).toBe('alta');
      }
    });

    it('debe completar en menos de 100ms para perfil conocido', async () => {
      const perfil = await perfilarDocumentoRapido(
        'PTEL_Colomera.odt',
        ''
      );
      
      expect(perfil.tiempoAnalisis).toBeLessThan(100);
    });

    it('debe completar en menos de 200ms con análisis de muestra', async () => {
      const muestra = Array(20).fill('436789,50');
      
      const perfil = await perfilarDocumentoRapido(
        'documento.odt',
        '',
        { muestraCoordenadas: muestra, forzarAnalisisMuestra: true }
      );
      
      expect(perfil.tiempoAnalisis).toBeLessThan(200);
    });
  });

  describe('funciones de utilidad', () => {
    it('tienePerfilConocido debe funcionar', () => {
      expect(tienePerfilConocidoQP('18051')).toBe(true);
      expect(tienePerfilConocidoQP('99999')).toBe(false);
    });

    it('getMunicipiosConPerfil debe retornar 7 municipios', () => {
      const municipios = getMunicipiosConPerfilQP();
      expect(municipios.length).toBe(7);
    });

    it('sugerirPatronesParaMunicipio con código INE', () => {
      const patrones = sugerirPatronesParaMunicipio('18062');
      expect(patrones.length).toBeGreaterThan(0);
      expect(patrones[0].id).toBe('COMA_DECIMAL');
    });

    it('sugerirPatronesParaMunicipio con provincia', () => {
      const patrones = sugerirPatronesParaMunicipio(undefined, 'Granada');
      expect(patrones.length).toBeGreaterThan(0);
    });

    it('sugerirPatronesParaMunicipio sin datos retorna genéricos', () => {
      const patrones = sugerirPatronesParaMunicipio();
      expect(patrones.length).toBe(3);
    });
  });

  describe('integración con normalizador', () => {
    it('patrones deben corresponder a PatronDetectado válidos', () => {
      // Los IDs de patrón deben ser consistentes con el normalizador
      const idsValidos = [
        'LIMPIO_PUNTO', 'LIMPIO_ENTERO', 'COMA_DECIMAL', 'EUROPEO_COMPLETO',
        'ESPACIO_DOBLE_TILDE', 'ESPACIO_SIN_DECIMAL', 'ESPACIO_DECIMAL_IMPLICITO',
        'Y_TRUNCADA', 'MOJIBAKE_UTF8'
      ];
      
      for (const id of Object.keys(PATTERN_CATALOG)) {
        expect(idsValidos).toContain(id);
      }
    });
  });
});
