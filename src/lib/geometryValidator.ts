/**
 * PTEL Andalucía - Validador Geométrico con Índice Espacial v1.0
 * 
 * Implementa validación point-in-polygon usando:
 * - Flatbush para índice espacial R-tree (<1ms búsqueda)
 * - TopoJSON de 785 municipios andaluces
 * - Tolerancia de bordes 50-100m para compensar simplificación
 * - Grafo de adyacencia para municipios colindantes
 * 
 * @version 1.0.0
 * @date Diciembre 2025
 */

import { CENTROIDES_MUNICIPIOS } from './municipiosCentroides';
import { distanciaUTM, utmToWgs84Approx } from './CoordinateValidator';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface PoligonoMunicipio {
  codigoINE: string;
  nombre: string;
  provincia: string;
  bbox: BoundingBox;
  coordenadas: number[][][];  // MultiPolygon: [poligonos][anillos][puntos]
}

export interface ResultadoPIP {
  dentroMunicipio: boolean;
  municipio: string | null;
  codigoINE: string | null;
  distanciaAlBorde: number;   // metros, negativo = dentro
  confianza: number;          // 0-1
  nearBoundary: boolean;      // true si está a menos de 100m del borde
  tiempoMs: number;
}

export interface ResultadoValidacionGeometrica {
  resultado: ResultadoPIP;
  candidatos: string[];       // INEs de municipios candidatos por bbox
  colindantes: string[];      // INEs de municipios colindantes al declarado
  validacionColindante?: ResultadoPIP;  // Si se encontró en un colindante
}

export type ToleranciaConfig = {
  metrosTolerancia: number;   // 50-100m recomendado
  verificarColindantes: boolean;
};

// ============================================================================
// CONSTANTES
// ============================================================================

const DEFAULT_TOLERANCIA: ToleranciaConfig = {
  metrosTolerancia: 75,       // 75m de tolerancia en bordes
  verificarColindantes: true,
};

/**
 * URL del CDN donde está alojado el TopoJSON de municipios
 * Alternativa local: src/data/municipios-andalucia.topojson
 */
const TOPOJSON_URLS = {
  primary: 'https://raw.githubusercontent.com/luismgarcia/norm-coord-ptel/main/src/data/municipios-andalucia.topojson',
  fallback: '/data/municipios-andalucia.topojson',
};

// ============================================================================
// ESTADO DEL VALIDADOR
// ============================================================================

interface ValidadorState {
  inicializado: boolean;
  poligonos: Map<string, PoligonoMunicipio>;
  indice: FlatbushIndex | null;
  adyacencias: Map<string, Set<string>>;  // INE -> Set<INE colindantes>
  error: string | null;
}

const estado: ValidadorState = {
  inicializado: false,
  poligonos: new Map(),
  indice: null,
  adyacencias: new Map(),
  error: null,
};

// ============================================================================
// FLATBUSH INDEX (Implementación simplificada browser-compatible)
// ============================================================================

/**
 * Índice espacial R-tree simplificado
 * Para producción usar: npm install flatbush
 */
interface FlatbushIndex {
  boxes: Float64Array;
  indices: Uint32Array;
  nodeSize: number;
  numItems: number;
  search(minX: number, minY: number, maxX: number, maxY: number): number[];
}

/**
 * Crea un índice espacial simple basado en bounding boxes
 */
function createSimpleSpatialIndex(bboxes: BoundingBox[]): FlatbushIndex {
  const numItems = bboxes.length;
  const boxes = new Float64Array(numItems * 4);
  const indices = new Uint32Array(numItems);
  
  for (let i = 0; i < numItems; i++) {
    const bbox = bboxes[i];
    boxes[i * 4] = bbox.minX;
    boxes[i * 4 + 1] = bbox.minY;
    boxes[i * 4 + 2] = bbox.maxX;
    boxes[i * 4 + 3] = bbox.maxY;
    indices[i] = i;
  }
  
  return {
    boxes,
    indices,
    nodeSize: 16,
    numItems,
    search(minX: number, minY: number, maxX: number, maxY: number): number[] {
      const results: number[] = [];
      for (let i = 0; i < numItems; i++) {
        const boxMinX = boxes[i * 4];
        const boxMinY = boxes[i * 4 + 1];
        const boxMaxX = boxes[i * 4 + 2];
        const boxMaxY = boxes[i * 4 + 3];
        
        // Intersección de bboxes
        if (boxMaxX >= minX && boxMinX <= maxX &&
            boxMaxY >= minY && boxMinY <= maxY) {
          results.push(i);
        }
      }
      return results;
    }
  };
}

// ============================================================================
// CARGA DE DATOS TOPOJSON
// ============================================================================

/**
 * Inicializa el validador cargando el TopoJSON
 * Se ejecuta una sola vez y cachea los datos
 */
export async function inicializarValidadorGeometrico(): Promise<boolean> {
  if (estado.inicializado) return true;
  
  try {
    // Intentar cargar TopoJSON
    const topojson = await cargarTopoJSON();
    
    if (!topojson) {
      // Si no hay TopoJSON, usar modo degradado con centroides
      console.warn('⚠️ TopoJSON no disponible. Usando modo degradado con centroides.');
      inicializarModoMinimo();
      return true;
    }
    
    // Procesar TopoJSON a polígonos
    procesarTopoJSON(topojson);
    
    // Construir índice espacial
    construirIndiceSpatial();
    
    // Construir grafo de adyacencias
    construirGrafoAdyacencias();
    
    estado.inicializado = true;
    console.log(`✅ Validador geométrico inicializado: ${estado.poligonos.size} municipios`);
    
    return true;
    
  } catch (error) {
    estado.error = error instanceof Error ? error.message : 'Error desconocido';
    console.error('❌ Error inicializando validador geométrico:', estado.error);
    
    // Fallback a modo mínimo
    inicializarModoMinimo();
    return true;
  }
}

/**
 * Carga el TopoJSON desde CDN o archivo local
 */
async function cargarTopoJSON(): Promise<unknown | null> {
  // Primero intentar CDN
  try {
    const response = await fetch(TOPOJSON_URLS.primary, {
      headers: { 'Accept': 'application/json' }
    });
    if (response.ok) {
      return await response.json();
    }
  } catch {
    console.log('CDN no disponible, intentando local...');
  }
  
  // Fallback a archivo local
  try {
    const response = await fetch(TOPOJSON_URLS.fallback);
    if (response.ok) {
      return await response.json();
    }
  } catch {
    console.log('Archivo local no disponible');
  }
  
  return null;
}

/**
 * Procesa TopoJSON y extrae polígonos
 */
function procesarTopoJSON(topojson: unknown): void {
  // Estructura esperada de TopoJSON
  const data = topojson as {
    type: string;
    objects: {
      municipios?: {
        geometries: Array<{
          type: string;
          arcs: number[][][] | number[][];
          properties: {
            cod_ine?: string;
            COD_INE?: string;
            nombre?: string;
            NOMBRE?: string;
            provincia?: string;
          };
        }>;
      };
    };
    arcs: number[][][];
    transform?: {
      scale: [number, number];
      translate: [number, number];
    };
  };
  
  if (!data.objects?.municipios) {
    throw new Error('TopoJSON no contiene objeto "municipios"');
  }
  
  const arcs = data.arcs;
  const transform = data.transform;
  
  for (const geometry of data.objects.municipios.geometries) {
    const props = geometry.properties;
    const codigoINE = props.cod_ine || props.COD_INE || '';
    const nombre = props.nombre || props.NOMBRE || '';
    
    if (!codigoINE) continue;
    
    // Decodificar arcos a coordenadas
    const coordenadas = decodificarArcos(geometry.arcs, arcs, transform);
    const bbox = calcularBBox(coordenadas);
    
    // Obtener provincia desde centroides
    const centroide = CENTROIDES_MUNICIPIOS[codigoINE];
    const provincia = centroide?.provincia || '';
    
    estado.poligonos.set(codigoINE, {
      codigoINE,
      nombre,
      provincia,
      bbox,
      coordenadas,
    });
  }
}

/**
 * Decodifica arcos TopoJSON a coordenadas
 */
function decodificarArcos(
  arcsRef: number[][][] | number[][],
  arcs: number[][][],
  transform?: { scale: [number, number]; translate: [number, number] }
): number[][][] {
  const result: number[][][] = [];
  
  // Manejar MultiPolygon vs Polygon
  const rings = Array.isArray(arcsRef[0]?.[0]) 
    ? arcsRef as number[][][] 
    : [arcsRef as number[][]];
  
  for (const polygon of rings) {
    const decodedRings: number[][] = [];
    
    for (const arcRefs of polygon) {
      if (!Array.isArray(arcRefs)) continue;
      
      const ring: number[] = [];
      
      for (const arcIndex of arcRefs) {
        const idx = arcIndex < 0 ? ~arcIndex : arcIndex;
        const arc = arcs[idx];
        if (!arc) continue;
        
        let points = [...arc];
        if (arcIndex < 0) points.reverse();
        
        // Aplicar transformación delta + escala
        let x = 0, y = 0;
        for (const point of points) {
          x += point[0];
          y += point[1];
          
          let px = x, py = y;
          if (transform) {
            px = x * transform.scale[0] + transform.translate[0];
            py = y * transform.scale[1] + transform.translate[1];
          }
          
          ring.push(px, py);
        }
      }
      
      if (ring.length >= 6) { // Mínimo 3 puntos (6 valores)
        decodedRings.push(ring);
      }
    }
    
    if (decodedRings.length > 0) {
      result.push(decodedRings);
    }
  }
  
  return result;
}

/**
 * Calcula bounding box de un polígono
 */
function calcularBBox(coordenadas: number[][][]): BoundingBox {
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  
  for (const polygon of coordenadas) {
    for (const ring of polygon) {
      for (let i = 0; i < ring.length; i += 2) {
        minX = Math.min(minX, ring[i]);
        maxX = Math.max(maxX, ring[i]);
        minY = Math.min(minY, ring[i + 1]);
        maxY = Math.max(maxY, ring[i + 1]);
      }
    }
  }
  
  return { minX, minY, maxX, maxY };
}

/**
 * Construye índice espacial con los bboxes
 */
function construirIndiceSpatial(): void {
  const bboxes: BoundingBox[] = [];
  const ines: string[] = [];
  
  for (const [ine, poligono] of estado.poligonos) {
    bboxes.push(poligono.bbox);
    ines.push(ine);
  }
  
  estado.indice = createSimpleSpatialIndex(bboxes);
  
  // Guardar referencia INE -> índice
  (estado.indice as { ines?: string[] }).ines = ines;
}

/**
 * Construye grafo de municipios adyacentes
 */
function construirGrafoAdyacencias(): void {
  const poligonos = [...estado.poligonos.values()];
  
  for (let i = 0; i < poligonos.length; i++) {
    const p1 = poligonos[i];
    const adyacentes = new Set<string>();
    
    for (let j = 0; j < poligonos.length; j++) {
      if (i === j) continue;
      
      const p2 = poligonos[j];
      
      // Verificar si los bboxes se solapan (con margen de 100m)
      const margen = 100; // metros
      if (bboxSeSuperponen(p1.bbox, p2.bbox, margen)) {
        adyacentes.add(p2.codigoINE);
      }
    }
    
    estado.adyacencias.set(p1.codigoINE, adyacentes);
  }
}

/**
 * Verifica si dos bboxes se superponen
 */
function bboxSeSuperponen(a: BoundingBox, b: BoundingBox, margen: number = 0): boolean {
  return !(
    a.maxX + margen < b.minX ||
    a.minX - margen > b.maxX ||
    a.maxY + margen < b.minY ||
    a.minY - margen > b.maxY
  );
}

/**
 * Modo mínimo: usar centroides cuando no hay TopoJSON
 */
function inicializarModoMinimo(): void {
  // Crear polígonos virtuales basados en centroides
  for (const [ine, data] of Object.entries(CENTROIDES_MUNICIPIOS)) {
    // Crear bbox aproximado basado en radio típico
    const radio = 5000; // 5km por defecto
    
    estado.poligonos.set(ine, {
      codigoINE: ine,
      nombre: data.nombre,
      provincia: data.provincia,
      bbox: {
        minX: data.x - radio,
        minY: data.y - radio,
        maxX: data.x + radio,
        maxY: data.y + radio,
      },
      coordenadas: [], // Vacío en modo mínimo
    });
  }
  
  construirIndiceSpatial();
  // No construir adyacencias en modo mínimo
  
  estado.inicializado = true;
}

// ============================================================================
// ALGORITMO POINT-IN-POLYGON (Winding Number)
// ============================================================================

/**
 * Implementación del algoritmo Winding Number para PIP
 * Más robusto que ray casting en casos límite
 */
function pointInPolygon(px: number, py: number, ring: number[]): boolean {
  let winding = 0;
  const n = ring.length / 2;
  
  for (let i = 0; i < n; i++) {
    const x1 = ring[i * 2];
    const y1 = ring[i * 2 + 1];
    const x2 = ring[((i + 1) % n) * 2];
    const y2 = ring[((i + 1) % n) * 2 + 1];
    
    if (y1 <= py) {
      if (y2 > py) {
        // Upward crossing
        const vt = (py - y1) / (y2 - y1);
        if (px < x1 + vt * (x2 - x1)) {
          winding++;
        }
      }
    } else {
      if (y2 <= py) {
        // Downward crossing
        const vt = (py - y1) / (y2 - y1);
        if (px < x1 + vt * (x2 - x1)) {
          winding--;
        }
      }
    }
  }
  
  return winding !== 0;
}

/**
 * Verifica si un punto está dentro de un MultiPolygon
 */
function pointInMultiPolygon(px: number, py: number, coordenadas: number[][][]): boolean {
  for (const polygon of coordenadas) {
    // Verificar anillo exterior (primer anillo)
    if (polygon.length === 0) continue;
    
    const exterior = polygon[0];
    if (!pointInPolygon(px, py, exterior)) continue;
    
    // Verificar agujeros (anillos interiores)
    let dentroAgujero = false;
    for (let i = 1; i < polygon.length; i++) {
      if (pointInPolygon(px, py, polygon[i])) {
        dentroAgujero = true;
        break;
      }
    }
    
    if (!dentroAgujero) return true;
  }
  
  return false;
}

/**
 * Calcula la distancia mínima al borde del polígono
 * Positivo = fuera, Negativo = dentro
 */
function distanciaAlBorde(px: number, py: number, coordenadas: number[][][]): number {
  let minDistancia = Infinity;
  const dentro = pointInMultiPolygon(px, py, coordenadas);
  
  for (const polygon of coordenadas) {
    for (const ring of polygon) {
      const n = ring.length / 2;
      
      for (let i = 0; i < n; i++) {
        const x1 = ring[i * 2];
        const y1 = ring[i * 2 + 1];
        const x2 = ring[((i + 1) % n) * 2];
        const y2 = ring[((i + 1) % n) * 2 + 1];
        
        const dist = distanciaPuntoSegmento(px, py, x1, y1, x2, y2);
        minDistancia = Math.min(minDistancia, dist);
      }
    }
  }
  
  return dentro ? -minDistancia : minDistancia;
}

/**
 * Distancia de un punto a un segmento
 */
function distanciaPuntoSegmento(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  
  if (lengthSq === 0) {
    // Segmento degenerado (punto)
    return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  }
  
  // Proyección del punto sobre la línea
  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  
  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}

// ============================================================================
// FUNCIONES PÚBLICAS DE VALIDACIÓN
// ============================================================================

/**
 * Valida si un punto UTM está dentro de un municipio
 */
export async function validarPuntoEnMunicipio(
  utmX: number,
  utmY: number,
  codigoINE: string,
  tolerancia: ToleranciaConfig = DEFAULT_TOLERANCIA
): Promise<ResultadoValidacionGeometrica> {
  const inicio = performance.now();
  
  // Asegurar inicialización
  await inicializarValidadorGeometrico();
  
  // Buscar candidatos por índice espacial
  const candidatos = buscarCandidatosPorBBox(utmX, utmY, tolerancia.metrosTolerancia);
  
  // Obtener colindantes del municipio declarado
  const colindantes = tolerancia.verificarColindantes 
    ? obtenerColindantes(codigoINE)
    : [];
  
  // Resultado por defecto
  const resultado: ResultadoPIP = {
    dentroMunicipio: false,
    municipio: null,
    codigoINE: null,
    distanciaAlBorde: Infinity,
    confianza: 0,
    nearBoundary: false,
    tiempoMs: 0,
  };
  
  // Primero verificar el municipio declarado
  const poligonoDeclarado = estado.poligonos.get(codigoINE);
  
  if (poligonoDeclarado && poligonoDeclarado.coordenadas.length > 0) {
    const dentroDeclarado = pointInMultiPolygon(utmX, utmY, poligonoDeclarado.coordenadas);
    const distancia = distanciaAlBorde(utmX, utmY, poligonoDeclarado.coordenadas);
    
    resultado.distanciaAlBorde = distancia;
    resultado.nearBoundary = Math.abs(distancia) <= tolerancia.metrosTolerancia;
    
    if (dentroDeclarado || (resultado.nearBoundary && distancia > 0)) {
      resultado.dentroMunicipio = true;
      resultado.municipio = poligonoDeclarado.nombre;
      resultado.codigoINE = codigoINE;
      resultado.confianza = dentroDeclarado ? 0.99 : Math.max(0.75, 1 - distancia / (tolerancia.metrosTolerancia * 2));
      resultado.tiempoMs = performance.now() - inicio;
      
      return { resultado, candidatos, colindantes };
    }
  }
  
  // Verificar en colindantes si está habilitado
  let validacionColindante: ResultadoPIP | undefined;
  
  if (tolerancia.verificarColindantes) {
    for (const ineColindante of colindantes) {
      const poligonoCol = estado.poligonos.get(ineColindante);
      if (!poligonoCol || poligonoCol.coordenadas.length === 0) continue;
      
      const dentroCol = pointInMultiPolygon(utmX, utmY, poligonoCol.coordenadas);
      if (dentroCol) {
        validacionColindante = {
          dentroMunicipio: true,
          municipio: poligonoCol.nombre,
          codigoINE: ineColindante,
          distanciaAlBorde: distanciaAlBorde(utmX, utmY, poligonoCol.coordenadas),
          confianza: 0.85, // Menor confianza porque no es el declarado
          nearBoundary: true,
          tiempoMs: 0,
        };
        break;
      }
    }
  }
  
  resultado.tiempoMs = performance.now() - inicio;
  
  return { resultado, candidatos, colindantes, validacionColindante };
}

/**
 * Busca candidatos por bbox usando el índice espacial
 */
function buscarCandidatosPorBBox(x: number, y: number, margen: number): string[] {
  if (!estado.indice) return [];
  
  const indices = estado.indice.search(
    x - margen, y - margen,
    x + margen, y + margen
  );
  
  const ines = (estado.indice as { ines?: string[] }).ines || [];
  return indices.map(i => ines[i]).filter(Boolean);
}

/**
 * Obtiene los municipios colindantes
 */
export function obtenerColindantes(codigoINE: string): string[] {
  const colindantes = estado.adyacencias.get(codigoINE);
  return colindantes ? [...colindantes] : [];
}

/**
 * Obtiene información de un polígono por INE
 */
export function obtenerPoligono(codigoINE: string): PoligonoMunicipio | undefined {
  return estado.poligonos.get(codigoINE);
}

/**
 * Verifica si el validador está inicializado
 */
export function estaInicializado(): boolean {
  return estado.inicializado;
}

/**
 * Obtiene estadísticas del validador
 */
export function obtenerEstadisticas(): {
  municipios: number;
  conPoligonos: number;
  conAdyacencias: number;
  modo: 'completo' | 'minimo';
} {
  let conPoligonos = 0;
  for (const p of estado.poligonos.values()) {
    if (p.coordenadas.length > 0) conPoligonos++;
  }
  
  return {
    municipios: estado.poligonos.size,
    conPoligonos,
    conAdyacencias: estado.adyacencias.size,
    modo: conPoligonos > 0 ? 'completo' : 'minimo',
  };
}

// ============================================================================
// EXPORTACIÓN
// ============================================================================

export default {
  inicializarValidadorGeometrico,
  validarPuntoEnMunicipio,
  obtenerColindantes,
  obtenerPoligono,
  estaInicializado,
  obtenerEstadisticas,
  DEFAULT_TOLERANCIA,
};
