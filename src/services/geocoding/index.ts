/**
 * Servicios de Geocodificación PTEL
 * 
 * Fase 1: Geocodificación Especializada por Tipología
 * 
 * @module services/geocoding
 */

// Orquestador principal
export { GeocodingOrchestrator, type OrchestrationOptions, type OrchestrationResult } from './GeocodingOrchestrator';

// Geocodificadores especializados
export * from './specialized';
