/**
 * PTEL Andalucía - Tests de Integridad de Datos
 * 
 * Estos tests validan la consistencia entre las diferentes fuentes de datos
 * del sistema, previniendo errores por catálogos desincronizados.
 * 
 * @module __tests__/dataIntegrity
 * @version 1.0.0
 * @date Diciembre 2025
 */

import { describe, test, expect } from 'vitest';
import { CENTROIDES_MUNICIPIOS, getCentroidePorINE } from '../municipiosCentroides';
import { 
  MUNICIPIOS_POR_CODIGO, 
  CODIGOS_INE_VALIDOS,
  esCodigoINEValido,
  getCodigoINE,
  CATALOGO_STATS 
} from '../codigosINEUnificado';

// ============================================================================
// TESTS DE INTEGRIDAD DEL CATÁLOGO UNIFICADO
// ============================================================================

describe('Integridad del Catálogo INE Unificado', () => {
  
  test('debe tener al menos 780 municipios andaluces', () => {
    expect(CATALOGO_STATS.totalMunicipios).toBeGreaterThanOrEqual(780);
    expect(CATALOGO_STATS.totalMunicipios).toBeLessThanOrEqual(790);
  });

  test('debe tener las 8 provincias andaluzas', () => {
    const provincias = Object.keys(CATALOGO_STATS.porProvincia);
    expect(provincias).toContain('Almería');
    expect(provincias).toContain('Cádiz');
    expect(provincias).toContain('Córdoba');
    expect(provincias).toContain('Granada');
    expect(provincias).toContain('Huelva');
    expect(provincias).toContain('Jaén');
    expect(provincias).toContain('Málaga');
    expect(provincias).toContain('Sevilla');
    expect(provincias.length).toBe(8);
  });

  test('cada provincia debe tener municipios', () => {
    for (const [provincia, count] of Object.entries(CATALOGO_STATS.porProvincia)) {
      expect(count).toBeGreaterThan(0);
      // Huelva tiene ~45 municipios, las demás más de 80
      expect(count).toBeGreaterThanOrEqual(40);
      expect(count).toBeLessThanOrEqual(200);
    }
  });

  test('todos los códigos INE deben tener 5 dígitos', () => {
    for (const codigo of CODIGOS_INE_VALIDOS) {
      expect(codigo).toMatch(/^\d{5}$/);
    }
  });

  test('todos los códigos deben empezar con código de provincia válido', () => {
    const codigosProvincia = ['04', '11', '14', '18', '21', '23', '29', '41'];
    
    for (const codigo of CODIGOS_INE_VALIDOS) {
      const prefijo = codigo.substring(0, 2);
      expect(codigosProvincia).toContain(prefijo);
    }
  });
});

// ============================================================================
// TESTS DE CONSISTENCIA ENTRE CATÁLOGOS
// ============================================================================

describe('Consistencia municipiosCentroides ↔ codigosINEUnificado', () => {
  
  test('ambos catálogos deben tener el mismo número de municipios', () => {
    const countCentroides = Object.keys(CENTROIDES_MUNICIPIOS).length;
    const countUnificado = MUNICIPIOS_POR_CODIGO.size;
    
    expect(countUnificado).toBe(countCentroides);
  });

  test('todos los códigos de centroides deben estar en el catálogo unificado', () => {
    for (const codigo of Object.keys(CENTROIDES_MUNICIPIOS)) {
      expect(esCodigoINEValido(codigo)).toBe(true);
    }
  });

  test('los nombres deben coincidir entre catálogos', () => {
    for (const [codigo, centroide] of Object.entries(CENTROIDES_MUNICIPIOS)) {
      const municipio = MUNICIPIOS_POR_CODIGO.get(codigo);
      expect(municipio).toBeDefined();
      expect(municipio!.nombre).toBe(centroide.nombre);
    }
  });
});

// ============================================================================
// TESTS DE MUNICIPIOS CRÍTICOS PARA PTEL
// ============================================================================

describe('Municipios críticos para tests PTEL', () => {
  
  const MUNICIPIOS_CRITICOS = [
    { codigo: '18051', nombre: 'Colomera', provincia: 'Granada' },
    { codigo: '18046', nombre: 'Castril', provincia: 'Granada' },
    { codigo: '18087', nombre: 'Granada', provincia: 'Granada' },
    { codigo: '04029', nombre: 'Berja', provincia: 'Almería' },
    { codigo: '04013', nombre: 'Almería', provincia: 'Almería' },
    { codigo: '18168', nombre: 'Quéntar', provincia: 'Granada' },
  ];

  test.each(MUNICIPIOS_CRITICOS)(
    '$nombre ($codigo) debe existir con datos correctos',
    ({ codigo, nombre, provincia }) => {
      // Verificar en catálogo unificado
      expect(esCodigoINEValido(codigo)).toBe(true);
      
      const municipio = MUNICIPIOS_POR_CODIGO.get(codigo);
      expect(municipio).toBeDefined();
      expect(municipio!.nombre).toBe(nombre);
      expect(municipio!.provincia).toBe(provincia);
      
      // Verificar en centroides
      const centroide = getCentroidePorINE(codigo);
      expect(centroide).toBeDefined();
      expect(centroide!.nombre).toBe(nombre);
      expect(centroide!.x).toBeGreaterThan(100000);
      expect(centroide!.y).toBeGreaterThan(4000000);
    }
  );
});

// ============================================================================
// TESTS DE BÚSQUEDA POR NOMBRE
// ============================================================================

describe('Búsqueda de códigos INE por nombre', () => {
  
  test('búsqueda exacta debe funcionar', () => {
    expect(getCodigoINE('Colomera')).toBe('18051');
    expect(getCodigoINE('Castril')).toBe('18046');
    expect(getCodigoINE('Granada')).toBe('18087');
  });

  test('búsqueda con variaciones debe funcionar', () => {
    expect(getCodigoINE('COLOMERA')).toBe('18051');
    expect(getCodigoINE('colomera')).toBe('18051');
    expect(getCodigoINE('  Colomera  ')).toBe('18051');
  });

  test('búsqueda sin acentos debe funcionar', () => {
    expect(getCodigoINE('Quentar')).toBe('18168');
    expect(getCodigoINE('Almeria')).toBe('04013');
  });

  test('municipio inexistente debe retornar null', () => {
    expect(getCodigoINE('MunicipioInventado')).toBeNull();
    expect(getCodigoINE('')).toBeNull();
  });
});

// ============================================================================
// TESTS CONTRA CÓDIGOS INE CONOCIDOS COMO PROBLEMÁTICOS
// ============================================================================

describe('Códigos INE problemáticos (errores históricos)', () => {
  
  // Estos códigos fueron usados incorrectamente en versiones anteriores
  const CODIGOS_PROBLEMATICOS = [
    { 
      descripcion: 'Castril - código incorrecto 18040 vs correcto 18046',
      incorrecto: '18040',
      correcto: '18046',
      nombre: 'Castril'
    },
    { 
      descripcion: 'Cortes de Baza - código incorrecto 18052 vs correcto 18053',
      incorrecto: '18052', // Este es realmente de otro municipio
      correcto: '18053',
      nombre: 'Cortes de Baza'
    },
  ];

  test.each(CODIGOS_PROBLEMATICOS)(
    '$descripcion',
    ({ incorrecto, correcto, nombre }) => {
      // El código correcto debe existir
      expect(esCodigoINEValido(correcto)).toBe(true);
      
      const municipio = MUNICIPIOS_POR_CODIGO.get(correcto);
      expect(municipio).toBeDefined();
      expect(municipio!.nombre).toBe(nombre);
      
      // Búsqueda por nombre debe devolver el código correcto
      expect(getCodigoINE(nombre)).toBe(correcto);
    }
  );
});
