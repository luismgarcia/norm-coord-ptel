/**
 * @fileoverview Códigos INE derivados de la fuente única de verdad
 * @description Este módulo deriva los códigos INE desde municipiosCentroides.ts,
 *              que contiene datos oficiales extraídos del WFS DERA (IECA).
 *              Esto garantiza consistencia y elimina errores de duplicación.
 * 
 * @author Proyecto PTEL - Normalizador de Coordenadas
 * @version 2.0.0
 * @date 2025-12-02
 * @source Derivado de municipiosCentroides.ts (fuente: WFS DERA)
 */

import { 
  CENTROIDES_MUNICIPIOS, 
  CentroideMunicipio,
  TOTAL_MUNICIPIOS 
} from '../lib/municipiosCentroides';

// ============================================================================
// TIPOS
// ============================================================================

export interface MunicipioDerivado {
  codigo: string;
  nombre: string;
  nombreNormalizado: string;
  provincia: string;
  codigoProvincia: string;
}

// ============================================================================
// FUNCIONES DE NORMALIZACIÓN
// ============================================================================

/**
 * Normaliza un nombre de municipio para búsquedas
 * - Convierte a minúsculas
 * - Elimina acentos
 * - Elimina artículos iniciales (el, la, los, las)
 */
export function normalizarNombreMunicipio(nombre: string): string {
  if (!nombre) return '';
  
  let normalizado = nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .trim();
  
  // Eliminar artículos iniciales
  normalizado = normalizado.replace(/^(el|la|los|las)\s+/i, '');
  
  return normalizado;
}

// ============================================================================
// DATOS DERIVADOS (generados desde CENTROIDES_MUNICIPIOS)
// ============================================================================

/**
 * Mapa de nombre normalizado → código INE
 * Generado automáticamente desde municipiosCentroides.ts
 */
export const NOMBRE_A_CODIGO_INE: Record<string, string> = {};

/**
 * Mapa de código INE → datos completos del municipio
 */
export const MUNICIPIOS_POR_CODIGO: Record<string, MunicipioDerivado> = {};

/**
 * Lista de todos los municipios ordenados alfabéticamente
 */
export const LISTA_MUNICIPIOS: MunicipioDerivado[] = [];

// Poblar los mapas desde la fuente única de verdad
(function inicializarDatos() {
  for (const [codigo, centroide] of Object.entries(CENTROIDES_MUNICIPIOS)) {
    const nombreNorm = normalizarNombreMunicipio(centroide.nombre);
    const codigoProvincia = codigo.substring(0, 2);
    
    const municipio: MunicipioDerivado = {
      codigo,
      nombre: centroide.nombre,
      nombreNormalizado: nombreNorm,
      provincia: centroide.provincia,
      codigoProvincia
    };
    
    NOMBRE_A_CODIGO_INE[nombreNorm] = codigo;
    MUNICIPIOS_POR_CODIGO[codigo] = municipio;
    LISTA_MUNICIPIOS.push(municipio);
  }
  
  // Ordenar alfabéticamente
  LISTA_MUNICIPIOS.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
})();

// ============================================================================
// FUNCIONES DE CONSULTA
// ============================================================================

/**
 * Obtiene el código INE de un municipio por nombre
 * @param nombreMunicipio - Nombre del municipio (acepta variaciones)
 * @returns Código INE de 5 dígitos o null si no se encuentra
 */
export function getCodigoINEDerivado(nombreMunicipio: string): string | null {
  const nombreNorm = normalizarNombreMunicipio(nombreMunicipio);
  
  // Búsqueda exacta
  if (NOMBRE_A_CODIGO_INE[nombreNorm]) {
    return NOMBRE_A_CODIGO_INE[nombreNorm];
  }
  
  // Búsqueda parcial (el nombre buscado está contenido en un municipio)
  for (const [nombre, codigo] of Object.entries(NOMBRE_A_CODIGO_INE)) {
    if (nombre.includes(nombreNorm) || nombreNorm.includes(nombre)) {
      return codigo;
    }
  }
  
  return null;
}

/**
 * Obtiene información completa de un municipio por código INE
 */
export function getMunicipioDerivado(codigoINE: string): MunicipioDerivado | null {
  const codigo = codigoINE.padStart(5, '0');
  return MUNICIPIOS_POR_CODIGO[codigo] || null;
}

/**
 * Valida si un código INE existe en el catálogo oficial
 */
export function esCodigoINEValido(codigoINE: string): boolean {
  const codigo = codigoINE.padStart(5, '0');
  return codigo in MUNICIPIOS_POR_CODIGO;
}

/**
 * Obtiene todos los municipios de una provincia
 */
export function getMunicipiosDeProvinciaDerivado(provincia: string): MunicipioDerivado[] {
  const provNorm = normalizarNombreMunicipio(provincia);
  return LISTA_MUNICIPIOS.filter(m => 
    normalizarNombreMunicipio(m.provincia).includes(provNorm)
  );
}

/**
 * Busca municipios por texto parcial
 */
export function buscarMunicipiosDerivado(texto: string, limite: number = 10): MunicipioDerivado[] {
  const textoNorm = normalizarNombreMunicipio(texto);
  return LISTA_MUNICIPIOS
    .filter(m => m.nombreNormalizado.includes(textoNorm))
    .slice(0, limite);
}

// ============================================================================
// VALIDACIÓN DE INTEGRIDAD
// ============================================================================

/**
 * Verifica la integridad de los datos derivados
 * Útil para detectar problemas en el catálogo fuente
 */
export function validarIntegridadDatos(): { valido: boolean; errores: string[] } {
  const errores: string[] = [];
  
  // Verificar total de municipios
  const totalDerivados = Object.keys(MUNICIPIOS_POR_CODIGO).length;
  if (totalDerivados !== TOTAL_MUNICIPIOS) {
    errores.push(`Total municipios: esperado ${TOTAL_MUNICIPIOS}, encontrado ${totalDerivados}`);
  }
  
  // Verificar que todos los códigos INE tienen 5 dígitos
  for (const codigo of Object.keys(MUNICIPIOS_POR_CODIGO)) {
    if (!/^\d{5}$/.test(codigo)) {
      errores.push(`Código INE inválido: ${codigo}`);
    }
  }
  
  // Verificar que no hay duplicados en nombres normalizados
  const nombresVistos = new Set<string>();
  for (const [nombre, codigo] of Object.entries(NOMBRE_A_CODIGO_INE)) {
    if (nombresVistos.has(nombre)) {
      errores.push(`Nombre duplicado: ${nombre} (código ${codigo})`);
    }
    nombresVistos.add(nombre);
  }
  
  return {
    valido: errores.length === 0,
    errores
  };
}

// ============================================================================
// EXPORTACIÓN POR DEFECTO
// ============================================================================

export default {
  getCodigoINE: getCodigoINEDerivado,
  getMunicipio: getMunicipioDerivado,
  esCodigoValido: esCodigoINEValido,
  getMunicipiosPorProvincia: getMunicipiosDeProvinciaDerivado,
  buscarMunicipios: buscarMunicipiosDerivado,
  validarIntegridad: validarIntegridadDatos,
  TOTAL: TOTAL_MUNICIPIOS,
  normalizarNombre: normalizarNombreMunicipio
};
