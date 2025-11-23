/**
 * PTEL Geocoding Services - Module Exports
 * Sistema de geocodificación multinivel con cascada inteligente
 */

// Orquestador principal de cascada
export { CascadeOrchestrator, cascadeOrchestrator } from './CascadeOrchestrator';
export type { CascadeResult, CascadeMetrics } from './CascadeOrchestrator';

// Geocodificadores especializados WFS (Fase 1)
export { WFSBaseGeocoder } from './specialized/WFSBaseGeocoder';
export { WFSHealthGeocoder } from './specialized/WFSHealthGeocoder';
export { WFSEducationGeocoder } from './specialized/WFSEducationGeocoder';
export { WFSCulturalGeocoder } from './specialized/WFSCulturalGeocoder';
export { WFSPoliceGeocoder } from './specialized/WFSPoliceGeocoder';

// Providers genéricos (Fase 2 - por implementar)
// export { CartoCiudadProvider } from './providers/CartoCiudadProvider';
// export { CDAUProvider } from './providers/CDAUProvider';
// export { IDEEProvider } from './providers/IDEEProvider';
// export { NominatimProvider } from './providers/NominatimProvider';
