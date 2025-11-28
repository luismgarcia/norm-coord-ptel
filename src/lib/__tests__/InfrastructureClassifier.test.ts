/**
 * InfrastructureClassifier.test.ts
 * 
 * Tests unitarios con casos reales extraídos de 6 documentos PTEL:
 * Colomera, Quéntar, Hornos, Castril, Tíjola, Berja
 * 
 * Total casos validados: 120+
 * 
 * @version 2.0.0
 * @date 2025-11-28
 */

import { 
  classifyInfrastructure, 
  classifyBatch,
  getWFSForType,
  InfrastructureType 
} from '../InfrastructureClassifier';

// ============================================================================
// CASOS REALES DE 6 DOCUMENTOS PTEL
// ============================================================================

describe('InfrastructureClassifier', () => {

  // ═══════════════════════════════════════════════════════════════════════════
  // SANITARIO
  // ═══════════════════════════════════════════════════════════════════════════
  describe('SANITARIO', () => {
    const cases = [
      // Colomera
      { nombre: 'Consultorio Médico', expected: 'SANITARIO' },
      { nombre: 'Centro de Salud', expected: 'SANITARIO' },
      // Berja (casos concatenados - después de desconcatenar)
      { nombre: 'FARMACIA M.ª Carmen MAYOL', expected: 'SANITARIO' },
      { nombre: 'Farmacia Fernández', expected: 'SANITARIO' },
      // Tíjola
      { nombre: 'Centro de Salud Tíjola', expected: 'SANITARIO' },
      { nombre: 'Consultorio Auxiliar', expected: 'SANITARIO' },
      // Genéricos
      { nombre: 'Hospital Comarcal', expected: 'SANITARIO' },
      { nombre: 'Ambulatorio Municipal', expected: 'SANITARIO' },
      { nombre: 'Urgencias 24h', expected: 'SANITARIO' },
    ];

    test.each(cases)('$nombre → $expected', ({ nombre, expected }) => {
      const result = classifyInfrastructure({ nombre });
      expect(result.type).toBe(expected);
    });

    test('Centro de Salud tiene confianza ALTA', () => {
      const result = classifyInfrastructure({ nombre: 'Centro de Salud' });
      expect(result.confidence).toBe('ALTA');
      expect(result.suggestedWFS).toBe('SICESS');
    });

    test('Farmacia no sugiere SICESS (usa OSM)', () => {
      const result = classifyInfrastructure({ nombre: 'Farmacia López' });
      expect(result.type).toBe('SANITARIO');
      expect(result.suggestedWFS).toBeNull();
    });
  });


  // ═══════════════════════════════════════════════════════════════════════════
  // EDUCATIVO
  // ═══════════════════════════════════════════════════════════════════════════
  describe('EDUCATIVO', () => {
    const cases = [
      // Colomera
      { nombre: 'CEIP Juan Alonso Rivas', expected: 'EDUCATIVO' },
      { nombre: 'Escuela Infantil Columbaira', expected: 'EDUCATIVO' },
      { nombre: 'Centro Educación Adultos', expected: 'EDUCATIVO' },
      // Tíjola
      { nombre: 'IES Alto Almanzora', expected: 'EDUCATIVO' },
      { nombre: 'C.E.I.P. Virgen del Socorro', expected: 'EDUCATIVO' },
      // Berja
      { nombre: 'Colegio Público San Tesifón', expected: 'EDUCATIVO' },
      // Quéntar
      { nombre: 'Escuela Infantil Municipal', expected: 'EDUCATIVO' },
      // Genéricos
      { nombre: 'Guardería Los Peques', expected: 'EDUCATIVO' },
      { nombre: 'Instituto Provincial', expected: 'EDUCATIVO' },
      { nombre: 'Conservatorio de Música', expected: 'EDUCATIVO' },
    ];

    test.each(cases)('$nombre → $expected', ({ nombre, expected }) => {
      const result = classifyInfrastructure({ nombre });
      expect(result.type).toBe(expected);
    });

    test('IES no debe confundirse con IES Repsol (empresa)', () => {
      const result = classifyInfrastructure({ nombre: 'IES Repsol Gasolinera' });
      // IES aparece pero tiene exclusión para Repsol - verificar comportamiento
      expect(result.type).not.toBe('EDUCATIVO');
    });

    test('CEIP tiene WFS EDUCACION', () => {
      const result = classifyInfrastructure({ nombre: 'CEIP García Lorca' });
      expect(result.suggestedWFS).toBe('EDUCACION');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEGURIDAD
  // ═══════════════════════════════════════════════════════════════════════════
  describe('SEGURIDAD', () => {
    const cases = [
      // Colomera
      { nombre: 'Guardia Civil', expected: 'SEGURIDAD' },
      { nombre: 'Policía Local', expected: 'SEGURIDAD' },
      // Castril
      { nombre: 'Cuartel Guardia Civil', expected: 'SEGURIDAD' },
      // Quéntar
      { nombre: 'Protección Civil', expected: 'SEGURIDAD' },
      // Genéricos
      { nombre: 'Parque de Bomberos', expected: 'SEGURIDAD' },
      { nombre: 'Comisaría de Policía', expected: 'SEGURIDAD' },
      { nombre: 'Centro 112', expected: 'SEGURIDAD' },
      { nombre: 'CECOPAL Municipal', expected: 'SEGURIDAD' },
    ];

    test.each(cases)('$nombre → $expected', ({ nombre, expected }) => {
      const result = classifyInfrastructure({ nombre });
      expect(result.type).toBe(expected);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CULTURAL
  // ═══════════════════════════════════════════════════════════════════════════
  describe('CULTURAL', () => {
    const cases = [
      // Colomera
      { nombre: 'Puente Romano', expected: 'CULTURAL' },
      { nombre: 'Necrópolis Visigoda', expected: 'CULTURAL' },
      { nombre: 'Lavadero Público', expected: 'CULTURAL' },
      // Hornos
      { nombre: 'Castillo de Hornos', expected: 'CULTURAL' },
      { nombre: 'Torre del Homenaje', expected: 'CULTURAL' },
      // Castril
      { nombre: 'Museo de la Historia', expected: 'CULTURAL' },
      // Genéricos
      { nombre: 'Biblioteca Municipal', expected: 'CULTURAL' },
      { nombre: 'Teatro Principal', expected: 'CULTURAL' },
      { nombre: 'Casa de la Cultura', expected: 'CULTURAL' },
      { nombre: 'Yacimiento Arqueológico', expected: 'CULTURAL' },
      { nombre: 'Monumento BIC', expected: 'CULTURAL' },
    ];

    test.each(cases)('$nombre → $expected', ({ nombre, expected }) => {
      const result = classifyInfrastructure({ nombre });
      expect(result.type).toBe(expected);
    });

    test('Castillo sugiere WFS IAPH', () => {
      const result = classifyInfrastructure({ nombre: 'Castillo de Castril' });
      expect(result.suggestedWFS).toBe('IAPH');
    });
  });


  // ═══════════════════════════════════════════════════════════════════════════
  // RELIGIOSO
  // ═══════════════════════════════════════════════════════════════════════════
  describe('RELIGIOSO', () => {
    const cases = [
      // Hornos
      { nombre: 'Iglesia de Nuestra Señora de la Asunción', expected: 'RELIGIOSO' },
      // Castril
      { nombre: 'Ermita de San Sebastián', expected: 'RELIGIOSO' },
      // Colomera
      { nombre: 'Parroquia de la Encarnación', expected: 'RELIGIOSO' },
      // Genéricos
      { nombre: 'Capilla del Carmen', expected: 'RELIGIOSO' },
      { nombre: 'Convento de Santa Clara', expected: 'RELIGIOSO' },
      { nombre: 'Cementerio Municipal', expected: 'RELIGIOSO' },
    ];

    test.each(cases)('$nombre → $expected', ({ nombre, expected }) => {
      const result = classifyInfrastructure({ nombre });
      expect(result.type).toBe(expected);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DEPORTIVO
  // ═══════════════════════════════════════════════════════════════════════════
  describe('DEPORTIVO', () => {
    const cases = [
      // Colomera
      { nombre: 'Piscina Municipal', expected: 'DEPORTIVO' },
      { nombre: 'Campo de Fútbol', expected: 'DEPORTIVO' },
      { nombre: 'Pista Polideportiva', expected: 'DEPORTIVO' },
      // Quéntar
      { nombre: 'Polideportivo Municipal', expected: 'DEPORTIVO' },
      // Genéricos
      { nombre: 'Pabellón Cubierto', expected: 'DEPORTIVO' },
      { nombre: 'Frontón', expected: 'DEPORTIVO' },
      { nombre: 'Gimnasio Municipal', expected: 'DEPORTIVO' },
      { nombre: 'Pista de Tenis', expected: 'DEPORTIVO' },
    ];

    test.each(cases)('$nombre → $expected', ({ nombre, expected }) => {
      const result = classifyInfrastructure({ nombre });
      expect(result.type).toBe(expected);
    });

    test('Polideportivo sugiere WFS DERA_G12', () => {
      const result = classifyInfrastructure({ nombre: 'Polideportivo' });
      expect(result.suggestedWFS).toBe('DERA_G12');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SERVICIOS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('SERVICIOS', () => {
    const cases = [
      // Colomera
      { nombre: 'Ayuntamiento', expected: 'SERVICIOS' },
      { nombre: 'Dependencias Municipales', expected: 'SERVICIOS' },
      // Berja
      { nombre: 'Casa Consistorial', expected: 'SERVICIOS' },
      // Genéricos
      { nombre: 'Centro Social', expected: 'SERVICIOS' },
      { nombre: 'Hogar del Pensionista', expected: 'SERVICIOS' },
      { nombre: 'Oficina Municipal', expected: 'SERVICIOS' },
      { nombre: 'Juzgado de Paz', expected: 'SERVICIOS' },
      { nombre: 'Correos', expected: 'SERVICIOS' },
    ];

    test.each(cases)('$nombre → $expected', ({ nombre, expected }) => {
      const result = classifyInfrastructure({ nombre });
      expect(result.type).toBe(expected);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ENERGIA
  // ═══════════════════════════════════════════════════════════════════════════
  describe('ENERGIA', () => {
    const cases = [
      // Berja (casos reales concatenados - después de desconcatenar)
      { nombre: 'Transformador 60822 Sevillana Endesa', expected: 'ENERGIA' },
      { nombre: 'Trasformador Endesa', expected: 'ENERGIA' }, // Typo real
      // Colomera
      { nombre: 'CT Endesa', expected: 'ENERGIA' },
      // Genéricos
      { nombre: 'Subestación Eléctrica', expected: 'ENERGIA' },
      { nombre: 'Centro de Transformación', expected: 'ENERGIA' },
      { nombre: 'Línea Alta Tensión', expected: 'ENERGIA' },
      { nombre: 'Parque Eólico', expected: 'ENERGIA' },
      { nombre: 'Huerto Solar', expected: 'ENERGIA' },
    ];

    test.each(cases)('$nombre → $expected', ({ nombre, expected }) => {
      const result = classifyInfrastructure({ nombre });
      expect(result.type).toBe(expected);
    });

    test('Trasformador (typo) también se detecta', () => {
      const result = classifyInfrastructure({ nombre: 'Trasformador' });
      expect(result.type).toBe('ENERGIA');
    });
  });


  // ═══════════════════════════════════════════════════════════════════════════
  // HIDRAULICO
  // ═══════════════════════════════════════════════════════════════════════════
  describe('HIDRAULICO', () => {
    const cases = [
      // Quéntar
      { nombre: 'Embalse de Quéntar', expected: 'HIDRAULICO' },
      // Colomera
      { nombre: 'Pantano de Colomera', expected: 'HIDRAULICO' },
      { nombre: 'Depósito de Agua', expected: 'HIDRAULICO' },
      // Genéricos
      { nombre: 'EDAR Municipal', expected: 'HIDRAULICO' },
      { nombre: 'ETAP Depuradora', expected: 'HIDRAULICO' },
      { nombre: 'Pozo de Abastecimiento', expected: 'HIDRAULICO' },
      { nombre: 'Acequia Mayor', expected: 'HIDRAULICO' },
      { nombre: 'Aljibe Histórico', expected: 'HIDRAULICO' },
      { nombre: 'Balsa de Riego', expected: 'HIDRAULICO' },
    ];

    test.each(cases)('$nombre → $expected', ({ nombre, expected }) => {
      const result = classifyInfrastructure({ nombre });
      expect(result.type).toBe(expected);
    });

    test('EDAR sugiere WFS REDIAM', () => {
      const result = classifyInfrastructure({ nombre: 'EDAR' });
      expect(result.suggestedWFS).toBe('REDIAM');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSPORTE
  // ═══════════════════════════════════════════════════════════════════════════
  describe('TRANSPORTE', () => {
    const cases = [
      // Colomera
      { nombre: 'Carretera A-4076', expected: 'TRANSPORTE' },
      { nombre: 'Carretera GR-3420', expected: 'TRANSPORTE' },
      { nombre: 'Helipuerto Pantano de Colomera', expected: 'TRANSPORTE' },
      // Genéricos
      { nombre: 'Estación de Servicio', expected: 'TRANSPORTE' },
      { nombre: 'Autovía A-92', expected: 'TRANSPORTE' },
      { nombre: 'Camino Rural', expected: 'TRANSPORTE' },
      { nombre: 'Estación de Tren', expected: 'TRANSPORTE' },
      { nombre: 'Apeadero RENFE', expected: 'TRANSPORTE' },
    ];

    test.each(cases)('$nombre → $expected', ({ nombre, expected }) => {
      const result = classifyInfrastructure({ nombre });
      expect(result.type).toBe(expected);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TELECOMUNICACIONES
  // ═══════════════════════════════════════════════════════════════════════════
  describe('TELECOMUNICACIONES', () => {
    const cases = [
      // Colomera
      { nombre: 'Antena Movistar', expected: 'TELECOMUNICACIONES' },
      { nombre: 'Antena Vodafone', expected: 'TELECOMUNICACIONES' },
      { nombre: 'Antena Orange', expected: 'TELECOMUNICACIONES' },
      { nombre: 'Centro Telefónica', expected: 'TELECOMUNICACIONES' },
      // Genéricos
      { nombre: 'Repetidor', expected: 'TELECOMUNICACIONES' },
      { nombre: 'Torre de Telecomunicaciones', expected: 'TELECOMUNICACIONES' },
      { nombre: 'BTS Telefonía Móvil', expected: 'TELECOMUNICACIONES' },
    ];

    test.each(cases)('$nombre → $expected', ({ nombre, expected }) => {
      const result = classifyInfrastructure({ nombre });
      expect(result.type).toBe(expected);
    });

    test('Telecomunicaciones no tiene WFS oficial', () => {
      const result = classifyInfrastructure({ nombre: 'Antena Movistar' });
      expect(result.suggestedWFS).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMERCIAL
  // ═══════════════════════════════════════════════════════════════════════════
  describe('COMERCIAL', () => {
    const cases = [
      // Genéricos
      { nombre: 'Supermercado Coviran', expected: 'COMERCIAL' },
      { nombre: 'Restaurante El Rincón', expected: 'COMERCIAL' },
      { nombre: 'Hotel Rural', expected: 'COMERCIAL' },
      { nombre: 'Mercado Municipal', expected: 'COMERCIAL' },
      { nombre: 'Camping Los Pinos', expected: 'COMERCIAL' },
    ];

    test.each(cases)('$nombre → $expected', ({ nombre, expected }) => {
      const result = classifyInfrastructure({ nombre });
      expect(result.type).toBe(expected);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INDUSTRIAL
  // ═══════════════════════════════════════════════════════════════════════════
  describe('INDUSTRIAL', () => {
    const cases = [
      // Colomera
      { nombre: 'Cooperativa Nuestra Señora del Pilar', expected: 'INDUSTRIAL' },
      // Castril (después de desconcatenar)
      { nombre: 'Hnos. Sánchez Carpintería', expected: 'INDUSTRIAL' },
      // Genéricos
      { nombre: 'Polígono Industrial', expected: 'INDUSTRIAL' },
      { nombre: 'Nave Industrial', expected: 'INDUSTRIAL' },
      { nombre: 'Almazara', expected: 'INDUSTRIAL' },
      { nombre: 'Taller Mecánico', expected: 'INDUSTRIAL' },
      { nombre: 'Fábrica de Aceite', expected: 'INDUSTRIAL' },
    ];

    test.each(cases)('$nombre → $expected', ({ nombre, expected }) => {
      const result = classifyInfrastructure({ nombre });
      expect(result.type).toBe(expected);
    });
  });


  // ═══════════════════════════════════════════════════════════════════════════
  // TESTS DE INTEGRACIÓN Y EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Integración y Edge Cases', () => {
    
    test('Prioridad uso > tipo > nombre', () => {
      // Si uso dice "docente" pero nombre dice "Ayuntamiento", debe ser EDUCATIVO
      const result = classifyInfrastructure({ 
        nombre: 'Edificio Municipal', 
        tipo: 'Servicios',
        uso: 'docente' 
      });
      expect(result.type).toBe('EDUCATIVO');
      expect(result.matchedField).toBe('uso');
    });

    test('Campo tipo se usa si nombre no tiene match', () => {
      const result = classifyInfrastructure({ 
        nombre: 'Edificio Sin Identificar',
        tipo: 'sanitario'
      });
      expect(result.type).toBe('SANITARIO');
      expect(result.matchedField).toBe('tipo');
    });

    test('Fallback a OTROS si no hay matches', () => {
      const result = classifyInfrastructure({ nombre: 'Elemento Desconocido XYZ' });
      expect(result.type).toBe('OTROS');
      expect(result.confidence).toBe('BAJA');
    });

    test('Texto vacío retorna OTROS', () => {
      const result = classifyInfrastructure({ nombre: '' });
      expect(result.type).toBe('OTROS');
    });

    test('classifyBatch procesa múltiples registros', () => {
      const inputs = [
        { nombre: 'Hospital' },
        { nombre: 'Colegio' },
        { nombre: 'Ayuntamiento' },
        { nombre: 'Desconocido' },
      ];
      const { results, stats, unclassified } = classifyBatch(inputs);
      
      expect(results).toHaveLength(4);
      expect(stats.SANITARIO).toBe(1);
      expect(stats.EDUCATIVO).toBe(1);
      expect(stats.SERVICIOS).toBe(1);
      expect(stats.OTROS).toBe(1);
      expect(unclassified).toBe(1);
    });

    test('getWFSForType retorna servicio correcto', () => {
      expect(getWFSForType('SANITARIO')).toBe('SICESS');
      expect(getWFSForType('EDUCATIVO')).toBe('EDUCACION');
      expect(getWFSForType('CULTURAL')).toBe('IAPH');
      expect(getWFSForType('DEPORTIVO')).toBe('DERA_G12');
      expect(getWFSForType('HIDRAULICO')).toBe('REDIAM');
    });

    test('Alternativas se detectan cuando hay múltiples matches', () => {
      // "Iglesia de San Juan" puede ser RELIGIOSO y CULTURAL
      const result = classifyInfrastructure({ nombre: 'Iglesia Histórica BIC' });
      expect(result.type).toBe('RELIGIOSO'); // Prioridad por orden
      expect(result.alternativeTypes).toContain('CULTURAL');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CASOS PROBLEMÁTICOS DETECTADOS EN DOCUMENTOS REALES
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Casos Problemáticos Reales', () => {
    
    test('Texto concatenado Berja: FARMACIAM.ª se detecta tras desconcatenar', () => {
      // Después de aplicar textDeconcatenator: "FARMACIA M.ª Carmen"
      const result = classifyInfrastructure({ nombre: 'FARMACIA M.ª Carmen' });
      expect(result.type).toBe('SANITARIO');
    });

    test('Typo real: Trasformador (sin n)', () => {
      const result = classifyInfrastructure({ nombre: 'Trasformador Endesa' });
      expect(result.type).toBe('ENERGIA');
    });

    test('Caso Castril: Sierra de Castril (elemento natural)', () => {
      // Sierra es genérico - debería ser OTROS o detectar como espacio natural
      const result = classifyInfrastructure({ nombre: 'Sierra de Castril' });
      // No hay patrón específico para espacios naturales genéricos
      expect(result.type).toBe('OTROS');
    });

    test('Caso compuesto: Polideportivo con piscina', () => {
      const result = classifyInfrastructure({ nombre: 'Polideportivo Municipal con Piscina' });
      expect(result.type).toBe('DEPORTIVO');
    });

    test('Uso CTE: hospitalario vs sanitario', () => {
      const result = classifyInfrastructure({ 
        nombre: 'Edificio A', 
        uso: 'hospitalario' 
      });
      // "hospitalario" contiene "hospital"
      expect(result.type).toBe('SANITARIO');
    });

    test('Términos CTE: pública concurrencia', () => {
      const result = classifyInfrastructure({ 
        nombre: 'Sala Multiusos',
        uso: 'pública concurrencia'
      });
      expect(result.type).toBe('COMERCIAL');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADÍSTICAS ESPERADAS DE 6 DOCUMENTOS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Estadísticas Esperadas', () => {
    
    test('Distribución aproximada de 517 registros', () => {
      // Basado en análisis previo de 6 documentos PTEL
      // Esta es una verificación de sanidad, no exacta
      const sampleInputs = [
        // Simulamos distribución típica
        ...Array(50).fill({ nombre: 'Centro de Salud' }),      // ~10% sanitario
        ...Array(40).fill({ nombre: 'Colegio' }),              // ~8% educativo
        ...Array(30).fill({ nombre: 'Guardia Civil' }),        // ~6% seguridad
        ...Array(60).fill({ nombre: 'Iglesia' }),              // ~12% religioso
        ...Array(40).fill({ nombre: 'Castillo' }),             // ~8% cultural
        ...Array(35).fill({ nombre: 'Polideportivo' }),        // ~7% deportivo
        ...Array(45).fill({ nombre: 'Ayuntamiento' }),         // ~9% servicios
        ...Array(30).fill({ nombre: 'Transformador' }),        // ~6% energia
        ...Array(50).fill({ nombre: 'Depósito Agua' }),        // ~10% hidraulico
        ...Array(40).fill({ nombre: 'Carretera A-1' }),        // ~8% transporte
        ...Array(20).fill({ nombre: 'Antena' }),               // ~4% telecom
        ...Array(77).fill({ nombre: 'Desconocido' }),          // ~15% otros
      ];
      
      const { stats, unclassified } = classifyBatch(sampleInputs);
      
      // Verificar que no hay categorías vacías para las principales
      expect(stats.SANITARIO).toBeGreaterThan(0);
      expect(stats.EDUCATIVO).toBeGreaterThan(0);
      expect(stats.SEGURIDAD).toBeGreaterThan(0);
      expect(stats.CULTURAL).toBeGreaterThan(0);
      expect(stats.RELIGIOSO).toBeGreaterThan(0);
      expect(stats.DEPORTIVO).toBeGreaterThan(0);
      expect(stats.SERVICIOS).toBeGreaterThan(0);
      expect(stats.ENERGIA).toBeGreaterThan(0);
      expect(stats.HIDRAULICO).toBeGreaterThan(0);
      expect(stats.TRANSPORTE).toBeGreaterThan(0);
      expect(stats.TELECOMUNICACIONES).toBeGreaterThan(0);
      
      // OTROS debe capturar los no clasificados
      expect(unclassified).toBe(77);
    });
  });

}); // fin describe principal
