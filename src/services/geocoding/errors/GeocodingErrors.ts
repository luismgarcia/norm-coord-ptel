/**
 * GeocodingErrors.ts - Sistema de errores tipados para geocodificación
 * 
 * F023 Fase 2 - Validación Cruzada Multi-Fuente
 * 
 * Proporciona clases de error específicas para cada tipo de fallo
 * en el proceso de geocodificación, permitiendo manejo granular
 * y mejor debugging.
 */

/** Información de contexto para errores de geocodificación */
export interface GeocodingErrorContext {
  /** Identificador del geocodificador que falló */
  source?: string;
  /** Query que se intentaba geocodificar */
  query?: string;
  /** Municipio del contexto */
  municipio?: string;
  /** Tipología de infraestructura */
  tipologia?: string;
  /** Error original si existe */
  originalError?: Error;
  /** Timestamp del error */
  timestamp?: Date;
  /** Datos adicionales para debugging */
  metadata?: Record<string, unknown>;
}

/**
 * Clase base para todos los errores de geocodificación.
 * Extiende Error nativo añadiendo contexto específico.
 */
export class GeocodingError extends Error {
  public readonly code: string;
  public readonly context: GeocodingErrorContext;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: string = 'GEOCODING_ERROR',
    context: GeocodingErrorContext = {}
  ) {
    super(message);
    this.name = 'GeocodingError';
    this.code = code;
    this.context = context;
    this.timestamp = context.timestamp ?? new Date();
    
    // Mantener stack trace correcto en V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /** Formato legible para logs */
  toLogString(): string {
    const parts = [
      `[${this.code}]`,
      this.message,
      this.context.source ? `(source: ${this.context.source})` : '',
      this.context.query ? `(query: "${this.context.query}")` : ''
    ].filter(Boolean);
    return parts.join(' ');
  }

  /** Serialización para almacenamiento/transmisión */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp.toISOString()
    };
  }
}


/**
 * Error de red: API no responde o conexión fallida.
 * Típico en servicios WFS que están caídos o sin CORS.
 */
export class NetworkError extends GeocodingError {
  public readonly statusCode?: number;
  public readonly url?: string;

  constructor(
    message: string,
    context: GeocodingErrorContext & { statusCode?: number; url?: string } = {}
  ) {
    super(message, 'NETWORK_ERROR', context);
    this.name = 'NetworkError';
    this.statusCode = context.statusCode;
    this.url = context.url;
  }
}

/**
 * Error de timeout: la petición excedió el tiempo límite.
 * Default 5000ms para geocodificadores individuales.
 */
export class TimeoutError extends GeocodingError {
  public readonly timeoutMs: number;
  public readonly elapsedMs?: number;

  constructor(
    message: string,
    timeoutMs: number,
    context: GeocodingErrorContext & { elapsedMs?: number } = {}
  ) {
    super(message, 'TIMEOUT_ERROR', context);
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
    this.elapsedMs = context.elapsedMs;
  }
}

/**
 * Error de parsing: respuesta malformada o inesperada.
 * Ocurre cuando la API devuelve datos que no podemos interpretar.
 */
export class ParseError extends GeocodingError {
  public readonly rawResponse?: string;

  constructor(
    message: string,
    context: GeocodingErrorContext & { rawResponse?: string } = {}
  ) {
    super(message, 'PARSE_ERROR', context);
    this.name = 'ParseError';
    this.rawResponse = context.rawResponse?.substring(0, 500); // Limitar tamaño
  }
}


/**
 * Error sin resultados: la búsqueda no encontró coincidencias.
 * Diferente de error de red: la API funcionó pero no hay datos.
 */
export class NoResultsError extends GeocodingError {
  public readonly searchedSources: string[];

  constructor(
    message: string,
    searchedSources: string[] = [],
    context: GeocodingErrorContext = {}
  ) {
    super(message, 'NO_RESULTS', context);
    this.name = 'NoResultsError';
    this.searchedSources = searchedSources;
  }
}

/**
 * Error de ambigüedad: múltiples resultados sin poder resolver.
 * Ocurre cuando hay varios candidatos y no hay criterio claro.
 */
export class AmbiguousResultError extends GeocodingError {
  public readonly candidateCount: number;
  public readonly candidates?: Array<{ name: string; score?: number }>;

  constructor(
    message: string,
    candidateCount: number,
    context: GeocodingErrorContext & { 
      candidates?: Array<{ name: string; score?: number }> 
    } = {}
  ) {
    super(message, 'AMBIGUOUS_RESULT', context);
    this.name = 'AmbiguousResultError';
    this.candidateCount = candidateCount;
    this.candidates = context.candidates?.slice(0, 10); // Limitar a 10
  }
}

/**
 * Error de coordenada inválida: fuera de rango UTM30 ETRS89.
 * Válido para Andalucía: X ~100000-700000, Y ~3950000-4300000
 */
export class InvalidCoordinateError extends GeocodingError {
  public readonly coordinate: { x?: number; y?: number };
  public readonly validRanges: {
    x: { min: number; max: number };
    y: { min: number; max: number };
  };

  constructor(
    message: string,
    coordinate: { x?: number; y?: number },
    context: GeocodingErrorContext = {}
  ) {
    super(message, 'INVALID_COORDINATE', context);
    this.name = 'InvalidCoordinateError';
    this.coordinate = coordinate;
    // Rangos válidos para EPSG:25830 en Andalucía
    this.validRanges = {
      x: { min: 100000, max: 700000 },
      y: { min: 3950000, max: 4300000 }
    };
  }
}


// ============================================================================
// Utilidades
// ============================================================================

/** Type guard para verificar si un error es de geocodificación */
export function isGeocodingError(error: unknown): error is GeocodingError {
  return error instanceof GeocodingError;
}

/** Type guards específicos */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

export function isTimeoutError(error: unknown): error is TimeoutError {
  return error instanceof TimeoutError;
}

export function isParseError(error: unknown): error is ParseError {
  return error instanceof ParseError;
}

export function isNoResultsError(error: unknown): error is NoResultsError {
  return error instanceof NoResultsError;
}

export function isAmbiguousResultError(error: unknown): error is AmbiguousResultError {
  return error instanceof AmbiguousResultError;
}

export function isInvalidCoordinateError(error: unknown): error is InvalidCoordinateError {
  return error instanceof InvalidCoordinateError;
}

/**
 * Convierte un error genérico en GeocodingError apropiado.
 * Útil para wrappear errores de fetch u otras APIs.
 */
export function wrapError(
  error: unknown,
  context: GeocodingErrorContext = {}
): GeocodingError {
  if (isGeocodingError(error)) {
    return error;
  }

  if (error instanceof TypeError && error.message.includes('fetch')) {
    return new NetworkError(
      `Error de red: ${error.message}`,
      { ...context, originalError: error }
    );
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return new TimeoutError(
      'Petición cancelada por timeout',
      5000,
      { ...context, originalError: error }
    );
  }

  if (error instanceof Error) {
    return new GeocodingError(
      error.message,
      'UNKNOWN_ERROR',
      { ...context, originalError: error }
    );
  }

  return new GeocodingError(
    String(error),
    'UNKNOWN_ERROR',
    context
  );
}
