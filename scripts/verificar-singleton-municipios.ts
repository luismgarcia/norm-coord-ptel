/**
 * Script de verificación - Detección Singleton con Municipios Reales
 * F023 Fase 1 - Tarea final de validación
 * 
 * Municipios de prueba:
 * - Quéntar (18160): ~2 centros de salud
 * - Colomera (18048): ~2 centros de salud
 * 
 * Ejecutar: npx tsx scripts/verificar-singleton-municipios.ts
 */

import { LocalDataService } from '../src/lib/LocalDataService';

// Municipios de prueba
const MUNICIPIOS_TEST = [
  { codMun: '18160', nombre: 'Quéntar' },
  { codMun: '18048', nombre: 'Colomera' },
  { codMun: '04088', nombre: 'Tíjola' },
  { codMun: '18044', nombre: 'Castril' }
];

// Tipologías a verificar
const TIPOLOGIAS = ['health', 'education', 'security', 'admin'];

async function verificarSingleton() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  VERIFICACIÓN SINGLETON - F023 Fase 1');
  console.log('  Fecha:', new Date().toISOString());
  console.log('═══════════════════════════════════════════════════════════\n');

  const service = LocalDataService.getInstance();
  
  // Esperar inicialización
  console.log('⏳ Inicializando LocalDataService...\n');
  await new Promise(resolve => setTimeout(resolve, 1000));

  const resultados: Array<{
    municipio: string;
    codMun: string;
    tipologia: string;
    count: number;
    esSingleton: boolean;
    feature?: any;
  }> = [];

  for (const mun of MUNICIPIOS_TEST) {
    console.log(`\n📍 MUNICIPIO: ${mun.nombre} (${mun.codMun})`);
    console.log('─'.repeat(50));

    for (const tipo of TIPOLOGIAS) {
      try {
        const count = await service.countByType(tipo, mun.codMun);
        const esSingleton = count === 1;
        
        let feature = null;
        if (esSingleton) {
          feature = await service.getUniqueByType(tipo, mun.codMun);
        }

        resultados.push({
          municipio: mun.nombre,
          codMun: mun.codMun,
          tipologia: tipo,
          count,
          esSingleton,
          feature: feature ? {
            nombre: feature.properties?.nombre || 'N/A',
            x: feature.geometry?.coordinates?.[0],
            y: feature.geometry?.coordinates?.[1]
          } : undefined
        });

        const icono = esSingleton ? '✅' : count === 0 ? '⚪' : '🔢';
        console.log(`  ${icono} ${tipo.toUpperCase().padEnd(12)} → ${count} registro(s) ${esSingleton ? '(SINGLETON)' : ''}`);
        
        if (feature) {
          console.log(`     └─ ${feature.properties?.nombre || 'Sin nombre'}`);
        }
      } catch (error) {
        console.log(`  ❌ ${tipo.toUpperCase().padEnd(12)} → Error: ${error}`);
        resultados.push({
          municipio: mun.nombre,
          codMun: mun.codMun,
          tipologia: tipo,
          count: -1,
          esSingleton: false
        });
      }
    }
  }

  // Resumen
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('  RESUMEN DE VERIFICACIÓN');
  console.log('═══════════════════════════════════════════════════════════\n');

  const singletons = resultados.filter(r => r.esSingleton);
  const multiples = resultados.filter(r => r.count > 1);
  const vacios = resultados.filter(r => r.count === 0);
  const errores = resultados.filter(r => r.count === -1);

  console.log(`  Singletons encontrados: ${singletons.length}`);
  console.log(`  Múltiples candidatos:   ${multiples.length}`);
  console.log(`  Sin datos locales:      ${vacios.length}`);
  console.log(`  Errores:                ${errores.length}`);
  
  console.log('\n📊 Detalle Singletons:');
  for (const s of singletons) {
    console.log(`  • ${s.municipio}/${s.tipologia}: ${s.feature?.nombre || 'N/A'}`);
  }

  console.log('\n📊 Detalle Múltiples (requieren desambiguación):');
  for (const m of multiples) {
    console.log(`  • ${m.municipio}/${m.tipologia}: ${m.count} candidatos`);
  }

  // Conclusión
  console.log('\n═══════════════════════════════════════════════════════════');
  if (errores.length === 0) {
    console.log('  ✅ VERIFICACIÓN COMPLETADA - Sin errores');
  } else {
    console.log('  ⚠️ VERIFICACIÓN CON ERRORES - Revisar conexión a datos');
  }
  console.log('═══════════════════════════════════════════════════════════\n');

  return { resultados, singletons, multiples, vacios, errores };
}

// Ejecutar
verificarSingleton()
  .then(result => {
    console.log('Script completado.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
