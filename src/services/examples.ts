/**
 * Ejemplos completos de uso del sistema de geocodificación tipológica PTEL
 * 
 * Demuestra:
 * 1. Clasificación tipológica automática (12 categorías)
 * 2. Geocodificación especializada por tipo (DERA, IAPH, ISE)
 * 3. Pipeline completo: clasificar → geocodificar → validar
 * 4. Batch processing para datasets completos
 * 5. Validación de coordenadas existentes
 * 
 * @module services/examples
 */

import { InfrastructureClassifier } from './classification/InfrastructureClassifier';
import { WFSHealthGeocoder } from './geocoding/specialized/WFSHealthGeocoder';
import { WFSEducationGeocoder } from './geocoding/specialized/WFSEducationGeocoder';
import { WFSCulturalGeocoder } from './geocoding/specialized/WFSCulturalGeocoder';
import { WFSPoliceGeocoder } from './geocoding/specialized/WFSPoliceGeocoder';
import { InfrastructureType } from '../types/infrastructure';

// ============================================================================
// EJEMPLO 1: Clasificación Tipológica Básica
// ============================================================================

/**
 * Demuestra clasificación automática de infraestructuras PTEL
 */
export async function exampleClassification() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('EJEMPLO 1: Clasificación Tipológica');
  console.log('═══════════════════════════════════════════════════════════\n');

  const classifier = new InfrastructureClassifier();

  // Infraestructuras de ejemplo de municipios andaluces reales
  const testNames = [
    'Centro de Salud San Antón',
    'CEIP Miguel Hernández',
    'IES Padre Suárez',
    'Comisaría Provincial de Granada',
    'Parque de Bomberos Norte',
    'Museo de la Alhambra',
    'Biblioteca Municipal Francisco Ayala',
    'Polideportivo Municipal Juan de la Cruz',
    'Ayuntamiento de Colomera',
    'Iglesia de Santa María la Mayor',
    'Gasolinera BP - Camino de Ronda',
    'Centro de Protección Civil'
  ];

  console.log('Clasificando 12 infraestructuras de ejemplo:\n');

  for (const name of testNames) {
    const result = classifier.classify(name);
    console.log(`📍 "${name}"`);
    console.log(`   → Tipo: ${result.type}`);
    console.log(`   → Confianza: ${result.confidence}`);
    console.log(`   → Keywords: ${result.keywords.join(', ')}\n`);
  }

  console.log('✅ Clasificación completada\n');
}

// ============================================================================
// EJEMPLO 2: Geocodificación Sanitaria Especializada
// ============================================================================

/**
 * Demuestra geocodificación de centros sanitarios vía WFS DERA G12
 */
export async function exampleHealthGeocoding() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('EJEMPLO 2: Geocodificación Sanitaria (DERA G12)');
  console.log('═══════════════════════════════════════════════════════════\n');

  const geocoder = new WFSHealthGeocoder();

  // Centros sanitarios reales de Granada
  const healthCenters = [
    { name: 'Centro de Salud Zaidín', municipality: 'Granada', province: 'Granada' },
    { name: 'Hospital Virgen de las Nieves', municipality: 'Granada', province: 'Granada' },
    { name: 'Consultorio La Zubia', municipality: 'La Zubia', province: 'Granada' }
  ];

  console.log('Geocodificando 3 centros sanitarios de Granada:\n');

  for (const center of healthCenters) {
    console.log(`🏥 Buscando: "${center.name}"...`);
    
    try {
      const result = await geocoder.geocodeWithAutoLayer(center);
      
      if (result) {
        console.log(`   ✅ ENCONTRADO`);
        console.log(`   → Match: "${result.matchedName}"`);
        console.log(`   → X: ${result.x.toFixed(2)} m`);
        console.log(`   → Y: ${result.y.toFixed(2)} m`);
        console.log(`   → Confianza: ${result.confidence}%`);
        console.log(`   → Fuente: ${result.source}`);
        console.log(`   → Fuzzy Score: ${(result.fuzzyScore * 100).toFixed(1)}%`);
      } else {
        console.log(`   ❌ No encontrado en DERA G12`);
      }
    } catch (error) {
      console.error(`   ⚠️ Error: ${error}`);
    }
    
    console.log('');
  }

  console.log('✅ Geocodificación sanitaria completada\n');
}

// ============================================================================
// EJEMPLO 3: Geocodificación Educativa Especializada
// ============================================================================

/**
 * Demuestra geocodificación de centros educativos vía WFS DERA G13
 */
export async function exampleEducationGeocoding() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('EJEMPLO 3: Geocodificación Educativa (DERA G13)');
  console.log('═══════════════════════════════════════════════════════════\n');

  const geocoder = new WFSEducationGeocoder();

  // Centros educativos reales de Granada
  const educationCenters = [
    { name: 'CEIP Miguel Hernández', municipality: 'Granada', province: 'Granada' },
    { name: 'IES Padre Suárez', municipality: 'Granada', province: 'Granada' },
    { name: 'Escuela Infantil Los Cármenes', municipality: 'Granada', province: 'Granada' }
  ];

  console.log('Geocodificando 3 centros educativos de Granada:\n');

  for (const center of educationCenters) {
    console.log(`🏫 Buscando: "${center.name}"...`);
    
    try {
      const result = await geocoder.geocodeWithAutoLayer(center);
      
      if (result) {
        console.log(`   ✅ ENCONTRADO`);
        console.log(`   → Match: "${result.matchedName}"`);
        console.log(`   → X: ${result.x.toFixed(2)} m`);
        console.log(`   → Y: ${result.y.toFixed(2)} m`);
        console.log(`   → Confianza: ${result.confidence}%`);
      } else {
        console.log(`   ❌ No encontrado en DERA G13`);
      }
    } catch (error) {
      console.error(`   ⚠️ Error: ${error}`);
    }
    
    console.log('');
  }

  console.log('✅ Geocodificación educativa completada\n');
}

// ============================================================================
// EJEMPLO 4: Geocodificación Cultural Especializada
// ============================================================================

/**
 * Demuestra geocodificación de infraestructuras culturales vía WFS IAPH
 */
export async function exampleCulturalGeocoding() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('EJEMPLO 4: Geocodificación Cultural (IAPH)');
  console.log('═══════════════════════════════════════════════════════════\n');

  const geocoder = new WFSCulturalGeocoder();

  // Infraestructuras culturales reales de Granada
  const culturalSites = [
    { name: 'Museo de la Alhambra', municipality: 'Granada', province: 'Granada' },
    { name: 'Biblioteca Provincial', municipality: 'Granada', province: 'Granada' },
    { name: 'Teatro Isabel la Católica', municipality: 'Granada', province: 'Granada' }
  ];

  console.log('Geocodificando 3 infraestructuras culturales de Granada:\n');

  for (const site of culturalSites) {
    console.log(`🏛️ Buscando: "${site.name}"...`);
    
    try {
      const result = await geocoder.geocodeWithAutoLayer(site);
      
      if (result) {
        console.log(`   ✅ ENCONTRADO`);
        console.log(`   → Match: "${result.matchedName}"`);
        console.log(`   → X: ${result.x.toFixed(2)} m`);
        console.log(`   → Y: ${result.y.toFixed(2)} m`);
        console.log(`   → Confianza: ${result.confidence}%`);
      } else {
        console.log(`   ❌ No encontrado en IAPH`);
      }
    } catch (error) {
      console.error(`   ⚠️ Error: ${error}`);
    }
    
    console.log('');
  }

  console.log('✅ Geocodificación cultural completada\n');
}

// ============================================================================
// EJEMPLO 5: Geocodificación Policial Especializada
// ============================================================================

/**
 * Demuestra geocodificación de infraestructuras policiales vía WFS DERA G16
 */
export async function examplePoliceGeocoding() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('EJEMPLO 5: Geocodificación Policial (DERA G16)');
  console.log('═══════════════════════════════════════════════════════════\n');

  const geocoder = new WFSPoliceGeocoder();

  // Infraestructuras policiales reales
  const policeFacilities = [
    { name: 'Comisaría Provincial de Granada', municipality: 'Granada', province: 'Granada' },
    { name: 'Cuartel Guardia Civil Colomera', municipality: 'Colomera', province: 'Granada' },
    { name: 'Policía Local Granada', municipality: 'Granada', province: 'Granada' }
  ];

  console.log('Geocodificando 3 infraestructuras policiales:\n');

  for (const facility of policeFacilities) {
    console.log(`🚔 Buscando: "${facility.name}"...`);
    
    try {
      const result = await geocoder.geocodeWithAutoLayer(facility);
      
      if (result) {
        console.log(`   ✅ ENCONTRADO`);
        console.log(`   → Match: "${result.matchedName}"`);
        console.log(`   → X: ${result.x.toFixed(2)} m`);
        console.log(`   → Y: ${result.y.toFixed(2)} m`);
        console.log(`   → Confianza: ${result.confidence}%`);
      } else {
        console.log(`   ❌ No encontrado en DERA G16`);
      }
    } catch (error) {
      console.error(`   ⚠️ Error: ${error}`);
    }
    
    console.log('');
  }

  console.log('✅ Geocodificación policial completada\n');
}

// ============================================================================
// EJEMPLO 6: Pipeline Completo (Clasificar → Geocodificar)
// ============================================================================

/**
 * Pipeline completo: clasificación tipológica + geocodificación especializada
 */
export async function exampleCompletePipeline() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('EJEMPLO 6: Pipeline Completo (Clasificar → Geocodificar)');
  console.log('═══════════════════════════════════════════════════════════\n');

  const classifier = new InfrastructureClassifier();
  const healthGeocoder = new WFSHealthGeocoder();
  const educationGeocoder = new WFSEducationGeocoder();
  const culturalGeocoder = new WFSCulturalGeocoder();
  const policeGeocoder = new WFSPoliceGeocoder();

  // Dataset mixto de infraestructuras PTEL
  const infrastructure = [
    { name: 'Centro de Salud Zaidín', municipality: 'Granada', province: 'Granada' },
    { name: 'CEIP Federico García Lorca', municipality: 'Granada', province: 'Granada' },
    { name: 'Museo Casa de los Tiros', municipality: 'Granada', province: 'Granada' },
    { name: 'Comisaría Provincial', municipality: 'Granada', province: 'Granada' }
  ];

  console.log('Procesando 4 infraestructuras con pipeline completo:\n');

  for (const infra of infrastructure) {
    console.log(`📍 "${infra.name}"`);
    
    // PASO 1: Clasificar
    const classification = classifier.classify(infra.name);
    console.log(`   1️⃣ Clasificación: ${classification.type} (${classification.confidence})`);
    
    // PASO 2: Geocodificar según tipo
    try {
      let result = null;
      
      switch (classification.type) {
        case InfrastructureType.HEALTH:
          result = await healthGeocoder.geocodeWithAutoLayer(infra);
          break;
        case InfrastructureType.EDUCATION:
          result = await educationGeocoder.geocodeWithAutoLayer(infra);
          break;
        case InfrastructureType.CULTURAL:
          result = await culturalGeocoder.geocodeWithAutoLayer(infra);
          break;
        case InfrastructureType.POLICE:
          result = await policeGeocoder.geocodeWithAutoLayer(infra);
          break;
        default:
          console.log(`   2️⃣ Geocodificación: GENÉRICA (sin geocoder especializado)`);
          console.log('');
          continue;
      }
      
      if (result) {
        console.log(`   2️⃣ Geocodificación: ✅ ÉXITO`);
        console.log(`      → X: ${result.x.toFixed(2)} | Y: ${result.y.toFixed(2)}`);
        console.log(`      → Confianza: ${result.confidence}%`);
        console.log(`      → Fuente: ${result.source}`);
        console.log(`   3️⃣ Mejora: ±100-500m (genérico) → ±2-15m (especializado) 🎯`);
      } else {
        console.log(`   2️⃣ Geocodificación: ❌ FALLBACK a genérico necesario`);
      }
    } catch (error) {
      console.error(`   ⚠️ Error en geocodificación: ${error}`);
    }
    
    console.log('');
  }

  console.log('✅ Pipeline completo finalizado\n');
}

// ============================================================================
// EJEMPLO 7: Estadísticas de Clasificación por Dataset
// ============================================================================

/**
 * Analiza distribución tipológica de un dataset PTEL completo
 */
export async function exampleClassificationStats() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('EJEMPLO 7: Estadísticas de Dataset PTEL');
  console.log('═══════════════════════════════════════════════════════════\n');

  const classifier = new InfrastructureClassifier();

  // Dataset simulado (típico de municipio mediano ~20k habitantes)
  const dataset = [
    'Centro de Salud Municipal', 'Consultorio Médico Barrio Alto',
    'CEIP San José', 'CEIP Virgen del Carmen', 'IES Juan Ramón Jiménez',
    'Guardería Municipal Los Pequeños',
    'Biblioteca Municipal', 'Casa de la Cultura', 'Teatro Municipal',
    'Museo Etnológico',
    'Iglesia Parroquial', 'Ermita San Sebastián',
    'Polideportivo Municipal', 'Campo de Fútbol',
    'Ayuntamiento', 'Oficina de Información',
    'Centro Social de Mayores', 'Residencia de Ancianos',
    'Cuartel Guardia Civil', 'Policía Local',
    'Parque de Bomberos Comarcal',
    'Gasolinera Repsol', 'Estación de Servicio BP'
  ];

  console.log(`Analizando dataset de ${dataset.length} infraestructuras:\n`);

  const stats = classifier.getClassificationStats(dataset);

  // Ordenar por frecuencia
  const sorted = Object.entries(stats)
    .sort((a, b) => b[1] - a[1]);

  console.log('Distribución por tipo y confianza:\n');
  for (const [key, count] of sorted) {
    const percentage = ((count / dataset.length) * 100).toFixed(1);
    const bar = '█'.repeat(Math.round(count / 2));
    console.log(`${key.padEnd(25)} ${bar} ${count} (${percentage}%)`);
  }

  // Calcular cobertura de geocodificación especializada
  const specializedTypes = [
    InfrastructureType.HEALTH,
    InfrastructureType.EDUCATION,
    InfrastructureType.CULTURAL,
    InfrastructureType.POLICE
  ];

  const specializedCount = dataset.filter(name => {
    const result = classifier.classify(name);
    return specializedTypes.includes(result.type as InfrastructureType);
  }).length;

  const coverage = ((specializedCount / dataset.length) * 100).toFixed(1);

  console.log('\n───────────────────────────────────────────────────────────');
  console.log(`Cobertura geocodificación especializada: ${specializedCount}/${dataset.length} (${coverage}%)`);
  console.log(`Geocodificación genérica necesaria: ${dataset.length - specializedCount}/${dataset.length} (${(100 - parseFloat(coverage)).toFixed(1)}%)`);
  console.log('───────────────────────────────────────────────────────────\n');

  console.log('✅ Análisis estadístico completado\n');
}

// ============================================================================
// EJEMPLO 8: Validación de Coordenadas Existentes
// ============================================================================

/**
 * Valida coordenadas existentes en PTEL contra bases de datos oficiales
 */
export async function exampleCoordinateValidation() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('EJEMPLO 8: Validación de Coordenadas Existentes');
  console.log('═══════════════════════════════════════════════════════════\n');

  const healthGeocoder = new WFSHealthGeocoder();

  // Coordenadas existentes en PTEL (simuladas)
  const existingCoords = [
    { name: 'Centro de Salud Zaidín', x: 447234.56, y: 4112876.23 },
    { name: 'Hospital Virgen Nieves', x: 446890.12, y: 4113450.67 },
    { name: 'Consultorio La Zubia', x: 449123.45, y: 4108234.89 }
  ];

  console.log('Validando 3 coordenadas contra DERA G12 sanitarios:\n');

  for (const coord of existingCoords) {
    console.log(`📍 "${coord.name}"`);
    console.log(`   Coordenadas actuales: X=${coord.x} | Y=${coord.y}`);
    
    try {
      const nearest = await healthGeocoder.validateCoordinates(coord.x, coord.y, 500);
      
      if (nearest) {
        const distance = Math.sqrt(
          Math.pow(nearest.x - coord.x, 2) + Math.pow(nearest.y - coord.y, 2)
        );
        
        console.log(`   ✅ Centro oficial encontrado a ${distance.toFixed(1)}m`);
        console.log(`   → Nombre oficial: "${nearest.name}"`);
        console.log(`   → Coordenadas oficiales: X=${nearest.x.toFixed(2)} | Y=${nearest.y.toFixed(2)}`);
        
        if (distance < 25) {
          console.log(`   → ✅ VALIDACIÓN: Coordenadas muy precisas (<25m)`);
        } else if (distance < 100) {
          console.log(`   → ⚠️ SUGERENCIA: Considerar actualizar (25-100m diferencia)`);
        } else {
          console.log(`   → ❌ ALERTA: Gran diferencia (>100m) - verificar datos`);
        }
      } else {
        console.log(`   ❌ No se encontró centro oficial cercano (radio 500m)`);
      }
    } catch (error) {
      console.error(`   ⚠️ Error: ${error}`);
    }
    
    console.log('');
  }

  console.log('✅ Validación completada\n');
}

// ============================================================================
// EJECUTOR DE TODOS LOS EJEMPLOS
// ============================================================================

/**
 * Ejecuta todos los ejemplos en secuencia
 */
export async function runAllExamples() {
  console.log('\n🚀 INICIANDO SUITE COMPLETA DE EJEMPLOS PTEL\n');
  console.log('Tiempo estimado: 3-5 minutos (incluye peticiones WFS)\n');
  
  const startTime = Date.now();

  // Ejemplos síncronos (rápidos)
  await exampleClassification();
  await exampleClassificationStats();

  // Ejemplos con peticiones WFS (más lentos)
  console.log('⏳ Iniciando ejemplos con peticiones WFS (pueden tardar)...\n');
  
  await exampleHealthGeocoding();
  await exampleEducationGeocoding();
  await exampleCulturalGeocoding();
  await examplePoliceGeocoding();
  await exampleCompletePipeline();
  await exampleCoordinateValidation();

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(1);

  console.log('═══════════════════════════════════════════════════════════');
  console.log(`✅ TODOS LOS EJEMPLOS COMPLETADOS EN ${duration}s`);
  console.log('═══════════════════════════════════════════════════════════\n');
}
