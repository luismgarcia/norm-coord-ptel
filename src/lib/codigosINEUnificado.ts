/**
 * PTEL Andalucía - Sistema Unificado de Códigos INE
 * 
 * ⚠️ FUENTE ÚNICA DE VERDAD para códigos INE de municipios andaluces
 * 
 * Este módulo deriva TODOS los códigos INE desde municipiosCentroides.ts,
 * que fue generado automáticamente desde el servicio WFS DERA del IECA.
 * 
 * NUNCA editar manualmente los códigos aquí. Si hay errores:
 * 1. Verificar contra https://www.ine.es/daco/daco42/codmun/
 * 2. Corregir municipiosCentroides.ts (fuente primaria)
 * 3. Este archivo se actualiza automáticamente
 * 
 * @module codigosINEUnificado
 * @version 1.0.0
 * @date Diciembre 2025
 * @author Proyecto PTEL - Normalizador de Coordenadas
 */

import { CENTROIDES_MUNICIPIOS, type CentroideMunicipio } from './municipiosCentroides';

// ============================================================================
// TIPOS
// ============================================================================

export interface MunicipioINEUnificado {
  codigo: string;
  nombre: string;
  nombreNormalizado: string;
  provincia: string;
  codigoProvincia: string;
}

export interface ResultadoBusquedaINE {
  encontrado: boolean;
  codigo: string | null;
  nombre: string | null;
  provincia: string | null;
  confianza: 'EXACTA' | 'PARCIAL' | 'NINGUNA';
}

// ============================================================================
// CONSTANTES DE PROVINCIAS
// ============================================================================

export const PROVINCIAS_ANDALUCIA: Record<string, string> = {
  '04': 'Almería',
  '11': 'Cádiz',
  '14': 'Córdoba',
  '18': 'Granada',
  '21': 'Huelva',
  '23': 'Jaén',
  '29': 'Málaga',
  '41': 'Sevilla'
};

export const CODIGO_PROVINCIA_POR_NOMBRE: Record<string, string> = {
  'almeria': '04',
  'cadiz': '11',
  'cordoba': '14',
  'granada': '18',
  'huelva': '21',
  'jaen': '23',
  'malaga': '29',
  'sevilla': '41'
};

// ============================================================================
// FUNCIONES DE NORMALIZACIÓN
// ============================================================================

/**
 * Normaliza un nombre de municipio para búsqueda
 * - Convierte a minúsculas
 * - Elimina acentos
 * - Elimina artículos iniciales (el, la, los, las)
 * - Normaliza espacios
 */
export function normalizarNombreMunicipio(nombre: string): string {
  if (!nombre) return '';
  
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/^(el|la|los|las)\s+/i, '') // Eliminar artículos iniciales
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================================================
// ÍNDICES DERIVADOS (generados automáticamente desde CENTROIDES_MUNICIPIOS)
// ============================================================================

/**
 * Mapa de código INE → información del municipio
 * Derivado de CENTROIDES_MUNICIPIOS
 */
export const MUNICIPIOS_POR_CODIGO: Map<string, MunicipioINEUnificado> = new Map(
  Object.entries(CENTROIDES_MUNICIPIOS).map(([codigo, data]) => [
    codigo,
    {
      codigo,
      nombre: data.nombre,
      nombreNormalizado: normalizarNombreMunicipio(data.nombre),
      provincia: data.provincia,
      codigoProvincia: codigo.substring(0, 2)
    }
  ])
);

/**
 * Mapa de nombre normalizado → código INE
 * Para búsqueda rápida por nombre
 */
export const CODIGO_POR_NOMBRE: Map<string, string> = new Map(
  Array.from(MUNICIPIOS_POR_CODIGO.entries()).map(([codigo, data]) => [
    data.nombreNormalizado,
    codigo
  ])
);

/**
 * Set de códigos INE válidos para validación O(1)
 */
export const CODIGOS_INE_VALIDOS: Set<string> = new Set(
  MUNICIPIOS_POR_CODIGO.keys()
);

// ============================================================================
// FUNCIONES DE BÚSQUEDA Y VALIDACIÓN
// ============================================================================

/**
 * Obtiene el código INE de un municipio por su nombre
 * @param nombre - Nombre del municipio (acepta variaciones)
 * @returns Código INE de 5 dígitos o null si no se encuentra
 */
export function getCodigoINE(nombre: string): string | null {
  const normalizado = normalizarNombreMunicipio(nombre);
  return CODIGO_POR_NOMBRE.get(normalizado) || null;
}

/**
 * Valida si un código INE existe en el catálogo oficial
 * @param codigo - Código INE a validar
 * @returns true si el código existe
 */
export function esCodigoINEValido(codigo: string): boolean {
  return CODIGOS_INE_VALIDOS.has(codigo);
}

/**
 * Obtiene información completa de un municipio por código INE
 * @param codigo - Código INE de 5 dígitos
 * @returns Información del municipio o null
 */
export function getMunicipioPorCodigo(codigo: string): MunicipioINEUnificado | null {
  return MUNICIPIOS_POR_CODIGO.get(codigo) || null;
}

/**
 * Busca un municipio por nombre con diferentes niveles de confianza
 * @param nombre - Nombre a buscar
 * @returns Resultado con nivel de confianza
 */
export function buscarMunicipio(nombre: string): ResultadoBusquedaINE {
  const normalizado = normalizarNombreMunicipio(nombre);
  
  // Búsqueda exacta
  const codigoExacto = CODIGO_POR_NOMBRE.get(normalizado);
  if (codigoExacto) {
    const municipio = MUNICIPIOS_POR_CODIGO.get(codigoExacto)!;
    return {
      encontrado: true,
      codigo: codigoExacto,
      nombre: municipio.nombre,
      provincia: municipio.provincia,
      confianza: 'EXACTA'
    };
  }
  
  // Búsqueda parcial (el nombre buscado está contenido en algún municipio)
  for (const [nombreMun, codigo] of CODIGO_POR_NOMBRE.entries()) {
    if (nombreMun.includes(normalizado) || normalizado.includes(nombreMun)) {
      const municipio = MUNICIPIOS_POR_CODIGO.get(codigo)!;
      return {
        encontrado: true,
        codigo,
        nombre: municipio.nombre,
        provincia: municipio.provincia,
        confianza: 'PARCIAL'
      };
    }
  }
  
  return {
    encontrado: false,
    codigo: null,
    nombre: null,
    provincia: null,
    confianza: 'NINGUNA'
  };
}

/**
 * Obtiene todos los municipios de una provincia
 * @param codigoProvincia - Código de 2 dígitos de la provincia
 * @returns Array de municipios
 */
export function getMunicipiosPorProvincia(codigoProvincia: string): MunicipioINEUnificado[] {
  return Array.from(MUNICIPIOS_POR_CODIGO.values())
    .filter(m => m.codigoProvincia === codigoProvincia);
}

/**
 * Obtiene estadísticas del catálogo
 */
export function getEstadisticasCatalogo(): {
  totalMunicipios: number;
  porProvincia: Record<string, number>;
} {
  const porProvincia: Record<string, number> = {};
  
  for (const municipio of MUNICIPIOS_POR_CODIGO.values()) {
    const prov = municipio.provincia;
    porProvincia[prov] = (porProvincia[prov] || 0) + 1;
  }
  
  return {
    totalMunicipios: MUNICIPIOS_POR_CODIGO.size,
    porProvincia
  };
}

// ============================================================================
// VALIDACIÓN EN TIEMPO DE CARGA
// ============================================================================

// Verificar integridad del catálogo al cargar el módulo
const stats = getEstadisticasCatalogo();
if (stats.totalMunicipios < 780) {
  console.warn(
    `[codigosINEUnificado] ⚠️ Catálogo incompleto: ${stats.totalMunicipios} municipios ` +
    `(esperados ~785). Verificar municipiosCentroides.ts`
  );
}

// Exportar estadísticas para debugging
export const CATALOGO_STATS = stats;
