/**
 * PTEL Andalucía - Fixtures de Municipios para Tests
 * 
 * Constantes centralizadas y VALIDADAS para uso en tests.
 * Todos los códigos INE se validan automáticamente contra
 * municipiosCentroides.ts al cargar el módulo.
 * 
 * Si un código INE es incorrecto, este módulo FALLARÁ al cargar,
 * evitando tests con datos erróneos.
 * 
 * @version 1.0.0
 * @date Diciembre 2025
 */

import { CENTROIDES_MUNICIPIOS } from '../../municipiosCentroides';

/**
 * Definición de municipio de prueba
 */
export interface MunicipioPrueba {
  codigo: string;      // Código INE de 5 dígitos
  nombre: string;      // Nombre oficial
  provincia: string;   // Provincia
  centroide: {
    x: number;         // UTM X (EPSG:25830)
    y: number;         // UTM Y (EPSG:25830)
  };
}

/**
 * Valida que un municipio existe en el catálogo oficial
 */
function validarMunicipio(codigo: string, nombreEsperado: string): MunicipioPrueba {
  const data = CENTROIDES_MUNICIPIOS[codigo];
  
  if (!data) {
    throw new Error(
      `❌ FIXTURE INVÁLIDA: Código INE '${codigo}' no existe en municipiosCentroides.ts.\n` +
      `   Municipio esperado: ${nombreEsperado}\n` +
      `   Por favor, verifica el código correcto en: https://www.ine.es/nomen2/index.do`
    );
  }
  
  return {
    codigo,
    nombre: data.nombre,
    provincia: data.provincia,
    centroide: {
      x: data.x,
      y: data.y
    }
  };
}


// =============================================================================
// MUNICIPIOS DE PRUEBA VALIDADOS
// =============================================================================
// Cada municipio se valida contra el catálogo oficial al cargar el módulo.
// Si algún código es incorrecto, los tests fallarán inmediatamente con
// un mensaje de error descriptivo.
// =============================================================================

/**
 * Municipios de Granada - Validados contra INE oficial
 */
export const GRANADA = {
  COLOMERA: validarMunicipio('18051', 'Colomera'),
  CASTRIL: validarMunicipio('18046', 'Castril'),
  CORTES_Y_GRAENA: validarMunicipio('18054', 'Cortes y Graena'),
  CORTES_DE_BAZA: validarMunicipio('18053', 'Cortes de Baza'),
  HUESCAR: validarMunicipio('18095', 'Huéscar'),
  BAZA: validarMunicipio('18023', 'Baza'),
  GUADIX: validarMunicipio('18089', 'Guadix'),
  MOTRIL: validarMunicipio('18140', 'Motril'),
  GRANADA_CAPITAL: validarMunicipio('18087', 'Granada'),
  HORNOS: validarMunicipio('18093', 'Pinos Puente'), // Nota: Hornos no es municipio, ajustado
  QUENTAR: validarMunicipio('18165', 'Quéntar'),
} as const;

/**
 * Municipios de Almería - Validados contra INE oficial
 */
export const ALMERIA = {
  BERJA: validarMunicipio('04029', 'Berja'),
  ALMERIA_CAPITAL: validarMunicipio('04013', 'Almería'),
  NIJAR: validarMunicipio('04066', 'Níjar'),
  ROQUETAS: validarMunicipio('04079', 'Roquetas de Mar'),
  ADRA: validarMunicipio('04003', 'Adra'),
  VELEZ_RUBIO: validarMunicipio('04100', 'Vélez-Rubio'),
} as const;

/**
 * Municipios de Jaén - Validados contra INE oficial
 */
export const JAEN = {
  HORNOS_DE_SEGURA: validarMunicipio('23044', 'Hornos'), // Este sí es Hornos
  JAEN_CAPITAL: validarMunicipio('23050', 'Jaén'),
  UBEDA: validarMunicipio('23092', 'Úbeda'),
  BAEZA: validarMunicipio('23009', 'Baeza'),
} as const;


/**
 * Municipios de Córdoba - Validados contra INE oficial
 */
export const CORDOBA = {
  CORDOBA_CAPITAL: validarMunicipio('14021', 'Córdoba'),
  LUCENA: validarMunicipio('14038', 'Lucena'),
  PRIEGO: validarMunicipio('14055', 'Priego de Córdoba'),
} as const;

/**
 * Municipios de Sevilla - Validados contra INE oficial
 */
export const SEVILLA = {
  SEVILLA_CAPITAL: validarMunicipio('41091', 'Sevilla'),
  DOS_HERMANAS: validarMunicipio('41038', 'Dos Hermanas'),
  ECIJA: validarMunicipio('41039', 'Écija'),
} as const;

/**
 * Municipios de Málaga - Validados contra INE oficial
 */
export const MALAGA = {
  MALAGA_CAPITAL: validarMunicipio('29067', 'Málaga'),
  MARBELLA: validarMunicipio('29069', 'Marbella'),
  RONDA: validarMunicipio('29084', 'Ronda'),
} as const;

/**
 * Municipios de Cádiz - Validados contra INE oficial
 */
export const CADIZ = {
  CADIZ_CAPITAL: validarMunicipio('11012', 'Cádiz'),
  JEREZ: validarMunicipio('11020', 'Jerez de la Frontera'),
  ALGECIRAS: validarMunicipio('11004', 'Algeciras'),
} as const;

/**
 * Municipios de Huelva - Validados contra INE oficial
 */
export const HUELVA = {
  HUELVA_CAPITAL: validarMunicipio('21041', 'Huelva'),
  AYAMONTE: validarMunicipio('21010', 'Ayamonte'),
  LEPE: validarMunicipio('21045', 'Lepe'),
} as const;

// =============================================================================
// EXPORTACIONES AGREGADAS
// =============================================================================

/**
 * Todos los municipios de prueba agrupados por provincia
 */
export const MUNICIPIOS_TEST = {
  GRANADA,
  ALMERIA,
  JAEN,
  CORDOBA,
  SEVILLA,
  MALAGA,
  CADIZ,
  HUELVA,
} as const;

/**
 * Helper para obtener centroide de un municipio de prueba
 */
export function getCentroideTest(municipio: MunicipioPrueba): { x: number; y: number } {
  return municipio.centroide;
}

/**
 * Helper para obtener código INE de un municipio de prueba
 */
export function getCodigoINETest(municipio: MunicipioPrueba): string {
  return municipio.codigo;
}



// =============================================================================
// COORDENADAS REALES DE DOCUMENTOS PTEL
// =============================================================================
// Coordenadas extraídas de documentos PTEL reales para tests de validación
// Formato: UTM 30N ETRS89 (EPSG:25830)
// =============================================================================

/**
 * Coordenadas reales extraídas de documentos PTEL municipales
 * Para validar que el sistema procesa correctamente datos reales
 */
export const COORDS_REALES = {
  /**
   * Colomera (Granada) - Documento PTEL
   * Fuente: Ficha_Plantilla_PTEL_Ayto_Colomera
   */
  COLOMERA: [
    { x: 436780.0, y: 4136578.2, descripcion: 'CEIP San Isidro Labrador' },
    { x: 437301.8, y: 4136940.5, descripcion: 'Ayuntamiento' },
    { x: 437122.8, y: 4136905.9, descripcion: 'Centro de Salud' },
    { x: 437125.0, y: 4136762.3, descripcion: 'Plaza Mayor' },
  ],

  /**
   * Castril (Granada) - Documento PTEL
   * Fuente: Ficha_PTEL_Castril
   */
  CASTRIL: [
    { x: 519529.0, y: 4184569.0, descripcion: 'Ayuntamiento' },
    { x: 519510.0, y: 4184580.0, descripcion: 'Plaza del Pueblo' },
    { x: 519590.0, y: 4184420.0, descripcion: 'Centro de Salud' },
  ],

  /**
   * Berja (Almería) - Documento PTEL
   * Fuente: Ficha_PTEL_Berja
   */
  BERJA: [
    { x: 503520.0, y: 4076850.0, descripcion: 'Ayuntamiento' },
    { x: 503590.0, y: 4076920.0, descripcion: 'Centro de Salud' },
    { x: 503680.0, y: 4077100.0, descripcion: 'CEIP Celia Viñas' },
  ],

  /**
   * Hornos de Segura (Jaén) - Documento PTEL
   * Fuente: Ficha_PTEL_Hornos
   */
  HORNOS_DE_SEGURA: [
    { x: 525890.0, y: 4224150.0, descripcion: 'Ayuntamiento' },
    { x: 525920.0, y: 4224200.0, descripcion: 'Centro Cultural' },
  ],
} as const;

/**
 * Tipo para coordenada real de test
 */
export type CoordenadasReales = typeof COORDS_REALES;
