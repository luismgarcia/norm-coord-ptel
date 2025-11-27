/**
 * Geocodificadores genéricos (fallback)
 * 
 * Exporta geocodificadores de propósito general para uso cuando
 * los especializados WFS no encuentran resultado.
 * 
 * Orden de prioridad:
 * 1. CDAU (para Andalucía - mayor precisión)
 * 2. CartoCiudad (universal España)
 * 
 * @module services/geocoding/generic
 */

// CartoCiudad - Fallback universal España
export { CartoCiudadGeocoder, CartoCiudadMatchType } from './CartoCiudadGeocoder';
export type { CartoCiudadSearchOptions } from './CartoCiudadGeocoder';

// CDAU - Fallback específico Andalucía (preferido)
export { CDAUGeocoder } from './CDAUGeocoder';
export type { CDAUSearchOptions } from './CDAUGeocoder';
