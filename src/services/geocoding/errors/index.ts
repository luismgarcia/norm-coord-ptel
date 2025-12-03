/**
 * Errores tipados para geocodificación
 * @module services/geocoding/errors
 */

export {
  // Clases de error
  GeocodingError,
  NetworkError,
  TimeoutError,
  ParseError,
  NoResultsError,
  AmbiguousResultError,
  InvalidCoordinateError,
  
  // Tipos
  type GeocodingErrorContext,
  
  // Type guards
  isGeocodingError,
  isNetworkError,
  isTimeoutError,
  isParseError,
  isNoResultsError,
  isAmbiguousResultError,
  isInvalidCoordinateError,
  
  // Utilidades
  wrapError
} from './GeocodingErrors';
