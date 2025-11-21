/**
 * Ejemplos de uso del sistema de geocodificación tipológica - Fase 1
 * 
 * Este archivo demuestra el flujo completo:
 * 1. Clasificación tipológica de infraestructuras
 * 2. Geocodificación especializada por tipología
 * 3. Validación de resultados
 * 
 * @module services/examples
 */

import { InfrastructureClassifier } from '../classification/InfrastructureClassifier';
import { WFSHealthGeocoder } from '../geocoding/specialized/WFSHealthGeocoder';
import { InfrastructureType } from '../../types/infrastructure';

/**
 * Ejemplo 1: Clasificación tipológica básica
 */
export async function exampleClassification() {
  console.log('=== EJEMPLO 1: CLASIFICACIÓN TIPOLÓGICA ===\n');

  const classifier = new InfrastructureClassifier();

  // Casos reales de documentos PTEL Granada/Almería
  const testCases = [
    'Centro de Salud San Antón',
    'CEIP Miguel Hernández',
    'Comisaría de Policía Nacional',
    'Parque de Bomberos',
    'Iglesia Parroquial de San Pedro',
    'Ayuntamiento de Colomera',
    'Polideportivo Municipal',
    'Hospital Virgen de las Nieves',
    'Consultorio Médico Local',
    'Guardia Civil - Puesto de Dúrcal'
  ];

  testCases.forEach(name => {
    const result = classifier.classify(name);
    console.log(`📍 "${name}"`);
    console.log(`   → Tipo: ${result.type}`);
    console.log(`   → Confianza: ${result.confidence}`);
    console.log(`   → Keywords: ${result.keywords.join(', ')}\n`);
  });
}

/**
 * Ejemplo 2: Geocodificación especializada de centros sanitarios
 */
export async function exampleHealthGeocoding() {
  console.log('=== EJEMPLO 2: GEOCODIFICACIÓN SANITARIA ===\n');

  const geocoder = new WFSHealthGeocoder();

  // Casos reales de PTEL Granada
  const healthFacilities = [
    {
      name: 'Centro de Salud San Antón',
      municipality: 'Granada',
      province: 'Granada'
    },
    {
      name: 'Hospital Virgen de las Nieves',
      municipality: 'Granada',
      province: 'Granada'
    },
    {
      name: 'Consultorio de Colomera',
      municipality: 'Colomera',
      province: 'Granada'
    }
  ];

  for (const facility of healthFacilities) {
    try {
      console.log(`🏥 Geocodificando: ${facility.name}`);
      console.log(`   Municipio: ${facility.municipality}\n`);

      const result = await geocoder.geocodeWithAutoLayer(facility);

      if (result) {
        console.log(`   ✅ ÉXITO`);
        console.log(`   📊 Confianza: ${result.confidence}%`);
        console.log(`   📍 Coordenadas UTM30:`);
        console.log(`      X: ${result.x.toFixed(2)}`);
        console.log(`      Y: ${result.y.toFixed(2)}`);
        console.log(`   🎯 Match: ${result.matchedName}`);
        console.log(`   🔍 Fuzzy Score: ${(result.fuzzyScore * 100).toFixed(1)}%`);
        console.log(`   📦 Fuente: ${result.source}`);
        if (result.address) {
          console.log(`   📮 Dirección: ${result.address}`);
        }
      } else {
        console.log(`   ❌ NO ENCONTRADO`);
        console.log(`   → Intentar con geocodificación genérica`);
      }

      console.log('\n' + '─'.repeat(60) + '\n');

    } catch (error) {
      console.error(`   ❌ ERROR: ${error}`);
    }
  }
}

/**
 * Ejemplo 3: Pipeline completo (Clasificación → Geocodificación)
 */
export async function exampleCompletePipeline() {
  console.log('=== EJEMPLO 3: PIPELINE COMPLETO ===\n');

  const classifier = new InfrastructureClassifier();
  const healthGeocoder = new WFSHealthGeocoder();

  // Infraestructura de entrada (como vendría del CSV PTEL)
  const infrastructure = {
    nombre: 'Centro Salud La Esperanza',
    municipio: 'Granada',
    provincia: 'Granada',
    coordenadas_originales: '' // Vacías o corruptas
  };

  console.log(`📋 Procesando: ${infrastructure.nombre}\n`);

  // Paso 1: Clasificar tipología
  const classification = classifier.classify(infrastructure.nombre);
  console.log(`1️⃣ CLASIFICACIÓN`);
  console.log(`   Tipo detectado: ${classification.type}`);
  console.log(`   Confianza: ${classification.confidence}\n`);

  // Paso 2: Seleccionar geocodificador apropiado
  if (classification.type === InfrastructureType.HEALTH) {
    console.log(`2️⃣ GEOCODIFICACIÓN ESPECIALIZADA (Sanitarios)`);
    
    const result = await healthGeocoder.geocodeWithAutoLayer({
      name: infrastructure.nombre,
      municipality: infrastructure.municipio,
      province: infrastructure.provincia
    });

    if (result) {
      console.log(`   ✅ Geocodificación exitosa`);
      console.log(`   📍 Coordenadas mejoradas:`);
      console.log(`      X: ${result.x.toFixed(2)} (EPSG:25830)`);
      console.log(`      Y: ${result.y.toFixed(2)} (EPSG:25830)`);
      console.log(`   📊 Calidad: ${result.confidence}/100`);
      console.log(`   🎯 Match oficial SAS: ${result.matchedName}`);
      
      // Comparar con coordenadas originales si existieran
      console.log(`\n   💡 MEJORA:`);
      console.log(`      Antes: Sin coordenadas / coordenadas corruptas`);
      console.log(`      Ahora: Coordenadas oficiales SAS ±2-10m`);
    } else {
      console.log(`   ⚠️ No encontrado en base de datos oficial`);
      console.log(`   → Escalando a geocodificación genérica...`);
    }
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

/**
 * Ejemplo 4: Estadísticas de clasificación para un dataset
 */
export function exampleClassificationStats() {
  console.log('=== EJEMPLO 4: ESTADÍSTICAS DE DATASET ===\n');

  const classifier = new InfrastructureClassifier();

  // Simulación de 50 infraestructuras de un PTEL real
  const datasetSample = [
    'Centro de Salud', 'Centro de Salud', 'Centro de Salud',
    'CEIP', 'CEIP', 'IES', 'IES',
    'Comisaría', 'Cuartel Guardia Civil',
    'Parque Bomberos',
    'Iglesia', 'Iglesia', 'Ermita',
    'Ayuntamiento',
    'Polideportivo', 'Polideportivo',
    'Gasolinera', 'Gasolinera',
    'Depósito agua', 'Transformador eléctrico' // Genéricos
  ];

  const stats = classifier.getClassificationStats(datasetSample);

  console.log('📊 Distribución tipológica:');
  console.log(JSON.stringify(stats, null, 2));

  // Calcular cobertura de geocodificación especializada
  const total = datasetSample.length;
  const specialized = Object.entries(stats)
    .filter(([key]) => !key.includes('GENERICO'))
    .reduce((sum, [, count]) => sum + count, 0);

  const coverage = (specialized / total * 100).toFixed(1);

  console.log(`\n📈 COBERTURA GEOCODIFICACIÓN ESPECIALIZADA:`);
  console.log(`   ${specialized}/${total} infraestructuras (${coverage}%)`);
  console.log(`   → ${specialized} usarán WFS especializado (precisión ±2-10m)`);
  console.log(`   → ${total - specialized} usarán geocodificación genérica`);
}

/**
 * Ejemplo 5: Validación de coordenadas existentes
 */
export async function exampleCoordinateValidation() {
  console.log('=== EJEMPLO 5: VALIDACIÓN DE COORDENADAS ===\n');

  const geocoder = new WFSHealthGeocoder();

  // Coordenadas de ejemplo (Centro Granada aprox)
  const testCoordinates = {
    x: 447180, // UTM30 X
    y: 4112820, // UTM30 Y
    description: 'Coordenadas de CSV PTEL (posiblemente imprecisas)'
  };

  console.log(`📍 Validando coordenadas:`);
  console.log(`   X: ${testCoordinates.x}`);
  console.log(`   Y: ${testCoordinates.y}\n`);

  const nearest = await geocoder.validateCoordinates(
    testCoordinates.x,
    testCoordinates.y,
    500 // Radio 500m
  );

  if (nearest) {
    console.log(`✅ Centro sanitario oficial encontrado a <500m:`);
    console.log(`   🏥 ${nearest.name}`);
    console.log(`   📍 Coordenadas oficiales:`);
    console.log(`      X: ${nearest.x.toFixed(2)}`);
    console.log(`      Y: ${nearest.y.toFixed(2)}`);
    
    const distance = Math.sqrt(
      Math.pow(nearest.x - testCoordinates.x, 2) + 
      Math.pow(nearest.y - testCoordinates.y, 2)
    );
    console.log(`   📏 Distancia: ${distance.toFixed(1)}m`);
    
    if (distance > 50) {
      console.log(`   ⚠️ CORRECCIÓN RECOMENDADA (distancia >${distance.toFixed(0)}m)`);
    } else {
      console.log(`   ✅ Coordenadas validadas (distancia <50m)`);
    }
  } else {
    console.log(`❌ No hay centros sanitarios oficiales en radio 500m`);
    console.log(`   → Coordenadas podrían ser incorrectas`);
  }
}

// Ejecutar todos los ejemplos si se corre el archivo directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    await exampleClassification();
    await exampleHealthGeocoding();
    await exampleCompletePipeline();
    exampleClassificationStats();
    await exampleCoordinateValidation();
  })();
}
