/**
 * Exportaciones centralizadas de geocodificadores especializados WFS
 * 
 * Fase 1 - Geocodificación por Tipología Especializada
 * Fase A - Alta Prioridad (REDIAM Hidráulicas, Agencia Energía)
 * 
 * @module services/geocoding/specialized
 */

// Clase base
export { WFSBaseGeocoder, type WFSFeature, type WFSSearchOptions } from './WFSBaseGeocoder';

// Geocodificador Sanitarios (1,500+ centros)
export { 
  WFSHealthGeocoder, 
  HealthFacilityType,
  type HealthSearchOptions 
} from './WFSHealthGeocoder';

// Geocodificador Educación (3,800+ centros)
export {
  WFSEducationGeocoder,
  EducationFacilityType,
  type EducationSearchOptions
} from './WFSEducationGeocoder';

// Geocodificador Cultural (7,000+ sitios)
export {
  WFSCulturalGeocoder,
  CulturalFacilityType,
  type CulturalSearchOptions
} from './WFSCulturalGeocoder';

// Geocodificador Seguridad (250+ instalaciones)
export {
  WFSSecurityGeocoder,
  SecurityFacilityType,
  type SecuritySearchOptions
} from './WFSSecurityGeocoder';

// Geocodificador Hidráulicas - NUEVO Fase A (4,400+ infraestructuras)
export {
  WFSHydraulicGeocoder,
  HydraulicFacilityType,
  type HydraulicSearchOptions
} from './WFSHydraulicGeocoder';

// Geocodificador Energía - NUEVO Fase A (500+ instalaciones)
export {
  WFSEnergyGeocoder,
  EnergyFacilityType,
  type EnergySearchOptions
} from './WFSEnergyGeocoder';
