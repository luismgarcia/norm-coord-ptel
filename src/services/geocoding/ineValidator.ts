/**
 * @fileoverview Validación de geocodificación por código INE
 * @description Previene errores de desambiguación municipal validando
 *              que los resultados de CartoCiudad corresponden al municipio esperado
 * 
 * @author Proyecto PTEL - Normalizador de Coordenadas
 * @version 1.0.0
 * @date 2025-11-28
 */

import { getCodigoINE } from '../../data/codigosINE';
import { logRechazo } from './rejectionLogger';

// ============================================================================
// TIPOS
// ============================================================================

export interface CartoCiudadResponse {
  muni?: string;
  muniCode?: string;
  province?: string;
  lat?: number;
  lng?: number;
  state?: number;
  type?: string;
  address?: string;
}

export interface ValidationResult {
  valido: boolean;
  error?: string;
  codigoError?: 'fuera_andalucia' | 'provincia_incorrecta' | 'municipio_incorrecto' | 'sin_codigo_ine';
  detalles?: {
    codigoINEObtenido?: string;
    codigoINEEsperado?: string;
    municipioObtenido?: string;
    municipioEsperado?: string;
    provinciaObtenida?: string;
    provinciaEsperada?: string;
  };
}

// ============================================================================
// CONSTANTES
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

export const CODIGOS_PROVINCIA_ANDALUCIA = Object.keys(PROVINCIAS_ANDALUCIA);

// ============================================================================
// FUNCIONES DE UTILIDAD
// ============================================================================

export function normalizarTexto(texto: string): string {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function extraerCodigoProvincia(codigoINE: string | undefined): string | null {
  if (!codigoINE || codigoINE.length < 2) return null;
  return codigoINE.substring(0, 2);
}

export function esAndalucia(codigoINE: string | undefined): boolean {
  const codigoProvincia = extraerCodigoProvincia(codigoINE);
  return codigoProvincia !== null && CODIGOS_PROVINCIA_ANDALUCIA.includes(codigoProvincia);
}

export function getProvinciaDesdeINE(codigoINE: string | undefined): string | null {
  const codigoProvincia = extraerCodigoProvincia(codigoINE);
  if (!codigoProvincia) return null;
  return PROVINCIAS_ANDALUCIA[codigoProvincia] || null;
}

// ============================================================================
// FUNCIÓN PRINCIPAL DE VALIDACIÓN
// ============================================================================

export function validarResultadoCartoCiudad(
  response: CartoCiudadResponse,
  municipioEsperado: string,
  provinciaEsperada: string,
  codigoINEEsperado?: string,
  logearRechazos: boolean = true
): ValidationResult {
  
  const muniCode = response.muniCode;
  const municipioObtenido = response.muni || '';
  const provinciaObtenida = response.province || '';
  
  // 1. Verificar presencia de código INE
  if (!muniCode) {
    const result: ValidationResult = {
      valido: false,
      error: 'Respuesta sin código INE (campo muniCode)',
      codigoError: 'sin_codigo_ine',
      detalles: { municipioObtenido, municipioEsperado, provinciaObtenida, provinciaEsperada }
    };
    
    if (logearRechazos) {
      logRechazo({
        query: municipioEsperado,
        municipioEsperado,
        municipioObtenido,
        codigoINEEsperado: codigoINEEsperado || 'desconocido',
        codigoINEObtenido: 'N/A',
        motivo: 'sin_codigo_ine'
      });
    }
    
    return result;
  }
  
  // 2. Verificar que está en Andalucía
  if (!esAndalucia(muniCode)) {
    const result: ValidationResult = {
      valido: false,
      error: `Resultado fuera de Andalucía: ${municipioObtenido} (${provinciaObtenida})`,
      codigoError: 'fuera_andalucia',
      detalles: {
        codigoINEObtenido: muniCode,
        codigoINEEsperado,
        municipioObtenido,
        municipioEsperado,
        provinciaObtenida,
        provinciaEsperada
      }
    };
    
    if (logearRechazos) {
      logRechazo({
        query: municipioEsperado,
        municipioEsperado,
        municipioObtenido,
        codigoINEEsperado: codigoINEEsperado || 'desconocido',
        codigoINEObtenido: muniCode,
        motivo: 'fuera_andalucia'
      });
    }
    
    return result;
  }
  
  // 3. Verificar código de provincia
  const codigoProvinciaObtenido = extraerCodigoProvincia(muniCode);
  const codigoProvinciaEsperado = codigoINEEsperado 
    ? extraerCodigoProvincia(codigoINEEsperado)
    : obtenerCodigoProvinciaPorNombre(provinciaEsperada);
  
  if (codigoProvinciaEsperado && codigoProvinciaObtenido !== codigoProvinciaEsperado) {
    const result: ValidationResult = {
      valido: false,
      error: `Provincia incorrecta: obtenida ${getProvinciaDesdeINE(muniCode)} (${codigoProvinciaObtenido}), esperada ${provinciaEsperada} (${codigoProvinciaEsperado})`,
      codigoError: 'provincia_incorrecta',
      detalles: {
        codigoINEObtenido: muniCode,
        codigoINEEsperado,
        municipioObtenido,
        municipioEsperado,
        provinciaObtenida: getProvinciaDesdeINE(muniCode) || provinciaObtenida,
        provinciaEsperada
      }
    };
    
    if (logearRechazos) {
      logRechazo({
        query: municipioEsperado,
        municipioEsperado,
        municipioObtenido,
        codigoINEEsperado: codigoINEEsperado || 'desconocido',
        codigoINEObtenido: muniCode,
        motivo: 'provincia_incorrecta'
      });
    }
    
    return result;
  }
  
  // 4. Verificar código INE específico
  if (codigoINEEsperado && muniCode !== codigoINEEsperado) {
    const result: ValidationResult = {
      valido: false,
      error: `Código INE incorrecto: obtenido ${muniCode} (${municipioObtenido}), esperado ${codigoINEEsperado} (${municipioEsperado})`,
      codigoError: 'municipio_incorrecto',
      detalles: {
        codigoINEObtenido: muniCode,
        codigoINEEsperado,
        municipioObtenido,
        municipioEsperado,
        provinciaObtenida,
        provinciaEsperada
      }
    };
    
    if (logearRechazos) {
      logRechazo({
        query: municipioEsperado,
        municipioEsperado,
        municipioObtenido,
        codigoINEEsperado,
        codigoINEObtenido: muniCode,
        motivo: 'municipio_incorrecto'
      });
    }
    
    return result;
  }
  
  // 5. Validación exitosa
  return { valido: true };
}

function obtenerCodigoProvinciaPorNombre(nombreProvincia: string): string | null {
  const nombreNorm = normalizarTexto(nombreProvincia);
  
  for (const [codigo, nombre] of Object.entries(PROVINCIAS_ANDALUCIA)) {
    if (normalizarTexto(nombre) === nombreNorm) {
      return codigo;
    }
  }
  
  return null;
}

// ============================================================================
// FUNCIONES ADICIONALES
// ============================================================================

export async function validarCoordenadasConReverse(
  lat: number,
  lng: number,
  municipioEsperado: string
): Promise<ValidationResult> {
  try {
    const url = `https://www.cartociudad.es/geocoder/api/geocoder/reverseGeocode?lat=${lat}&lon=${lng}`;
    
    const response = await fetch(url);
    let text = await response.text();
    
    if (text.startsWith('callback(')) {
      text = text.slice(9, -1);
    }
    
    const data = JSON.parse(text);
    const municipioReal = normalizarTexto(data.muni || '');
    const esperadoNorm = normalizarTexto(municipioEsperado);
    
    const coincide = municipioReal.includes(esperadoNorm) || 
                     esperadoNorm.includes(municipioReal);
    
    if (coincide) {
      return { valido: true };
    } else {
      return {
        valido: false,
        error: `Reverse geocoding: coordenadas en ${data.muni}, esperado ${municipioEsperado}`,
        codigoError: 'municipio_incorrecto',
        detalles: { municipioObtenido: data.muni, municipioEsperado }
      };
    }
    
  } catch (error) {
    console.warn('[INE] Error en reverse geocoding:', error);
    return { valido: true };
  }
}

export function validarBatchResultados<T extends CartoCiudadResponse>(
  resultados: T[],
  municipio: string,
  provincia: string,
  codigoINE?: string
): T[] {
  return resultados.filter(resultado => {
    const validacion = validarResultadoCartoCiudad(resultado, municipio, provincia, codigoINE, true);
    return validacion.valido;
  });
}

export default {
  validarResultadoCartoCiudad,
  validarCoordenadasConReverse,
  validarBatchResultados,
  esAndalucia,
  getProvinciaDesdeINE,
  extraerCodigoProvincia,
  normalizarTexto,
  PROVINCIAS_ANDALUCIA,
  CODIGOS_PROVINCIA_ANDALUCIA
};
