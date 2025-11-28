/**
 * @fileoverview Sistema de logging para rechazos de geocodificación
 * @description Registra y analiza los resultados de geocodificación rechazados
 *              por la validación INE para auditoría y mejora continua
 * 
 * @author Proyecto PTEL - Normalizador de Coordenadas
 * @version 1.0.0
 * @date 2025-11-28
 */

// ============================================================================
// TIPOS
// ============================================================================

export type MotivoRechazo = 
  | 'fuera_andalucia'
  | 'provincia_incorrecta'
  | 'municipio_incorrecto'
  | 'sin_codigo_ine'
  | 'timeout'
  | 'error_red'
  | 'formato_invalido';

export interface RechazoLog {
  timestamp: string;
  query: string;
  municipioEsperado: string;
  municipioObtenido: string;
  codigoINEEsperado: string;
  codigoINEObtenido: string;
  motivo: MotivoRechazo;
  fuenteAlternativa?: string;
  coordenadasRechazadas?: { lat: number; lng: number };
  metadata?: Record<string, unknown>;
}

export interface EstadisticasRechazos {
  total: number;
  porMotivo: Record<MotivoRechazo, number>;
  ultimasDiarias: number;
  municipiosProblematicos: Array<{ municipio: string; rechazos: number }>;
  primerRechazo?: string;
  ultimoRechazo?: string;
}

export interface RechazoInput {
  query: string;
  municipioEsperado: string;
  municipioObtenido: string;
  codigoINEEsperado: string;
  codigoINEObtenido: string;
  motivo: MotivoRechazo;
  fuenteAlternativa?: string;
  coordenadasRechazadas?: { lat: number; lng: number };
  metadata?: Record<string, unknown>;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const STORAGE_KEY = 'ptel_rechazos_geocoding';
const MAX_RECHAZOS = 100;
const DIAS_RETENCION = 30;

// ============================================================================
// ESTADO EN MEMORIA
// ============================================================================

let rechazosCache: RechazoLog[] | null = null;

// ============================================================================
// FUNCIONES PRIVADAS
// ============================================================================

function cargarRechazos(): RechazoLog[] {
  if (rechazosCache !== null) {
    return rechazosCache;
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      rechazosCache = JSON.parse(stored);
      return rechazosCache!;
    }
  } catch (error) {
    console.warn('[RejectionLogger] Error cargando rechazos:', error);
  }
  
  rechazosCache = [];
  return rechazosCache;
}

function guardarRechazos(rechazos: RechazoLog[]): void {
  try {
    const recortados = rechazos.slice(-MAX_RECHAZOS);
    
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - DIAS_RETENCION);
    const filtrados = recortados.filter(r => new Date(r.timestamp) >= fechaLimite);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtrados));
    rechazosCache = filtrados;
  } catch (error) {
    console.warn('[RejectionLogger] Error guardando rechazos:', error);
  }
}

// ============================================================================
// FUNCIONES PÚBLICAS
// ============================================================================

export function logRechazo(data: RechazoInput): RechazoLog {
  const rechazo: RechazoLog = {
    timestamp: new Date().toISOString(),
    query: data.query,
    municipioEsperado: data.municipioEsperado,
    municipioObtenido: data.municipioObtenido,
    codigoINEEsperado: data.codigoINEEsperado,
    codigoINEObtenido: data.codigoINEObtenido,
    motivo: data.motivo,
    fuenteAlternativa: data.fuenteAlternativa,
    coordenadasRechazadas: data.coordenadasRechazadas,
    metadata: data.metadata
  };
  
  const rechazos = cargarRechazos();
  rechazos.push(rechazo);
  guardarRechazos(rechazos);
  
  console.warn(
    `[Geocoding] RECHAZADO: "${data.query}" → ${data.municipioObtenido} (${data.codigoINEObtenido}) ` +
    `esperaba ${data.municipioEsperado} (${data.codigoINEEsperado}) - ${data.motivo}`
  );
  
  return rechazo;
}

export function getEstadisticasRechazos(): EstadisticasRechazos {
  const rechazos = cargarRechazos();
  
  const porMotivo: Record<MotivoRechazo, number> = {
    fuera_andalucia: 0,
    provincia_incorrecta: 0,
    municipio_incorrecto: 0,
    sin_codigo_ine: 0,
    timeout: 0,
    error_red: 0,
    formato_invalido: 0
  };
  
  for (const r of rechazos) {
    if (r.motivo in porMotivo) {
      porMotivo[r.motivo]++;
    }
  }
  
  const hace24h = new Date();
  hace24h.setHours(hace24h.getHours() - 24);
  const ultimasDiarias = rechazos.filter(r => new Date(r.timestamp) >= hace24h).length;
  
  const conteoMunicipios: Record<string, number> = {};
  for (const r of rechazos) {
    conteoMunicipios[r.municipioEsperado] = (conteoMunicipios[r.municipioEsperado] || 0) + 1;
  }
  
  const municipiosProblematicos = Object.entries(conteoMunicipios)
    .map(([municipio, rechazos]) => ({ municipio, rechazos }))
    .sort((a, b) => b.rechazos - a.rechazos)
    .slice(0, 5);
  
  return {
    total: rechazos.length,
    porMotivo,
    ultimasDiarias,
    municipiosProblematicos,
    primerRechazo: rechazos[0]?.timestamp,
    ultimoRechazo: rechazos[rechazos.length - 1]?.timestamp
  };
}

export function getRechazos(limite: number = MAX_RECHAZOS): RechazoLog[] {
  return cargarRechazos().slice(-limite);
}

export function getRechazoPorMotivo(motivo: MotivoRechazo): RechazoLog[] {
  return cargarRechazos().filter(r => r.motivo === motivo);
}

export function getRechazoPorMunicipio(municipio: string): RechazoLog[] {
  const municipioNorm = municipio.toLowerCase();
  return cargarRechazos().filter(r => 
    r.municipioEsperado.toLowerCase().includes(municipioNorm) ||
    r.municipioObtenido.toLowerCase().includes(municipioNorm)
  );
}

export function exportarRechazosCSV(): string {
  const rechazos = cargarRechazos();
  
  const headers = [
    'timestamp', 'query', 'municipioEsperado', 'municipioObtenido',
    'codigoINEEsperado', 'codigoINEObtenido', 'motivo', 'fuenteAlternativa'
  ];
  
  const rows = rechazos.map(r => [
    r.timestamp,
    `"${r.query.replace(/"/g, '""')}"`,
    r.municipioEsperado,
    r.municipioObtenido,
    r.codigoINEEsperado,
    r.codigoINEObtenido,
    r.motivo,
    r.fuenteAlternativa || ''
  ].join(','));
  
  return [headers.join(','), ...rows].join('\n');
}

export function exportarRechazosJSON(): string {
  return JSON.stringify(cargarRechazos(), null, 2);
}

export function limpiarRechazos(): void {
  localStorage.removeItem(STORAGE_KEY);
  rechazosCache = [];
  console.log('[RejectionLogger] Rechazos limpiados');
}

export function marcarResuelto(index: number, fuenteAlternativa: string): void {
  const rechazos = cargarRechazos();
  if (index >= 0 && index < rechazos.length) {
    rechazos[index].fuenteAlternativa = fuenteAlternativa;
    guardarRechazos(rechazos);
  }
}

export function hayAlertaRechazos(umbral: number = 10): boolean {
  const rechazos = cargarRechazos();
  const hace1h = new Date();
  hace1h.setHours(hace1h.getHours() - 1);
  
  return rechazos.filter(r => new Date(r.timestamp) >= hace1h).length >= umbral;
}

export function getResumenUI(): {
  total: number;
  hoy: number;
  alerta: boolean;
  ultimoRechazo?: string;
} {
  const stats = getEstadisticasRechazos();
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  const rechazosHoy = cargarRechazos().filter(r => new Date(r.timestamp) >= hoy).length;
  
  return {
    total: stats.total,
    hoy: rechazosHoy,
    alerta: hayAlertaRechazos(),
    ultimoRechazo: stats.ultimoRechazo
  };
}

export default {
  logRechazo,
  getEstadisticasRechazos,
  getRechazos,
  getRechazoPorMotivo,
  getRechazoPorMunicipio,
  exportarRechazosCSV,
  exportarRechazosJSON,
  limpiarRechazos,
  marcarResuelto,
  hayAlertaRechazos,
  getResumenUI
};
