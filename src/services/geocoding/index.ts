/**
 * Módulo de Geocodificación PTEL Andalucía
 * 
 * Exporta el orquestador principal y todos los geocodificadores
 * especializados y genéricos.
 * 
 * Cobertura por tipo:
 * - Especializados (WFS): Sanitarios, Educación, Cultural, Seguridad, Hidráulicas, Energía
 * - Genéricos (fallback): CDAU (Andalucía), CartoCiudad (España)
 * 
 * @module services/geocoding
 */

// Orquestador principal
export { 
  GeocodingOrchestrator,
  type OrchestrationOptions,
  type OrchestrationResult 
} from './GeocodingOrchestrator';

// Geocodificadores especializados WFS
export * from './specialized';

// Geocodificadores genéricos (fallback)
export * from './generic';
