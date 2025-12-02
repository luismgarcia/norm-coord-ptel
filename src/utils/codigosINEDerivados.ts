/**
 * PTEL Andalucía - Códigos INE Derivados de Fuente Única
 * 
 * Este módulo deriva TODOS los códigos INE desde municipiosCentroides.ts
 * para garantizar consistencia y evitar duplicación de datos.
 * 
 * Fuente de verdad: municipiosCentroides.ts (datos WFS DERA oficial)
 * 
 * @version 1.0.0
 * @date Diciembre 2025
 */

import { CENTROIDES_MUNICIPIOS, type CentroideMunicipio } from '../lib/municipiosCentroides';

/**
 * Normaliza un nombre de municipio para búsqueda
 * - Convierte a minúsculas
 * - Elimina acentos/diacríticos
 * - Elimina caracteres especiales preservando espacios
 */
export function normalizarNombreMunicipio(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // Elimina diacríticos
    .replace(/[^\w\s]/g, '')          // Elimina caracteres especiales
    .trim();
}

/**
 * Mapa de nombre normalizado → código INE
 * Generado automáticamente desde CENTROIDES_MUNICIPIOS
 */
export const NOMBRE_A_CODIGO_INE: Map<string, string> = new Map(
  Object.entries(CENTROIDES_MUNICIPIOS).map(([codigo, data]) => [
    normalizarNombreMunicipio(data.nombre),
    codigo
  ])
);


/**
 * Mapa de código INE → nombre original
 * Útil para búsquedas inversas
 */
export const CODIGO_INE_A_NOMBRE: Map<string, string> = new Map(
  Object.entries(CENTROIDES_MUNICIPIOS).map(([codigo, data]) => [
    codigo,
    data.nombre
  ])
);

/**
 * Obtiene el código INE para un municipio por nombre
 * @param nombreMunicipio - Nombre del municipio (acepta variantes con/sin acentos)
 * @returns Código INE de 5 dígitos o null si no existe
 */
export function getCodigoINE(nombreMunicipio: string): string | null {
  const normalizado = normalizarNombreMunicipio(nombreMunicipio);
  return NOMBRE_A_CODIGO_INE.get(normalizado) ?? null;
}

/**
 * Obtiene el nombre oficial de un municipio por código INE
 * @param codigoINE - Código INE de 5 dígitos
 * @returns Nombre oficial del municipio o null si no existe
 */
export function getNombreMunicipio(codigoINE: string): string | null {
  return CODIGO_INE_A_NOMBRE.get(codigoINE) ?? null;
}

/**
 * Valida que un código INE existe en el catálogo oficial
 * @param codigoINE - Código INE a validar
 * @returns true si el código existe, false en caso contrario
 */
export function validarCodigoINE(codigoINE: string): boolean {
  return CODIGO_INE_A_NOMBRE.has(codigoINE);
}

/**
 * Obtiene información completa de un municipio por código INE
 * @param codigoINE - Código INE de 5 dígitos
 * @returns Objeto con coordenadas, nombre y provincia, o null si no existe
 */
export function getMunicipioCompleto(codigoINE: string): (CentroideMunicipio & { codigoINE: string }) | null {
  const data = CENTROIDES_MUNICIPIOS[codigoINE];
  if (!data) return null;
  
  return {
    codigoINE,
    ...data
  };
}

/**
 * Busca municipios por nombre parcial
 * @param busqueda - Texto a buscar (parcial)
 * @returns Array de coincidencias con código y nombre
 */
export function buscarMunicipios(busqueda: string): Array<{ codigo: string; nombre: string; provincia: string }> {
  const normalizado = normalizarNombreMunicipio(busqueda);
  const resultados: Array<{ codigo: string; nombre: string; provincia: string }> = [];
  
  for (const [codigo, data] of Object.entries(CENTROIDES_MUNICIPIOS)) {
    if (normalizarNombreMunicipio(data.nombre).includes(normalizado)) {
      resultados.push({
        codigo,
        nombre: data.nombre,
        provincia: data.provincia
      });
    }
  }
  
  return resultados;
}

// Exportar total de municipios para validaciones
export const TOTAL_MUNICIPIOS_ANDALUCIA = Object.keys(CENTROIDES_MUNICIPIOS).length;

