/**
 * PTEL Andalucía - Códigos INE derivados de fuente única de verdad
 * 
 * Este módulo deriva TODOS los códigos INE desde municipiosCentroides.ts,
 * que es la fuente oficial generada desde WFS DERA (IECA).
 * 
 * IMPORTANTE: NO modificar este archivo manualmente.
 * Si hay errores, corregir en municipiosCentroides.ts
 * 
 * @version 2.0.0
 * @date Diciembre 2025
 */

import { CENTROIDES_MUNICIPIOS, type CentroideMunicipio } from './municipiosCentroides';

// ============================================================================
// TIPOS
// ============================================================================

export interface MunicipioINEDerivado {
  codigo: string;
  nombre: string;
  nombreNormalizado: string;
  provincia: string;
  codigoProvincia: string;
}

// ============================================================================
// CONSTANTES DERIVADAS
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

/**
 * Normaliza nombre de municipio para búsqueda
 * - Minúsculas
 * - Sin acentos
 * - Sin artículos iniciales (El, La, Los, Las)
 */
export function normalizarNombreMunicipio(nombre: string): string {
  if (!nombre) return '';
  
  return nombre
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/^(el|la|los|las)\s+/i, '') // Eliminar artículos iniciales
    .replace(/\s+/g, ' '); // Normalizar espacios
}

// ============================================================================
// ÍNDICES DERIVADOS (generados automáticamente desde CENTROIDES_MUNICIPIOS)
// ============================================================================

/**
 * Mapa: nombreNormalizado → código INE
 * Derivado automáticamente de CENTROIDES_MUNICIPIOS
 */
export const NOMBRE_A_CODIGO_INE: Record<string, string> = {};

/**
 * Mapa: código INE → información completa
 * Derivado automáticamente de CENTROIDES_MUNICIPIOS
 */
export const CODIGO_INE_A_MUNICIPIO: Record<string, MunicipioINEDerivado> = {};

/**
 * Lista de todos los municipios con información completa
 */
export const MUNICIPIOS_ANDALUCIA: MunicipioINEDerivado[] = [];

// Generar índices al cargar el módulo
(function generarIndices() {
  for (const [codigo, centroide] of Object.entries(CENTROIDES_MUNICIPIOS)) {
    const nombreNormalizado = normalizarNombreMunicipio(centroide.nombre);
    const codigoProvincia = codigo.substring(0, 2);
    
    const municipio: MunicipioINEDerivado = {
      codigo,
      nombre: centroide.nombre,
      nombreNormalizado,
      provincia: centroide.provincia,
      codigoProvincia
    };
    
    NOMBRE_A_CODIGO_INE[nombreNormalizado] = codigo;
    CODIGO_INE_A_MUNICIPIO[codigo] = municipio;
    MUNICIPIOS_ANDALUCIA.push(municipio);
  }
  
  // Ordenar por código
  MUNICIPIOS_ANDALUCIA.sort((a, b) => a.codigo.localeCompare(b.codigo));
})();

// ============================================================================
// FUNCIONES DE BÚSQUEDA
// ============================================================================

/**
 * Obtiene código INE desde nombre de municipio
 * @param nombre Nombre del municipio (con o sin acentos)
 * @returns Código INE de 5 dígitos o null si no existe
 */
export function getCodigoINE(nombre: string): string | null {
  if (!nombre) return null;
  const normalizado = normalizarNombreMunicipio(nombre);
  return NOMBRE_A_CODIGO_INE[normalizado] || null;
}

/**
 * Obtiene información completa de municipio desde código INE
 * @param codigo Código INE de 5 dígitos
 * @returns Información del municipio o null si no existe
 */
export function getMunicipioPorCodigo(codigo: string): MunicipioINEDerivado | null {
  return CODIGO_INE_A_MUNICIPIO[codigo] || null;
}

/**
 * Busca municipios por texto (parcial)
 * @param texto Texto a buscar en nombres de municipios
 * @param limite Máximo de resultados (default: 10)
 * @returns Lista de municipios que coinciden
 */
export function buscarMunicipios(texto: string, limite: number = 10): MunicipioINEDerivado[] {
  if (!texto || texto.length < 2) return [];
  
  const normalizado = normalizarNombreMunicipio(texto);
  const resultados: MunicipioINEDerivado[] = [];
  
  for (const municipio of MUNICIPIOS_ANDALUCIA) {
    if (municipio.nombreNormalizado.includes(normalizado)) {
      resultados.push(municipio);
      if (resultados.length >= limite) break;
    }
  }
  
  return resultados;
}

/**
 * Obtiene todos los municipios de una provincia
 * @param codigoProvincia Código de provincia (04, 11, 14, 18, 21, 23, 29, 41)
 * @returns Lista de municipios de la provincia
 */
export function getMunicipiosPorProvincia(codigoProvincia: string): MunicipioINEDerivado[] {
  return MUNICIPIOS_ANDALUCIA.filter(m => m.codigoProvincia === codigoProvincia);
}

/**
 * Valida si un código INE existe en el catálogo
 * @param codigo Código INE a validar
 * @returns true si el código existe
 */
export function existeCodigoINE(codigo: string): boolean {
  return codigo in CODIGO_INE_A_MUNICIPIO;
}

// ============================================================================
// ESTADÍSTICAS
// ============================================================================

export const ESTADISTICAS_INE = {
  totalMunicipios: Object.keys(CENTROIDES_MUNICIPIOS).length,
  porProvincia: {} as Record<string, number>
};

// Calcular estadísticas por provincia
for (const codigo of Object.keys(CENTROIDES_MUNICIPIOS)) {
  const prov = codigo.substring(0, 2);
  ESTADISTICAS_INE.porProvincia[prov] = (ESTADISTICAS_INE.porProvincia[prov] || 0) + 1;
}

// ============================================================================
// EXPORTACIÓN PARA COMPATIBILIDAD
// ============================================================================

/**
 * Exportación compatible con el formato anterior de DATOS_INE_EMBEBIDOS
 * DEPRECATED: Usar las funciones específicas en su lugar
 */
export const DATOS_INE_DERIVADOS = {
  version: '2.0.0-derivado',
  fuente: 'Derivado de municipiosCentroides.ts (WFS DERA)',
  total: ESTADISTICAS_INE.totalMunicipios,
  provincias: PROVINCIAS_ANDALUCIA,
  municipios: NOMBRE_A_CODIGO_INE
};
