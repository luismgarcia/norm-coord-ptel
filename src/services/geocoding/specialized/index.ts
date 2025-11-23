/**
 * Exportaciones centralizadas de geocodificadores especializados WFS
 * 
 * Fase 1 - Geocodificación por Tipología Especializada
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
