/**
 * Tests para codigosINEDerivados
 * Verifica la integridad de los datos derivados desde municipiosCentroides.ts
 */

import {
  getCodigoINEDerivado,
  getMunicipioDerivado,
  esCodigoINEValido,
  getMunicipiosDeProvinciaDerivado,
  buscarMunicipiosDerivado,
  validarIntegridadDatos,
  normalizarNombreMunicipio,
  NOMBRE_A_CODIGO_INE,
  MUNICIPIOS_POR_CODIGO,
  LISTA_MUNICIPIOS
} from '../../data/codigosINEDerivados';

import { TOTAL_MUNICIPIOS } from '../municipiosCentroides';

describe('codigosINEDerivados - Integridad', () => {
  test('tiene 785 municipios', () => {
    expect(Object.keys(MUNICIPIOS_POR_CODIGO).length).toBe(TOTAL_MUNICIPIOS);
    expect(LISTA_MUNICIPIOS.length).toBe(TOTAL_MUNICIPIOS);
  });

  test('validación de integridad pasa', () => {
    const resultado = validarIntegridadDatos();
    expect(resultado.valido).toBe(true);
    expect(resultado.errores).toHaveLength(0);
  });

  test('todos los códigos tienen 5 dígitos', () => {
    for (const codigo of Object.keys(MUNICIPIOS_POR_CODIGO)) {
      expect(codigo).toMatch(/^\d{5}$/);
    }
  });
});

describe('codigosINEDerivados - Consultas', () => {
  test('getCodigoINEDerivado encuentra Colomera', () => {
    expect(getCodigoINEDerivado('Colomera')).toBe('18051');
    expect(getCodigoINEDerivado('COLOMERA')).toBe('18051');
    expect(getCodigoINEDerivado('colomera')).toBe('18051');
  });

  test('getCodigoINEDerivado encuentra Castril', () => {
    expect(getCodigoINEDerivado('Castril')).toBe('18046');
  });

  test('getCodigoINEDerivado encuentra Hornos', () => {
    expect(getCodigoINEDerivado('Hornos')).toBe('23043');
  });

  test('getCodigoINEDerivado encuentra Tíjola con y sin acento', () => {
    expect(getCodigoINEDerivado('Tíjola')).toBe('04092');
    expect(getCodigoINEDerivado('Tijola')).toBe('04092');
  });

  test('getMunicipioDerivado retorna datos completos', () => {
    const municipio = getMunicipioDerivado('18051');
    expect(municipio).not.toBeNull();
    expect(municipio?.nombre).toBe('Colomera');
    expect(municipio?.provincia).toBe('Granada');
    expect(municipio?.codigoProvincia).toBe('18');
  });

  test('esCodigoINEValido funciona correctamente', () => {
    expect(esCodigoINEValido('18051')).toBe(true);
    expect(esCodigoINEValido('99999')).toBe(false);
    expect(esCodigoINEValido('123')).toBe(false);
  });

  test('getMunicipiosDeProvinciaDerivado retorna municipios de Granada', () => {
    const municipios = getMunicipiosDeProvinciaDerivado('Granada');
    expect(municipios.length).toBeGreaterThan(100); // Granada tiene ~174 municipios
    expect(municipios.every(m => m.provincia === 'Granada')).toBe(true);
  });

  test('buscarMunicipiosDerivado encuentra por texto parcial', () => {
    const resultados = buscarMunicipiosDerivado('colo', 5);
    expect(resultados.length).toBeGreaterThan(0);
    expect(resultados.some(m => m.nombre === 'Colomera')).toBe(true);
  });
});

describe('codigosINEDerivados - Consistencia con catálogo', () => {
  // Estos tests verifican que NO hay los errores que tenía codigosINE.ts
  
  test('Colomera es 18051, no 18052', () => {
    expect(getCodigoINEDerivado('Colomera')).toBe('18051');
    expect(getCodigoINEDerivado('Colomera')).not.toBe('18052');
  });

  test('Castril es 18046, no 18040 ni 18054', () => {
    expect(getCodigoINEDerivado('Castril')).toBe('18046');
    expect(getCodigoINEDerivado('Castril')).not.toBe('18040');
    expect(getCodigoINEDerivado('Castril')).not.toBe('18054');
  });

  test('Cortes de Baza es 18053', () => {
    expect(getCodigoINEDerivado('Cortes de Baza')).toBe('18053');
  });

  test('Cortes y Graena es 18054', () => {
    expect(getCodigoINEDerivado('Cortes y Graena')).toBe('18054');
  });
});

describe('normalizarNombreMunicipio', () => {
  test('elimina acentos', () => {
    expect(normalizarNombreMunicipio('Tíjola')).toBe('tijola');
    expect(normalizarNombreMunicipio('Quéntar')).toBe('quentar');
  });

  test('elimina artículos iniciales', () => {
    expect(normalizarNombreMunicipio('El Ejido')).toBe('ejido');
    expect(normalizarNombreMunicipio('La Mojonera')).toBe('mojonera');
    expect(normalizarNombreMunicipio('Los Gallardos')).toBe('gallardos');
  });

  test('maneja strings vacíos', () => {
    expect(normalizarNombreMunicipio('')).toBe('');
  });
});
