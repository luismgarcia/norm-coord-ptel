/**
 * PTEL Andalucía - Detector Automático de Municipio v1.0
 * 
 * Detecta el municipio de un documento PTEL desde múltiples fuentes:
 * 1. Nombre del archivo (PTEL_MUNICIPIO_AÑO.odt)
 * 2. Cabecera/metadatos del documento
 * 3. Contenido textual (frecuencia de aparición)
 * 
 * @version 1.0.0
 * @date Diciembre 2025
 */

import { CENTROIDES_MUNICIPIOS } from './municipiosCentroides';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface DeteccionMunicipio {
  municipio: string;
  codigoINE: string;
  provincia: string;
  confianza: 'ALTA' | 'MEDIA' | 'BAJA';
  puntuacion: number;          // 0-100
  fuente: FuenteDeteccion;
  detalles: DetalleDeteccion[];
}

export type FuenteDeteccion = 
  | 'NOMBRE_ARCHIVO'
  | 'CABECERA_DOCUMENTO'
  | 'CONTENIDO_TEXTO'
  | 'METADATOS'
  | 'COMBINADA';

export interface DetalleDeteccion {
  fuente: FuenteDeteccion;
  municipioDetectado: string;
  puntuacion: number;
  contexto?: string;
}

export interface OpcionesDetector {
  prioridadFuente?: FuenteDeteccion[];
  umbralConfianza?: number;    // Mínimo para considerar detección válida
  maxCandidatos?: number;      // Máximo de candidatos a considerar
}

// ============================================================================
// CONSTANTES
// ============================================================================

/**
 * Patrones para detectar municipio en nombres de archivo
 */
const PATRONES_ARCHIVO = [
  // PTEL_MUNICIPIO_AÑO.ext
  /PTEL[_\-\s]+([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)[_\-\s]+\d{4}/i,
  // Ficha_PTEL_MUNICIPIO.ext
  /Ficha[_\-\s]+PTEL[_\-\s]+([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+)/i,
  // Plan_Emergencia_MUNICIPIO.ext
  /Plan[_\-\s]+Emergencia[_\-\s]+([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+)/i,
  // MUNICIPIO_PTEL.ext
  /^([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)[_\-\s]+PTEL/i,
  // Simplemente el nombre del municipio
  /^([A-ZÁÉÍÓÚÑa-záéíóúñ\s]{3,30})$/i,
];

/**
 * Patrones para detectar municipio en cabeceras de documento
 */
const PATRONES_CABECERA = [
  /Plan\s+Territorial\s+de\s+Emergencias?\s+(?:Local|Municipal)?\s*(?:de|del)?\s+([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+)/i,
  /PTEL\s+(?:de|del)?\s+([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+)/i,
  /Ayuntamiento\s+de\s+([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+)/i,
  /Municipio\s+de\s+([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+)/i,
  /Término\s+Municipal\s+de\s+([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+)/i,
];

/**
 * Palabras a excluir de la detección (artículos, preposiciones, etc.)
 */
const PALABRAS_EXCLUIR = new Set([
  'el', 'la', 'los', 'las', 'de', 'del', 'un', 'una', 'unos', 'unas',
  'plan', 'territorial', 'emergencia', 'emergencias', 'local', 'municipal',
  'ptel', 'ayuntamiento', 'municipio', 'termino', 'ficha', 'plantilla',
  'anexo', 'anexos', 'documento', 'informe', 'datos', 'general',
  'andalucia', 'españa', 'junta',
]);

// ============================================================================
// ÍNDICE DE MUNICIPIOS
// ============================================================================

interface MunicipioIndexado {
  nombre: string;
  nombreNormalizado: string;
  codigoINE: string;
  provincia: string;
  variantes: string[];
}

// Construir índice de municipios desde CENTROIDES_MUNICIPIOS
const INDICE_MUNICIPIOS: Map<string, MunicipioIndexado> = new Map();

// Inicializar índice
function inicializarIndiceMunicipios(): void {
  if (INDICE_MUNICIPIOS.size > 0) return;
  
  for (const [ine, data] of Object.entries(CENTROIDES_MUNICIPIOS)) {
    const nombreNorm = normalizarTexto(data.nombre);
    const municipio: MunicipioIndexado = {
      nombre: data.nombre,
      nombreNormalizado: nombreNorm,
      codigoINE: ine,
      provincia: data.provincia,
      variantes: generarVariantes(data.nombre),
    };
    
    // Indexar por nombre normalizado
    INDICE_MUNICIPIOS.set(nombreNorm, municipio);
    
    // Indexar también variantes
    for (const variante of municipio.variantes) {
      if (!INDICE_MUNICIPIOS.has(variante)) {
        INDICE_MUNICIPIOS.set(variante, municipio);
      }
    }
  }
}

/**
 * Genera variantes de un nombre de municipio para mejorar detección
 */
function generarVariantes(nombre: string): string[] {
  const variantes: string[] = [];
  const normalizado = normalizarTexto(nombre);
  
  // Sin artículos
  const sinArticulos = normalizado
    .replace(/^(el|la|los|las)\s+/i, '')
    .trim();
  if (sinArticulos !== normalizado) {
    variantes.push(sinArticulos);
  }
  
  // Abreviatura común (primera palabra si es compuesto)
  const palabras = normalizado.split(/\s+/);
  if (palabras.length > 1 && palabras[0].length >= 4) {
    variantes.push(palabras[0]);
  }
  
  // Sin "de la", "del", etc.
  const sinPreposiciones = normalizado
    .replace(/\s+de\s+la\s+/g, ' ')
    .replace(/\s+del\s+/g, ' ')
    .replace(/\s+de\s+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (sinPreposiciones !== normalizado) {
    variantes.push(sinPreposiciones);
  }
  
  return variantes;
}

// ============================================================================
// NORMALIZACIÓN DE TEXTO
// ============================================================================

/**
 * Normaliza texto para comparación
 */
export function normalizarTexto(texto: string): string {
  if (!texto) return '';
  
  return texto
    .toLowerCase()
    .trim()
    // Normalizar acentos
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Eliminar caracteres especiales excepto espacios
    .replace(/[^a-z0-9\s]/g, '')
    // Espacios múltiples a uno
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extrae el nombre base de un archivo (sin extensión ni ruta)
 */
function extraerNombreBase(rutaArchivo: string): string {
  // Obtener solo el nombre del archivo
  const partes = rutaArchivo.split(/[/\\]/);
  const nombreArchivo = partes[partes.length - 1];
  
  // Eliminar extensión
  return nombreArchivo.replace(/\.[^.]+$/, '');
}

// ============================================================================
// DETECCIÓN DESDE NOMBRE DE ARCHIVO
// ============================================================================

/**
 * Detecta municipio desde el nombre del archivo
 */
export function detectarDesdeNombreArchivo(
  nombreArchivo: string
): DetalleDeteccion | null {
  inicializarIndiceMunicipios();
  
  const nombreBase = extraerNombreBase(nombreArchivo);
  
  for (const patron of PATRONES_ARCHIVO) {
    const match = nombreBase.match(patron);
    if (match && match[1]) {
      const candidato = normalizarTexto(match[1]);
      
      // Buscar en índice
      const municipio = buscarMunicipio(candidato);
      if (municipio) {
        return {
          fuente: 'NOMBRE_ARCHIVO',
          municipioDetectado: municipio.nombre,
          puntuacion: 90, // Alta confianza si el patrón coincide
          contexto: `Patrón: ${patron.source.substring(0, 30)}...`,
        };
      }
    }
  }
  
  // Intento directo: buscar cualquier municipio en el nombre
  const palabrasNombre = normalizarTexto(nombreBase).split(/[_\-\s]+/);
  for (const palabra of palabrasNombre) {
    if (palabra.length < 3 || PALABRAS_EXCLUIR.has(palabra)) continue;
    
    const municipio = buscarMunicipio(palabra);
    if (municipio) {
      return {
        fuente: 'NOMBRE_ARCHIVO',
        municipioDetectado: municipio.nombre,
        puntuacion: 70, // Confianza media
        contexto: `Palabra detectada: ${palabra}`,
      };
    }
  }
  
  return null;
}

// ============================================================================
// DETECCIÓN DESDE CABECERA/METADATOS
// ============================================================================

/**
 * Detecta municipio desde la cabecera o primeras líneas del documento
 */
export function detectarDesdeCabecera(
  textoInicial: string
): DetalleDeteccion | null {
  inicializarIndiceMunicipios();
  
  // Usar solo las primeras 2000 caracteres
  const cabecera = textoInicial.substring(0, 2000);
  
  for (const patron of PATRONES_CABECERA) {
    const match = cabecera.match(patron);
    if (match && match[1]) {
      const candidato = normalizarTexto(match[1]);
      const municipio = buscarMunicipio(candidato);
      
      if (municipio) {
        return {
          fuente: 'CABECERA_DOCUMENTO',
          municipioDetectado: municipio.nombre,
          puntuacion: 95, // Muy alta confianza
          contexto: match[0].substring(0, 50),
        };
      }
    }
  }
  
  return null;
}

// ============================================================================
// DETECCIÓN DESDE CONTENIDO (FRECUENCIA)
// ============================================================================

/**
 * Detecta municipio por frecuencia de aparición en el contenido
 */
export function detectarDesdeContenido(
  contenidoCompleto: string
): DetalleDeteccion | null {
  inicializarIndiceMunicipios();
  
  const textoNorm = normalizarTexto(contenidoCompleto);
  const frecuencias: Map<string, number> = new Map();
  
  // Contar apariciones de cada municipio
  for (const [nombreNorm, municipio] of INDICE_MUNICIPIOS) {
    // Solo buscar nombres de 4+ caracteres para evitar falsos positivos
    if (nombreNorm.length < 4) continue;
    
    // Contar apariciones (palabra completa)
    const regex = new RegExp(`\\b${escapeRegex(nombreNorm)}\\b`, 'gi');
    const matches = textoNorm.match(regex);
    
    if (matches && matches.length > 0) {
      const clave = municipio.codigoINE;
      const actual = frecuencias.get(clave) || 0;
      frecuencias.set(clave, actual + matches.length);
    }
  }
  
  if (frecuencias.size === 0) return null;
  
  // Ordenar por frecuencia
  const ordenado = [...frecuencias.entries()]
    .sort((a, b) => b[1] - a[1]);
  
  // Tomar el más frecuente
  const [ineGanador, frecuencia] = ordenado[0];
  const municipioGanador = Object.entries(CENTROIDES_MUNICIPIOS)
    .find(([ine]) => ine === ineGanador);
  
  if (!municipioGanador) return null;
  
  // Calcular puntuación basada en frecuencia y distancia al segundo
  let puntuacion = Math.min(80, 40 + frecuencia * 5);
  
  // Bonus si hay clara diferencia con el segundo
  if (ordenado.length > 1) {
    const ratio = frecuencia / ordenado[1][1];
    if (ratio >= 2) puntuacion = Math.min(90, puntuacion + 10);
  }
  
  return {
    fuente: 'CONTENIDO_TEXTO',
    municipioDetectado: municipioGanador[1].nombre,
    puntuacion,
    contexto: `Apariciones: ${frecuencia}`,
  };
}

// ============================================================================
// BÚSQUEDA EN ÍNDICE
// ============================================================================

/**
 * Busca un municipio en el índice por nombre (exacto o parcial)
 */
function buscarMunicipio(candidato: string): MunicipioIndexado | null {
  const normalizado = normalizarTexto(candidato);
  
  // Búsqueda exacta
  if (INDICE_MUNICIPIOS.has(normalizado)) {
    return INDICE_MUNICIPIOS.get(normalizado)!;
  }
  
  // Búsqueda parcial (el candidato está contenido en el nombre)
  for (const [nombre, municipio] of INDICE_MUNICIPIOS) {
    if (nombre.includes(normalizado) || normalizado.includes(nombre)) {
      // Solo si la coincidencia es significativa (>70% overlap)
      const overlap = Math.min(nombre.length, normalizado.length) / 
                      Math.max(nombre.length, normalizado.length);
      if (overlap > 0.7) {
        return municipio;
      }
    }
  }
  
  // Búsqueda por distancia Levenshtein para typos
  let mejorMatch: MunicipioIndexado | null = null;
  let mejorDistancia = Infinity;
  
  for (const [nombre, municipio] of INDICE_MUNICIPIOS) {
    if (Math.abs(nombre.length - normalizado.length) > 3) continue;
    
    const distancia = levenshteinDistance(nombre, normalizado);
    const similitud = 1 - (distancia / Math.max(nombre.length, normalizado.length));
    
    if (similitud > 0.8 && distancia < mejorDistancia) {
      mejorDistancia = distancia;
      mejorMatch = municipio;
    }
  }
  
  return mejorMatch;
}

/**
 * Distancia Levenshtein optimizada
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  
  if (m === 0) return n;
  if (n === 0) return m;
  
  const dp: number[] = Array(n + 1).fill(0).map((_, i) => i);
  
  for (let i = 1; i <= m; i++) {
    let prev = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      if (str1[i - 1] === str2[j - 1]) {
        dp[j] = dp[j - 1];
      } else {
        dp[j] = 1 + Math.min(dp[j], prev, dp[j - 1]);
      }
      prev = temp;
    }
    dp[0] = i;
  }
  
  return dp[n];
}

/**
 * Escapa caracteres especiales para regex
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// FUNCIÓN PRINCIPAL: DETECCIÓN COMBINADA
// ============================================================================

/**
 * Detecta el municipio combinando todas las fuentes disponibles
 */
export function detectarMunicipio(
  nombreArchivo: string,
  contenidoDocumento: string,
  opciones: OpcionesDetector = {}
): DeteccionMunicipio | null {
  inicializarIndiceMunicipios();
  
  const {
    umbralConfianza = 50,
    maxCandidatos = 3,
  } = opciones;
  
  const detalles: DetalleDeteccion[] = [];
  
  // 1. Detectar desde nombre de archivo (prioridad alta)
  const desdeArchivo = detectarDesdeNombreArchivo(nombreArchivo);
  if (desdeArchivo) {
    detalles.push(desdeArchivo);
  }
  
  // 2. Detectar desde cabecera (prioridad muy alta)
  const desdeCabecera = detectarDesdeCabecera(contenidoDocumento);
  if (desdeCabecera) {
    detalles.push(desdeCabecera);
  }
  
  // 3. Detectar desde contenido (prioridad media)
  const desdeContenido = detectarDesdeContenido(contenidoDocumento);
  if (desdeContenido) {
    detalles.push(desdeContenido);
  }
  
  if (detalles.length === 0) {
    return null;
  }
  
  // Combinar resultados
  const puntuaciones: Map<string, number> = new Map();
  const pesosFuente: Record<FuenteDeteccion, number> = {
    'CABECERA_DOCUMENTO': 1.5,
    'NOMBRE_ARCHIVO': 1.2,
    'CONTENIDO_TEXTO': 1.0,
    'METADATOS': 1.3,
    'COMBINADA': 1.0,
  };
  
  for (const detalle of detalles) {
    const nombreNorm = normalizarTexto(detalle.municipioDetectado);
    const municipioData = INDICE_MUNICIPIOS.get(nombreNorm);
    if (!municipioData) continue;
    
    const peso = pesosFuente[detalle.fuente] || 1.0;
    const puntuacionPonderada = detalle.puntuacion * peso;
    
    const actual = puntuaciones.get(municipioData.codigoINE) || 0;
    puntuaciones.set(municipioData.codigoINE, actual + puntuacionPonderada);
  }
  
  // Seleccionar ganador
  const ordenados = [...puntuaciones.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxCandidatos);
  
  if (ordenados.length === 0) return null;
  
  const [ineGanador, puntuacionFinal] = ordenados[0];
  
  // Normalizar puntuación a 0-100
  const puntuacionNormalizada = Math.min(100, Math.round(puntuacionFinal / detalles.length));
  
  if (puntuacionNormalizada < umbralConfianza) {
    return null;
  }
  
  // Buscar datos del municipio ganador
  const datosGanador = CENTROIDES_MUNICIPIOS[ineGanador];
  if (!datosGanador) return null;
  
  // Determinar nivel de confianza
  let confianza: 'ALTA' | 'MEDIA' | 'BAJA';
  if (puntuacionNormalizada >= 85) {
    confianza = 'ALTA';
  } else if (puntuacionNormalizada >= 65) {
    confianza = 'MEDIA';
  } else {
    confianza = 'BAJA';
  }
  
  // Bonus: si múltiples fuentes coinciden, aumentar confianza
  const fuentesCoincidentes = detalles.filter(d => 
    normalizarTexto(d.municipioDetectado) === normalizarTexto(datosGanador.nombre)
  ).length;
  
  if (fuentesCoincidentes >= 2 && confianza !== 'ALTA') {
    confianza = 'ALTA';
  }
  
  return {
    municipio: datosGanador.nombre,
    codigoINE: ineGanador,
    provincia: datosGanador.provincia,
    confianza,
    puntuacion: puntuacionNormalizada,
    fuente: detalles.length > 1 ? 'COMBINADA' : detalles[0].fuente,
    detalles,
  };
}

// ============================================================================
// FUNCIONES DE UTILIDAD EXPORTADAS
// ============================================================================

/**
 * Obtiene la lista de todos los municipios indexados
 */
export function obtenerListaMunicipios(): MunicipioIndexado[] {
  inicializarIndiceMunicipios();
  
  // Filtrar duplicados (variantes apuntan al mismo municipio)
  const vistos = new Set<string>();
  const resultado: MunicipioIndexado[] = [];
  
  for (const municipio of INDICE_MUNICIPIOS.values()) {
    if (!vistos.has(municipio.codigoINE)) {
      vistos.add(municipio.codigoINE);
      resultado.push(municipio);
    }
  }
  
  return resultado.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

/**
 * Busca municipios que coincidan parcialmente con un texto
 */
export function buscarMunicipiosPorTexto(
  texto: string,
  maxResultados: number = 10
): MunicipioIndexado[] {
  inicializarIndiceMunicipios();
  
  const normalizado = normalizarTexto(texto);
  if (normalizado.length < 2) return [];
  
  const resultados: Array<{ municipio: MunicipioIndexado; score: number }> = [];
  const vistos = new Set<string>();
  
  for (const [nombre, municipio] of INDICE_MUNICIPIOS) {
    if (vistos.has(municipio.codigoINE)) continue;
    
    let score = 0;
    
    // Coincidencia exacta
    if (nombre === normalizado) {
      score = 100;
    }
    // Empieza con el texto buscado
    else if (nombre.startsWith(normalizado)) {
      score = 80;
    }
    // Contiene el texto buscado
    else if (nombre.includes(normalizado)) {
      score = 60;
    }
    // Similitud parcial
    else {
      const similitud = 1 - (levenshteinDistance(nombre, normalizado) / 
                            Math.max(nombre.length, normalizado.length));
      if (similitud > 0.6) {
        score = Math.round(similitud * 50);
      }
    }
    
    if (score > 0) {
      vistos.add(municipio.codigoINE);
      resultados.push({ municipio, score });
    }
  }
  
  return resultados
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResultados)
    .map(r => r.municipio);
}

// ============================================================================
// EXPORTACIÓN
// ============================================================================

export default {
  detectarMunicipio,
  detectarDesdeNombreArchivo,
  detectarDesdeCabecera,
  detectarDesdeContenido,
  obtenerListaMunicipios,
  buscarMunicipiosPorTexto,
  normalizarTexto,
};
