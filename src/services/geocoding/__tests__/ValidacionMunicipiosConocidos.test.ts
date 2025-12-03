/**
 * Test de Validación - F023 Fase 1.1
 * 
 * NOTA: Estos tests requieren datos DERA reales cargados.
 * Están marcados como .skip para CI/CD.
 * Para ejecutar localmente con datos reales:
 *   1. Cargar datos DERA en LocalDataService
 *   2. Cambiar describe.skip → describe
 * 
 * Verificar municipios conocidos con datos DERA reales:
 * - Quéntar (18160): 2 centros de salud → debe usar desambiguación
 * - Colomera (18048): 2 centros de salud → debe usar desambiguación
 * 
 * @date 2025-12-03
 */

import { describe, it, expect } from 'vitest';
import { 
  countByType, 
  getFeaturesByMunicipio,
  getUniqueByType 
} from '../../../lib/LocalDataService';

// SKIPPED: Requiere datos DERA reales (no disponibles en CI/CD)
describe.skip('F023 Fase 1.1 - Validación Municipios Conocidos', () => {
  
  describe('Quéntar (18160)', () => {
    
    it('debe tener exactamente 2 centros de salud en DERA', async () => {
      const count = await countByType('SANITARIO', '18160');
      console.log(`\n📍 QUÉNTAR (18160): ${count} centros de salud`);
      
      // Esperamos 2 según documentación del proyecto
      expect(count).toBe(2);
    });
    
    it('getUniqueByType debe retornar null (no es singleton)', async () => {
      const unique = await getUniqueByType('SANITARIO', '18160');
      
      // Con 2 centros, no debe retornar singleton
      expect(unique).toBeNull();
    });
    
    it('getFeaturesByMunicipio debe retornar los 2 centros', async () => {
      const features = await getFeaturesByMunicipio('18160', ['health']);
      
      console.log('  Features encontradas:');
      features.forEach(f => console.log(`    - ${f.nombre}`));
      
      expect(features.length).toBe(2);
    });
    
  });
  
  describe('Colomera (18048)', () => {
    
    it('debe tener exactamente 2 centros de salud en DERA', async () => {
      const count = await countByType('SANITARIO', '18048');
      console.log(`\n📍 COLOMERA (18048): ${count} centros de salud`);
      
      // Esperamos 2 según documentación del proyecto
      expect(count).toBe(2);
    });
    
    it('getUniqueByType debe retornar null (no es singleton)', async () => {
      const unique = await getUniqueByType('SANITARIO', '18048');
      
      // Con 2 centros, no debe retornar singleton
      expect(unique).toBeNull();
    });
    
    it('getFeaturesByMunicipio debe retornar los 2 centros', async () => {
      const features = await getFeaturesByMunicipio('18048', ['health']);
      
      console.log('  Features encontradas:');
      features.forEach(f => console.log(`    - ${f.nombre}`));
      
      expect(features.length).toBe(2);
    });
    
  });
  
  describe('Comparativa: Municipio con 1 solo centro (singleton)', () => {
    
    it('buscar municipio con exactamente 1 centro de salud', async () => {
      // Probar algunos municipios pequeños de Granada
      const municipiosPrueba = [
        { cod: '18001', nombre: 'Agrón' },
        { cod: '18006', nombre: 'Albuñuelas' },
        { cod: '18017', nombre: 'Beas de Granada' },
      ];
      
      let singletonEncontrado = false;
      
      for (const mun of municipiosPrueba) {
        const count = await countByType('SANITARIO', mun.cod);
        if (count === 1) {
          console.log(`\n✅ SINGLETON encontrado: ${mun.nombre} (${mun.cod}) - 1 centro`);
          
          const unique = await getUniqueByType('SANITARIO', mun.cod);
          expect(unique).not.toBeNull();
          console.log(`   Nombre: ${unique?.nombre}`);
          
          singletonEncontrado = true;
          break;
        }
      }
      
      // Al menos uno debería ser singleton
      expect(singletonEncontrado).toBe(true);
    });
    
  });
  
});
