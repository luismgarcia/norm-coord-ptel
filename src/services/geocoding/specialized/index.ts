/**
 * Exportaciones centralizadas de geocodificadores especializados WFS
 * 
 * Fase 1 - Geocodificación por Tipología Especializada
 * Fase A - Alta Prioridad (REDIAM Hidráulicas, Agencia Energía)
 * Fase B - Topónimos, Deportes, OSM (NGA, IAID, Overpass)
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

// Geocodificador Hidráulicas - Fase A (4,400+ infraestructuras)
export {
  WFSHydraulicGeocoder,
  HydraulicFacilityType,
  type HydraulicSearchOptions
} from './WFSHydraulicGeocoder';

// Geocodificador Energía - Fase A (500+ instalaciones)
export {
  WFSEnergyGeocoder,
  EnergyFacilityType,
  type EnergySearchOptions
} from './WFSEnergyGeocoder';

// ============================================
// FASE B - Nuevos Geocodificadores Nov 2025
// ============================================

// Geocodificador NGA - Nomenclátor Geográfico Andalucía (232,000+ topónimos)
// CRÍTICO para: parajes, cerros, eras, cortijos, arroyos
export {
  NGAGeocoder,
  ToponymType,
  type NGASearchOptions
} from './NGAGeocoder';

// Geocodificador IAID - Instalaciones Deportivas (3,500+ instalaciones)
// CRÍTICO para: piscinas, campos de fútbol, polideportivos
export {
  IAIDGeocoder,
  SportsFacilityType,
  type IAIDSearchOptions
} from './IAIDGeocoder';

// Geocodificador Overpass/OSM - OpenStreetMap
// CRÍTICO para: antenas telecomunicaciones, industrias, equipamientos varios
export {
  OverpassGeocoder,
  type OSMElement,
  type OverpassSearchOptions
} from './OverpassGeocoder';
