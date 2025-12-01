/**
 * PTEL Andalucía - Validador en Cascada v1.0
 * 
 * Sistema de validación de coordenadas en 5 niveles con escalada progresiva:
 * 
 * NIVEL 1: Bounding Box (< 0.1ms)
 *          Índice espacial filtra candidatos
 * 
 * NIVEL 2: Point-in-Polygon preciso (< 1ms)
 *          Winding number sobre municipio declarado
 * 
 * NIVEL 3: Tolerancia geométrica (< 10ms)
 *          Distancia al borde con margen 50-100m
 * 
 * NIVEL 4: Verificación colindantes (< 20ms)
 *          PIP en municipios adyacentes
 * 
 * NIVEL 5: Validación remota (< 5s)
 *          CartoCiudad como oráculo final
 * 
 * @version 1.0.0
 * @date Diciembre 2025
 */

import {
  validarPuntoEnMunicipio,
  inicializarValidadorGeometrico,
  obtenerColindantes,
  estaInicializado as geoInicializado,
  obtenerEstadisticas as geoEstadisticas,
  type ResultadoValidacionGeometrica,
  type ToleranciaConfig,
} from './geometryValidator';

import {
  validarPertenenciaMunicipal,
  validarReverseGeocoding,
  validarDistanciaCentroide,
  haversineDistance,
  utmToWgs84Approx,
  type ResultadoPertenenciaMunicipal,
  type ResultadoReverseGeocoding,
  type ResultadoDistanciaCentroide,
} from './CoordinateValidator';

import { CENTROIDES_MUNICIPIOS, getCentroidePorINE } from './municipiosCentroides';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export type NivelCascada = 1 | 2 | 3 | 4 | 5;

export type EstadoNivel = 
  | 'EXITOSO'       // Validación positiva en este nivel
  | 'FALLIDO'       // Validación negativa, escalar al siguiente
  | 'OMITIDO'       // Nivel saltado por configuración
  | 'ERROR'         // Error técnico
  | 'TIMEOUT';      // Tiempo excedido

export interface ResultadoNivel {
  nivel: NivelCascada;
  nombre: string;
  estado: EstadoNivel;
  tiempoMs: number;
  detalles: string;
  confianza: number;  // 0-1
  datos?: Record<string, unknown>;
}

export interface ResultadoCascada {
  // Coordenadas validadas
  utmX: number;
  utmY: number;
  
  // Municipio esperado vs encontrado
  municipioDeclarado: string;
  codigoINEDeclarado: string;
  municipioEncontrado: string | null;
  codigoINEEncontrado: string | null;
  
  // Resultado de la validación
  esValido: boolean;
  nivelFinal: NivelCascada;
  confianzaFinal: number;        // 0-100
  clasificacion: ClasificacionValidacion;
  
  // Detalles de cada nivel
  niveles: ResultadoNivel[];
  
  // Flags especiales
  nearBoundary: boolean;         // Cerca del borde municipal
  enColindante: boolean;         // Encontrado en municipio colindante
  requiereRevision: boolean;     // Necesita revisión manual
  
  // Metadata
  tiempoTotalMs: number;
  modoOffline: boolean;
  timestamp: string;
  
  // Warnings y recomendaciones
  warnings: string[];
  recomendaciones: string[];
}

export type ClasificacionValidacion =
  | 'CONFIRMADA'      // 95-100% - Todas las validaciones OK
  | 'ALTA'            // 85-94% - Mayoría OK, pequeñas discrepancias
  | 'MEDIA'           // 65-84% - Validación parcial, revisar
  | 'BAJA'            // 40-64% - Problemas significativos
  | 'MUY_BAJA'        // 20-39% - Casi seguro incorrecta
  | 'INVALIDA';       // 0-19% - Definitivamente incorrecta

export interface ConfiguracionCascada {
  // Tolerancia de bordes (metros)
  toleranciaMetros: number;
  
  // Niveles a ejecutar
  ejecutarNivel1_BBox: boolean;
  ejecutarNivel2_PIP: boolean;
  ejecutarNivel3_Tolerancia: boolean;
  ejecutarNivel4_Colindantes: boolean;
  ejecutarNivel5_Remoto: boolean;
  
  // Timeouts
  timeoutRemotoMs: number;
  
  // Comportamiento
  pararEnExito: boolean;         // Detener cascada al primer éxito
  verificarColindantes: boolean;
  usarCache: boolean;
  
  // Umbrales de confianza
  umbralExitoNivel2: number;     // Confianza mínima para N2
  umbralExitoNivel3: number;     // Confianza mínima para N3
}

// ============================================================================
// CONFIGURACIÓN POR DEFECTO
// ============================================================================

export const CONFIG_DEFAULT: ConfiguracionCascada = {
  toleranciaMetros: 75,
  
  ejecutarNivel1_BBox: true,
  ejecutarNivel2_PIP: true,
  ejecutarNivel3_Tolerancia: true,
  ejecutarNivel4_Colindantes: true,
  ejecutarNivel5_Remoto: true,
  
  timeoutRemotoMs: 5000,
  
  pararEnExito: true,
  verificarColindantes: true,
  usarCache: true,
  
  umbralExitoNivel2: 0.95,
  umbralExitoNivel3: 0.75,
};

// Configuración para modo rápido (sin llamadas remotas)
export const CONFIG_RAPIDO: ConfiguracionCascada = {
  ...CONFIG_DEFAULT,
  ejecutarNivel5_Remoto: false,
  pararEnExito: true,
};

// Configuración para modo exhaustivo
export const CONFIG_EXHAUSTIVO: ConfiguracionCascada = {
  ...CONFIG_DEFAULT,
  pararEnExito: false,
  ejecutarNivel5_Remoto: true,
};

// ============================================================================
// CACHE DE VALIDACIONES
// ============================================================================

interface CacheEntry {
  resultado: ResultadoCascada;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hora

function getCacheKey(utmX: number, utmY: number, codigoINE: string): string {
  return `${utmX.toFixed(2)}_${utmY.toFixed(2)}_${codigoINE}`;
}

function getFromCache(key: string): ResultadoCascada | null {
  const entry = cache.get(key);
  if (!entry) return null;
  
  if (Date.now() > entry.timestamp + entry.ttl) {
    cache.delete(key);
    return null;
  }
  
  return entry.resultado;
}

function setToCache(key: string, resultado: ResultadoCascada): void {
  cache.set(key, {
    resultado,
    timestamp: Date.now(),
    ttl: CACHE_TTL,
  });
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

function clasificarConfianza(confianza: number): ClasificacionValidacion {
  if (confianza >= 95) return 'CONFIRMADA';
  if (confianza >= 85) return 'ALTA';
  if (confianza >= 65) return 'MEDIA';
  if (confianza >= 40) return 'BAJA';
  if (confianza >= 20) return 'MUY_BAJA';
  return 'INVALIDA';
}

function crearResultadoNivel(
  nivel: NivelCascada,
  nombre: string,
  estado: EstadoNivel,
  tiempoMs: number,
  detalles: string,
  confianza: number,
  datos?: Record<string, unknown>
): ResultadoNivel {
  return { nivel, nombre, estado, tiempoMs, detalles, confianza, datos };
}

// ============================================================================
// NIVEL 1: BOUNDING BOX
// ============================================================================

async function ejecutarNivel1_BBox(
  utmX: number,
  utmY: number,
  codigoINE: string,
  config: ConfiguracionCascada
): Promise<ResultadoNivel> {
  const inicio = performance.now();
  
  if (!config.ejecutarNivel1_BBox) {
    return crearResultadoNivel(1, 'BBox', 'OMITIDO', 0, 'Nivel deshabilitado', 0);
  }
  
  // Verificar si las coordenadas están en el rango de Andalucía
  // UTM30N Andalucía: X ~100000-600000, Y ~3950000-4350000
  const enRangoAndalucia = 
    utmX >= 100000 && utmX <= 650000 &&
    utmY >= 3950000 && utmY <= 4350000;
  
  if (!enRangoAndalucia) {
    return crearResultadoNivel(
      1, 'BBox', 'FALLIDO',
      performance.now() - inicio,
      'Coordenadas fuera del rango de Andalucía',
      0,
      { utmX, utmY, rango: 'fuera' }
    );
  }
  
  // Verificar si el municipio declarado existe
  const centroide = getCentroidePorINE(codigoINE);
  if (!centroide) {
    return crearResultadoNivel(
      1, 'BBox', 'FALLIDO',
      performance.now() - inicio,
      `Código INE ${codigoINE} no encontrado en Andalucía`,
      0,
      { codigoINE, existe: false }
    );
  }
  
  // Verificar distancia aproximada al centroide
  const distanciaCentroide = Math.sqrt(
    Math.pow(utmX - centroide.x, 2) + Math.pow(utmY - centroide.y, 2)
  ) / 1000; // km
  
  // Umbral muy permisivo: 50km (ningún municipio andaluz tiene ese radio)
  if (distanciaCentroide > 50) {
    return crearResultadoNivel(
      1, 'BBox', 'FALLIDO',
      performance.now() - inicio,
      `Punto a ${distanciaCentroide.toFixed(1)}km del centroide (máx 50km)`,
      0,
      { distanciaCentroide, municipio: centroide.nombre }
    );
  }
  
  return crearResultadoNivel(
    1, 'BBox', 'EXITOSO',
    performance.now() - inicio,
    `Punto en rango, a ${distanciaCentroide.toFixed(1)}km del centroide`,
    0.3, // Confianza baja, solo pasa filtro inicial
    { distanciaCentroide, municipio: centroide.nombre }
  );
}

// ============================================================================
// NIVEL 2: POINT-IN-POLYGON
// ============================================================================

async function ejecutarNivel2_PIP(
  utmX: number,
  utmY: number,
  codigoINE: string,
  config: ConfiguracionCascada
): Promise<ResultadoNivel> {
  const inicio = performance.now();
  
  if (!config.ejecutarNivel2_PIP) {
    return crearResultadoNivel(2, 'PIP', 'OMITIDO', 0, 'Nivel deshabilitado', 0);
  }
  
  try {
    // Inicializar validador geométrico si es necesario
    await inicializarValidadorGeometrico();
    
    const resultado = await validarPuntoEnMunicipio(utmX, utmY, codigoINE, {
      metrosTolerancia: 0, // Sin tolerancia en N2
      verificarColindantes: false,
    });
    
    if (resultado.resultado.dentroMunicipio && resultado.resultado.confianza >= config.umbralExitoNivel2) {
      return crearResultadoNivel(
        2, 'PIP', 'EXITOSO',
        performance.now() - inicio,
        `Punto dentro de ${resultado.resultado.municipio}`,
        resultado.resultado.confianza,
        {
          municipio: resultado.resultado.municipio,
          distanciaAlBorde: resultado.resultado.distanciaAlBorde,
        }
      );
    }
    
    return crearResultadoNivel(
      2, 'PIP', 'FALLIDO',
      performance.now() - inicio,
      resultado.resultado.distanciaAlBorde !== Infinity 
        ? `Fuera del polígono, a ${Math.abs(resultado.resultado.distanciaAlBorde).toFixed(0)}m del borde`
        : 'Fuera del polígono municipal',
      resultado.resultado.confianza,
      {
        distanciaAlBorde: resultado.resultado.distanciaAlBorde,
        candidatos: resultado.candidatos,
      }
    );
    
  } catch (error) {
    return crearResultadoNivel(
      2, 'PIP', 'ERROR',
      performance.now() - inicio,
      `Error en validación PIP: ${error instanceof Error ? error.message : 'desconocido'}`,
      0
    );
  }
}

// ============================================================================
// NIVEL 3: TOLERANCIA GEOMÉTRICA
// ============================================================================

async function ejecutarNivel3_Tolerancia(
  utmX: number,
  utmY: number,
  codigoINE: string,
  config: ConfiguracionCascada
): Promise<ResultadoNivel> {
  const inicio = performance.now();
  
  if (!config.ejecutarNivel3_Tolerancia) {
    return crearResultadoNivel(3, 'Tolerancia', 'OMITIDO', 0, 'Nivel deshabilitado', 0);
  }
  
  try {
    const resultado = await validarPuntoEnMunicipio(utmX, utmY, codigoINE, {
      metrosTolerancia: config.toleranciaMetros,
      verificarColindantes: false,
    });
    
    const dentroConTolerancia = 
      resultado.resultado.dentroMunicipio ||
      (resultado.resultado.distanciaAlBorde <= config.toleranciaMetros && 
       resultado.resultado.distanciaAlBorde > 0);
    
    if (dentroConTolerancia && resultado.resultado.confianza >= config.umbralExitoNivel3) {
      return crearResultadoNivel(
        3, 'Tolerancia', 'EXITOSO',
        performance.now() - inicio,
        resultado.resultado.nearBoundary
          ? `Punto cerca del borde (${Math.abs(resultado.resultado.distanciaAlBorde).toFixed(0)}m), aceptado con tolerancia`
          : `Punto dentro de ${resultado.resultado.municipio}`,
        resultado.resultado.confianza,
        {
          nearBoundary: resultado.resultado.nearBoundary,
          distanciaAlBorde: resultado.resultado.distanciaAlBorde,
          toleranciaUsada: config.toleranciaMetros,
        }
      );
    }
    
    return crearResultadoNivel(
      3, 'Tolerancia', 'FALLIDO',
      performance.now() - inicio,
      `Punto fuera de tolerancia (${config.toleranciaMetros}m), a ${Math.abs(resultado.resultado.distanciaAlBorde).toFixed(0)}m del borde`,
      resultado.resultado.confianza,
      {
        distanciaAlBorde: resultado.resultado.distanciaAlBorde,
        toleranciaUsada: config.toleranciaMetros,
      }
    );
    
  } catch (error) {
    return crearResultadoNivel(
      3, 'Tolerancia', 'ERROR',
      performance.now() - inicio,
      `Error en validación con tolerancia: ${error instanceof Error ? error.message : 'desconocido'}`,
      0
    );
  }
}

// ============================================================================
// NIVEL 4: VERIFICACIÓN COLINDANTES
// ============================================================================

async function ejecutarNivel4_Colindantes(
  utmX: number,
  utmY: number,
  codigoINE: string,
  config: ConfiguracionCascada
): Promise<ResultadoNivel> {
  const inicio = performance.now();
  
  if (!config.ejecutarNivel4_Colindantes || !config.verificarColindantes) {
    return crearResultadoNivel(4, 'Colindantes', 'OMITIDO', 0, 'Nivel deshabilitado', 0);
  }
  
  try {
    const resultado = await validarPuntoEnMunicipio(utmX, utmY, codigoINE, {
      metrosTolerancia: config.toleranciaMetros,
      verificarColindantes: true,
    });
    
    if (resultado.validacionColindante?.dentroMunicipio) {
      // El punto está en un municipio colindante
      const colindante = resultado.validacionColindante;
      return crearResultadoNivel(
        4, 'Colindantes', 'EXITOSO',
        performance.now() - inicio,
        `Punto encontrado en municipio colindante: ${colindante.municipio}`,
        colindante.confianza * 0.85, // Reducir confianza porque no es el declarado
        {
          municipioColindante: colindante.municipio,
          codigoINEColindante: colindante.codigoINE,
          municipioDeclarado: CENTROIDES_MUNICIPIOS[codigoINE]?.nombre,
          colindantesVerificados: resultado.colindantes,
        }
      );
    }
    
    return crearResultadoNivel(
      4, 'Colindantes', 'FALLIDO',
      performance.now() - inicio,
      `No encontrado en municipios colindantes (${resultado.colindantes.length} verificados)`,
      0.1,
      {
        colindantesVerificados: resultado.colindantes.length,
        colindantes: resultado.colindantes.slice(0, 5), // Primeros 5
      }
    );
    
  } catch (error) {
    return crearResultadoNivel(
      4, 'Colindantes', 'ERROR',
      performance.now() - inicio,
      `Error verificando colindantes: ${error instanceof Error ? error.message : 'desconocido'}`,
      0
    );
  }
}

// ============================================================================
// NIVEL 5: VALIDACIÓN REMOTA (CartoCiudad)
// ============================================================================

async function ejecutarNivel5_Remoto(
  utmX: number,
  utmY: number,
  codigoINE: string,
  municipio: string,
  config: ConfiguracionCascada
): Promise<ResultadoNivel> {
  const inicio = performance.now();
  
  if (!config.ejecutarNivel5_Remoto) {
    return crearResultadoNivel(5, 'Remoto', 'OMITIDO', 0, 'Nivel deshabilitado', 0);
  }
  
  // Verificar conectividad
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return crearResultadoNivel(
      5, 'Remoto', 'OMITIDO',
      performance.now() - inicio,
      'Sin conexión a Internet',
      0,
      { offline: true }
    );
  }
  
  try {
    // Crear promesa con timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), config.timeoutRemotoMs);
    });
    
    const reversePromise = validarReverseGeocoding(utmX, utmY, municipio);
    
    const resultado = await Promise.race([reversePromise, timeoutPromise]);
    
    if (resultado.exito && resultado.municipioCoincide) {
      return crearResultadoNivel(
        5, 'Remoto', 'EXITOSO',
        performance.now() - inicio,
        `CartoCiudad confirma: ${resultado.municipioDevuelto}`,
        0.95,
        {
          municipioDevuelto: resultado.municipioDevuelto,
          provinciaDevuelta: resultado.provinciaDevuelta,
          direccion: resultado.direccionCompleta,
        }
      );
    }
    
    if (resultado.exito && !resultado.municipioCoincide) {
      return crearResultadoNivel(
        5, 'Remoto', 'FALLIDO',
        performance.now() - inicio,
        `CartoCiudad indica ${resultado.municipioDevuelto}, no ${municipio}`,
        0.2,
        {
          municipioDevuelto: resultado.municipioDevuelto,
          municipioEsperado: municipio,
          discrepancia: true,
        }
      );
    }
    
    return crearResultadoNivel(
      5, 'Remoto', 'ERROR',
      performance.now() - inicio,
      resultado.error || 'Error en reverse geocoding',
      0,
      { error: resultado.error }
    );
    
  } catch (error) {
    const mensaje = error instanceof Error && error.message === 'Timeout'
      ? `Timeout tras ${config.timeoutRemotoMs}ms`
      : `Error: ${error instanceof Error ? error.message : 'desconocido'}`;
    
    return crearResultadoNivel(
      5, 'Remoto', error instanceof Error && error.message === 'Timeout' ? 'TIMEOUT' : 'ERROR',
      performance.now() - inicio,
      mensaje,
      0
    );
  }
}

// ============================================================================
// FUNCIÓN PRINCIPAL: VALIDACIÓN EN CASCADA
// ============================================================================

/**
 * Ejecuta la validación en cascada de 5 niveles
 */
export async function validarEnCascada(
  utmX: number,
  utmY: number,
  municipio: string,
  codigoINE: string,
  config: ConfiguracionCascada = CONFIG_DEFAULT
): Promise<ResultadoCascada> {
  const inicio = performance.now();
  const niveles: ResultadoNivel[] = [];
  const warnings: string[] = [];
  const recomendaciones: string[] = [];
  
  // Verificar cache
  if (config.usarCache) {
    const cacheKey = getCacheKey(utmX, utmY, codigoINE);
    const cached = getFromCache(cacheKey);
    if (cached) {
      return { ...cached, timestamp: new Date().toISOString() };
    }
  }
  
  // Variables de resultado
  let esValido = false;
  let nivelFinal: NivelCascada = 1;
  let confianzaFinal = 0;
  let municipioEncontrado: string | null = null;
  let codigoINEEncontrado: string | null = null;
  let nearBoundary = false;
  let enColindante = false;
  
  // ========== NIVEL 1: BBox ==========
  const n1 = await ejecutarNivel1_BBox(utmX, utmY, codigoINE, config);
  niveles.push(n1);
  
  if (n1.estado === 'FALLIDO') {
    // Punto fuera de Andalucía o INE inválido
    warnings.push(n1.detalles);
    recomendaciones.push('Verificar coordenadas o código municipal');
    
    return finalizarResultado();
  }
  
  // ========== NIVEL 2: PIP ==========
  const n2 = await ejecutarNivel2_PIP(utmX, utmY, codigoINE, config);
  niveles.push(n2);
  
  if (n2.estado === 'EXITOSO') {
    esValido = true;
    nivelFinal = 2;
    confianzaFinal = n2.confianza * 100;
    municipioEncontrado = n2.datos?.municipio as string || municipio;
    codigoINEEncontrado = codigoINE;
    
    if (config.pararEnExito) return finalizarResultado();
  }
  
  // ========== NIVEL 3: Tolerancia ==========
  if (!esValido || !config.pararEnExito) {
    const n3 = await ejecutarNivel3_Tolerancia(utmX, utmY, codigoINE, config);
    niveles.push(n3);
    
    if (n3.estado === 'EXITOSO') {
      esValido = true;
      nivelFinal = 3;
      confianzaFinal = Math.max(confianzaFinal, n3.confianza * 100);
      municipioEncontrado = municipio;
      codigoINEEncontrado = codigoINE;
      nearBoundary = n3.datos?.nearBoundary as boolean || false;
      
      if (nearBoundary) {
        warnings.push('Punto cerca del límite municipal');
        recomendaciones.push('Considerar verificación manual por proximidad al borde');
      }
      
      if (config.pararEnExito) return finalizarResultado();
    }
  }
  
  // ========== NIVEL 4: Colindantes ==========
  if (!esValido || !config.pararEnExito) {
    const n4 = await ejecutarNivel4_Colindantes(utmX, utmY, codigoINE, config);
    niveles.push(n4);
    
    if (n4.estado === 'EXITOSO') {
      esValido = true;
      nivelFinal = 4;
      confianzaFinal = Math.max(confianzaFinal, n4.confianza * 100);
      municipioEncontrado = n4.datos?.municipioColindante as string;
      codigoINEEncontrado = n4.datos?.codigoINEColindante as string;
      enColindante = true;
      nearBoundary = true;
      
      warnings.push(`Punto en municipio colindante: ${municipioEncontrado} (declarado: ${municipio})`);
      recomendaciones.push('Verificar si la infraestructura está correctamente asignada');
      
      if (config.pararEnExito) return finalizarResultado();
    }
  }
  
  // ========== NIVEL 5: Remoto ==========
  if (!esValido || !config.pararEnExito) {
    const n5 = await ejecutarNivel5_Remoto(utmX, utmY, codigoINE, municipio, config);
    niveles.push(n5);
    
    if (n5.estado === 'EXITOSO') {
      esValido = true;
      nivelFinal = 5;
      confianzaFinal = Math.max(confianzaFinal, n5.confianza * 100);
      municipioEncontrado = n5.datos?.municipioDevuelto as string || municipio;
      codigoINEEncontrado = codigoINE;
    } else if (n5.estado === 'FALLIDO' && n5.datos?.discrepancia) {
      warnings.push(`Discrepancia: CartoCiudad indica ${n5.datos?.municipioDevuelto}`);
      recomendaciones.push('Revisar asignación municipal de la infraestructura');
    }
  }
  
  return finalizarResultado();
  
  // ========== Función auxiliar para construir resultado ==========
  function finalizarResultado(): ResultadoCascada {
    // Calcular confianza final si no se estableció
    if (confianzaFinal === 0 && esValido) {
      const ultimoExitoso = niveles.filter(n => n.estado === 'EXITOSO').pop();
      confianzaFinal = ultimoExitoso ? ultimoExitoso.confianza * 100 : 0;
    }
    
    // Añadir recomendaciones según clasificación
    const clasificacion = clasificarConfianza(confianzaFinal);
    
    if (clasificacion === 'MEDIA' || clasificacion === 'BAJA') {
      recomendaciones.push('Requiere revisión manual antes de usar en emergencias');
    } else if (clasificacion === 'MUY_BAJA' || clasificacion === 'INVALIDA') {
      recomendaciones.push('NO USAR para emergencias sin corrección previa');
    }
    
    const resultado: ResultadoCascada = {
      utmX,
      utmY,
      municipioDeclarado: municipio,
      codigoINEDeclarado: codigoINE,
      municipioEncontrado,
      codigoINEEncontrado,
      esValido,
      nivelFinal,
      confianzaFinal: Math.round(confianzaFinal),
      clasificacion,
      niveles,
      nearBoundary,
      enColindante,
      requiereRevision: nearBoundary || enColindante || clasificacion === 'MEDIA',
      tiempoTotalMs: Math.round(performance.now() - inicio),
      modoOffline: typeof navigator !== 'undefined' && !navigator.onLine,
      timestamp: new Date().toISOString(),
      warnings,
      recomendaciones,
    };
    
    // Guardar en cache
    if (config.usarCache) {
      setToCache(getCacheKey(utmX, utmY, codigoINE), resultado);
    }
    
    return resultado;
  }
}

// ============================================================================
// FUNCIONES DE UTILIDAD
// ============================================================================

/**
 * Limpia la cache de validaciones
 */
export function limpiarCache(): void {
  cache.clear();
}

/**
 * Obtiene estadísticas de la cache
 */
export function obtenerEstadisticasCache(): {
  entradas: number;
  antigüedadPromedio: number;
} {
  let totalEdad = 0;
  const ahora = Date.now();
  
  for (const entry of cache.values()) {
    totalEdad += ahora - entry.timestamp;
  }
  
  return {
    entradas: cache.size,
    antigüedadPromedio: cache.size > 0 ? Math.round(totalEdad / cache.size / 1000) : 0,
  };
}

/**
 * Valida un batch de coordenadas con rate limiting
 */
export async function validarBatchEnCascada(
  coordenadas: Array<{
    id: string;
    utmX: number;
    utmY: number;
    municipio: string;
    codigoINE: string;
  }>,
  config: ConfiguracionCascada = CONFIG_RAPIDO,
  delayMs: number = 100,
  onProgress?: (current: number, total: number, resultado: ResultadoCascada) => void
): Promise<Map<string, ResultadoCascada>> {
  const resultados = new Map<string, ResultadoCascada>();
  
  for (let i = 0; i < coordenadas.length; i++) {
    const coord = coordenadas[i];
    
    const resultado = await validarEnCascada(
      coord.utmX,
      coord.utmY,
      coord.municipio,
      coord.codigoINE,
      config
    );
    
    resultados.set(coord.id, resultado);
    
    if (onProgress) {
      onProgress(i + 1, coordenadas.length, resultado);
    }
    
    // Rate limiting para servicios remotos
    if (i < coordenadas.length - 1 && delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return resultados;
}

// ============================================================================
// EXPORTACIÓN
// ============================================================================

export default {
  validarEnCascada,
  validarBatchEnCascada,
  limpiarCache,
  obtenerEstadisticasCache,
  CONFIG_DEFAULT,
  CONFIG_RAPIDO,
  CONFIG_EXHAUSTIVO,
};
