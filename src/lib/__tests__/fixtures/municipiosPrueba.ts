/**
 * PTEL Andalucía - Fixtures Centralizadas para Tests
 * 
 * Este archivo centraliza TODOS los datos de municipios usados en tests.
 * Los códigos INE se validan automáticamente contra el catálogo oficial
 * al cargar el módulo, previniendo errores por códigos incorrectos.
 * 
 * ⚠️ REGLA DE ORO: Nunca hardcodear códigos INE en tests individuales.
 *    Siempre usar estas constantes centralizadas.
 * 
 * @module fixtures/municipiosPrueba
 * @version 1.0.0
 * @date Diciembre 2025
 */

import { getCentroidePorINE, CENTROIDES_MUNICIPIOS } from '../../municipiosCentroides';
import { esCodigoINEValido, getMunicipioPorCodigo } from '../../codigosINEUnificado';

// ============================================================================
// TIPOS
// ============================================================================

export interface MunicipioTest {
  /** Código INE oficial de 5 dígitos */
  codigo: string;
  /** Nombre oficial del municipio */
  nombre: string;
  /** Provincia */
  provincia: string;
  /** Coordenadas UTM del centroide (EPSG:25830) */
  centroide: { x: number; y: number };
}

export interface CoordenadasTest {
  /** Coordenada X UTM */
  x: number;
  /** Coordenada Y UTM */
  y: number;
  /** Descripción del punto */
  descripcion: string;
}

export interface MunicipioTestCompleto extends MunicipioTest {
  /** Coordenadas de prueba dentro del municipio */
  coordenadas: CoordenadasTest[];
}

// ============================================================================
// FUNCIÓN DE VALIDACIÓN
// ============================================================================

/**
 * Valida que un municipio de prueba tenga un código INE correcto
 * @throws Error si el código INE no existe en el catálogo
 */
function validarMunicipioTest(municipio: Omit<MunicipioTest, 'centroide'>): MunicipioTest {
  const centroide = getCentroidePorINE(municipio.codigo);
  
  if (!centroide) {
    throw new Error(
      `[fixtures/municipiosPrueba] ❌ Código INE inválido: '${municipio.codigo}' ` +
      `para municipio '${municipio.nombre}'. ` +
      `Verificar en https://www.ine.es/daco/daco42/codmun/`
    );
  }
  
  // Verificar que el nombre coincide (aproximadamente)
  const nombreCatalogo = centroide.nombre.toLowerCase();
  const nombreTest = municipio.nombre.toLowerCase();
  
  if (!nombreCatalogo.includes(nombreTest) && !nombreTest.includes(nombreCatalogo)) {
    console.warn(
      `[fixtures/municipiosPrueba] ⚠️ Posible inconsistencia de nombre: ` +
      `código '${municipio.codigo}' → catálogo='${centroide.nombre}' vs test='${municipio.nombre}'`
    );
  }
  
  return {
    codigo: municipio.codigo,
    nombre: centroide.nombre, // Usar nombre del catálogo oficial
    provincia: centroide.provincia,
    centroide: { x: centroide.x, y: centroide.y }
  };
}

// ============================================================================
// MUNICIPIOS DE PRUEBA - GRANADA
// ============================================================================

/** Colomera (Granada) - Municipio principal de pruebas */
export const COLOMERA = validarMunicipioTest({
  codigo: '18051',
  nombre: 'Colomera',
  provincia: 'Granada'
});

/** Castril (Granada) - Municipio de pruebas en sierra */
export const CASTRIL = validarMunicipioTest({
  codigo: '18046',
  nombre: 'Castril',
  provincia: 'Granada'
});

/** Quéntar (Granada) - Municipio pequeño */
export const QUENTAR = validarMunicipioTest({
  codigo: '18168',
  nombre: 'Quéntar',
  provincia: 'Granada'
});

/** Granada capital */
export const GRANADA = validarMunicipioTest({
  codigo: '18087',
  nombre: 'Granada',
  provincia: 'Granada'
});

/** Hornos - para tests que requieren municipio de Jaén */
// Nota: Si Hornos es de Jaén, buscar el código correcto
// export const HORNOS = validarMunicipioTest({
//   codigo: '23044',
//   nombre: 'Hornos',
//   provincia: 'Jaén'
// });

// ============================================================================
// MUNICIPIOS DE PRUEBA - ALMERÍA
// ============================================================================

/** Berja (Almería) - Municipio de pruebas Alpujarra */
export const BERJA = validarMunicipioTest({
  codigo: '04029',
  nombre: 'Berja',
  provincia: 'Almería'
});

/** Almería capital */
export const ALMERIA = validarMunicipioTest({
  codigo: '04013',
  nombre: 'Almería',
  provincia: 'Almería'
});

// ============================================================================
// COORDENADAS DE PRUEBA POR MUNICIPIO
// ============================================================================

/**
 * Coordenadas reales extraídas de documentos PTEL de Colomera
 * Todas validadas como dentro del radio municipal
 */
export const COORDS_COLOMERA: CoordenadasTest[] = [
  { x: 436780.00, y: 4136578.20, descripcion: 'CEIP' },
  { x: 437301.80, y: 4136940.50, descripcion: 'Ayuntamiento' },
  { x: 436972.40, y: 4137231.90, descripcion: 'Centro Salud' },
];

/**
 * Coordenadas reales extraídas de documentos PTEL de Castril
 */
export const COORDS_CASTRIL: CoordenadasTest[] = [
  { x: 519444.37, y: 4183129.02, descripcion: 'Núcleo urbano' },
  { x: 521581.88, y: 4185653.05, descripcion: 'Ermita' },
  { x: 520000.00, y: 4184000.00, descripcion: 'Centro aproximado' },
];

/**
 * Coordenadas de prueba para Berja (estimadas del centroide)
 */
export const COORDS_BERJA: CoordenadasTest[] = [
  { x: 504750.00, y: 4077905.00, descripcion: 'Estimado centro' },
];

// ============================================================================
// MUNICIPIOS COMPLETOS (con coordenadas)
// ============================================================================

export const MUNICIPIOS_TEST: Record<string, MunicipioTestCompleto> = {
  COLOMERA: { ...COLOMERA, coordenadas: COORDS_COLOMERA },
  CASTRIL: { ...CASTRIL, coordenadas: COORDS_CASTRIL },
  BERJA: { ...BERJA, coordenadas: COORDS_BERJA },
  GRANADA: { ...GRANADA, coordenadas: [] },
  ALMERIA: { ...ALMERIA, coordenadas: [] },
};

// ============================================================================
// COORDENADAS INVÁLIDAS PARA TESTS NEGATIVOS
// ============================================================================

/** Coordenada muy lejana (fuera de cualquier municipio andaluz) */
export const COORD_MUY_LEJANA: CoordenadasTest = {
  x: 300000.00,
  y: 4500000.00,
  descripcion: 'Fuera de Andalucía (norte de España)'
};

/** Coordenada con valores incorrectos */
export const COORD_INVALIDA: CoordenadasTest = {
  x: 0,
  y: 0,
  descripcion: 'Coordenadas nulas'
};

/** Coordenada en el mar (fuera de tierra) */
export const COORD_EN_MAR: CoordenadasTest = {
  x: 600000.00,
  y: 4050000.00,
  descripcion: 'En el Mar Mediterráneo'
};

// ============================================================================
// HELPERS PARA TESTS
// ============================================================================

/**
 * Obtiene un código INE aleatorio válido para tests de carga
 */
export function getCodigoINEAleatorio(): string {
  const codigos = Object.keys(CENTROIDES_MUNICIPIOS);
  return codigos[Math.floor(Math.random() * codigos.length)];
}

/**
 * Obtiene N municipios aleatorios para tests de volumen
 */
export function getMunicipiosAleatorios(n: number): MunicipioTest[] {
  const codigos = Object.keys(CENTROIDES_MUNICIPIOS);
  const seleccionados = new Set<string>();
  
  while (seleccionados.size < Math.min(n, codigos.length)) {
    seleccionados.add(codigos[Math.floor(Math.random() * codigos.length)]);
  }
  
  return Array.from(seleccionados).map(codigo => {
    const centroide = getCentroidePorINE(codigo)!;
    return {
      codigo,
      nombre: centroide.nombre,
      provincia: centroide.provincia,
      centroide: { x: centroide.x, y: centroide.y }
    };
  });
}

// ============================================================================
// VALIDACIÓN AL CARGAR EL MÓDULO
// ============================================================================

// Esta validación se ejecuta al importar el módulo
// Si algún código INE es incorrecto, el test fallará inmediatamente
console.log(
  `[fixtures/municipiosPrueba] ✅ Cargados ${Object.keys(MUNICIPIOS_TEST).length} municipios de prueba validados`
);
