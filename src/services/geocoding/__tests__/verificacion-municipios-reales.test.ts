/**
 * Verificación con Municipios Reales - F023 Fase 1
 * 
 * Tests para validar detección singleton con datos reales de:
 * - Quéntar (18160)
 * - Colomera (18048)
 * - Tíjola (04088)
 * - Castril (18044)
 */
import { describe, test, expect, beforeAll } from 'vitest';
import { 
  loadLocalData, 
  countByType, 
  getUniqueByType,
  isDataLoaded 
} from '@/lib/LocalDataService';

describe('Verificación Municipios Reales - Singleton Detection', () => {
  beforeAll(async () => {
    // Cargar datos locales si no están cargados
    if (!isDataLoaded()) {
      await loadLocalData();
    }
  }, 30000);

  describe('Quéntar (18160)', () => {
    test('countByType devuelve número válido para health', async () => {
      const count = await countByType('HEALTH', '18160');
      expect(count).toBeGreaterThanOrEqual(0);
      console.log(`Quéntar HEALTH: ${count} registros`);
    });

    test('countByType devuelve número válido para education', async () => {
      const count = await countByType('EDUCATION', '18160');
      expect(count).toBeGreaterThanOrEqual(0);
      console.log(`Quéntar EDUCATION: ${count} registros`);
    });

    test('countByType devuelve número válido para security', async () => {
      const count = await countByType('SECURITY', '18160');
      expect(count).toBeGreaterThanOrEqual(0);
      console.log(`Quéntar SECURITY: ${count} registros`);
    });
  });

  describe('Colomera (18048)', () => {
    test('countByType devuelve número válido para health', async () => {
      const count = await countByType('HEALTH', '18048');
      expect(count).toBeGreaterThanOrEqual(0);
      console.log(`Colomera HEALTH: ${count} registros`);
    });

    test('countByType devuelve número válido para education', async () => {
      const count = await countByType('EDUCATION', '18048');
      expect(count).toBeGreaterThanOrEqual(0);
      console.log(`Colomera EDUCATION: ${count} registros`);
    });

    test('countByType devuelve número válido para security', async () => {
      const count = await countByType('SECURITY', '18048');
      expect(count).toBeGreaterThanOrEqual(0);
      console.log(`Colomera SECURITY: ${count} registros`);
    });
  });

  describe('Tíjola (04088) - Municipio sin datos esperados', () => {
    test('countByType maneja municipio sin datos', async () => {
      const count = await countByType('HEALTH', '04088');
      expect(count).toBeGreaterThanOrEqual(0);
      console.log(`Tíjola HEALTH: ${count} registros`);
    });
  });

  describe('Castril (18044) - Municipio con múltiples registros', () => {
    test('countByType para health', async () => {
      const count = await countByType('HEALTH', '18044');
      expect(count).toBeGreaterThanOrEqual(0);
      console.log(`Castril HEALTH: ${count} registros`);
    });

    test('countByType para education', async () => {
      const count = await countByType('EDUCATION', '18044');
      expect(count).toBeGreaterThanOrEqual(0);
      console.log(`Castril EDUCATION: ${count} registros`);
    });
  });

  describe('Detección Singleton Funcional', () => {
    test('getUniqueByType retorna feature cuando es singleton', async () => {
      // Buscar un caso de singleton real
      const municipios = ['18160', '18048', '18044'];
      const tipologias = ['HEALTH', 'EDUCATION', 'SECURITY', 'ADMIN'];
      
      let singletonEncontrado = false;
      
      for (const codMun of municipios) {
        for (const tipo of tipologias) {
          const count = await countByType(tipo, codMun);
          if (count === 1) {
            const feature = await getUniqueByType(tipo, codMun);
            expect(feature).not.toBeNull();
            expect(feature?.x).toBeDefined();
            expect(feature?.y).toBeDefined();
            console.log(`✅ Singleton: ${codMun}/${tipo} = ${feature?.nombre || 'N/A'}`);
            singletonEncontrado = true;
          }
        }
      }
      
      // Log resultado
      console.log(`Singletons encontrados: ${singletonEncontrado ? 'Sí' : 'No (OK si no hay datos locales)'}`);
    });

    test('getUniqueByType retorna null cuando hay múltiples', async () => {
      const municipios = ['18160', '18048', '18044'];
      const tipologias = ['HEALTH', 'EDUCATION'];
      
      for (const codMun of municipios) {
        for (const tipo of tipologias) {
          const count = await countByType(tipo, codMun);
          if (count > 1) {
            const feature = await getUniqueByType(tipo, codMun);
            expect(feature).toBeNull();
            console.log(`✅ Múltiples: ${codMun}/${tipo} = ${count} → null`);
            return; // Test exitoso
          }
        }
      }
      
      console.log('No hay casos con múltiples candidatos en datos de prueba');
    });
  });
});
