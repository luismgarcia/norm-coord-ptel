/**
 * Test rápido del parser NMEA v2.4
 */
import { describe, it, expect } from 'vitest';
import { parseNMEA, parseNMEASentence, parseParNMEA, esNMEA } from '../coordinateNormalizer';

describe('🧪 PRUEBAS PARSER NMEA v2.4', () => {
  
  describe('PRUEBA 1: Coordenada NMEA individual', () => {
    it('debe parsear 3726.775N correctamente', () => {
      const result = parseNMEA('3726.775N');
      
      console.log('\n📍 Input: "3726.775N"');
      console.log('   Resultado:', JSON.stringify(result, null, 2));
      
      expect(result.esValido).toBe(true);
      expect(result.hemisferio).toBe('N');
      expect(result.esLatitud).toBe(true);
      // 37° + 26.775'/60 = 37.44625°
      expect(result.valorDecimal).toBeCloseTo(37.44625, 4);
    });

    it('debe parsear 00345.204W correctamente', () => {
      const result = parseNMEA('00345.204W');
      
      console.log('\n📍 Input: "00345.204W"');
      console.log('   Resultado:', JSON.stringify(result, null, 2));
      
      expect(result.esValido).toBe(true);
      expect(result.hemisferio).toBe('W');
      expect(result.esLatitud).toBe(false);
      // 3° + 45.204'/60 = 3.7534°
      expect(result.valorDecimal).toBeCloseTo(3.7534, 4);
    });
  });

  describe('PRUEBA 2: Sentencia NMEA completa ($GPGGA)', () => {
    it('debe extraer coords de sentencia $GPGGA', () => {
      const sentencia = '$GPGGA,123519,3726.7750,N,00345.2040,W,1,08,0.9,545.4,M,47.0,M,,*47';
      const result = parseNMEASentence(sentencia);
      
      console.log('\n📍 Input: "$GPGGA,123519,3726.7750,N,00345.2040,W,..."');
      console.log('   Resultado:', JSON.stringify(result, null, 2));
      
      expect(result.exito).toBe(true);
      expect(result.tipoSentencia).toBe('GGA');
      expect(result.latitud).toBeCloseTo(37.44625, 4);
      expect(result.longitud).toBeCloseTo(-3.7534, 4); // Negativa para W
    });

    it('debe extraer coords de sentencia $GPRMC', () => {
      const sentencia = '$GPRMC,123519,A,3726.7750,N,00345.2040,W,022.4,084.4,230394,003.1,W*6A';
      const result = parseNMEASentence(sentencia);
      
      console.log('\n📍 Input: "$GPRMC,123519,A,3726.7750,N,..."');
      console.log('   Resultado:', JSON.stringify(result, null, 2));
      
      expect(result.exito).toBe(true);
      expect(result.tipoSentencia).toBe('RMC');
      expect(result.latitud).toBeCloseTo(37.44625, 4);
    });
  });

  describe('PRUEBA 3: Par de coordenadas NMEA', () => {
    it('debe parsear par "3726.775N, 00345.204W"', () => {
      const result = parseParNMEA('3726.775N, 00345.204W');
      
      console.log('\n📍 Input: "3726.775N, 00345.204W"');
      console.log('   Resultado:', JSON.stringify(result, null, 2));
      
      expect(result.exito).toBe(true);
      expect(result.latitud).toBeCloseTo(37.44625, 4);
      expect(result.longitud).toBeCloseTo(-3.7534, 4);
    });

    it('debe parsear par con slash "3726.775N/00345.204W"', () => {
      const result = parseParNMEA('3726.775N/00345.204W');
      
      console.log('\n📍 Input: "3726.775N/00345.204W"');
      console.log('   Resultado:', JSON.stringify(result, null, 2));
      
      expect(result.exito).toBe(true);
      expect(result.latitud).toBeCloseTo(37.44625, 4);
    });
  });

  describe('BONUS: Detección esNMEA()', () => {
    it('debe detectar formatos NMEA correctamente', () => {
      console.log('\n📍 Detección de formatos:');
      
      const casos = [
        { input: '3726.775N', esperado: true },
        { input: '$GPGGA,123519,...', esperado: true },
        { input: '37.446', esperado: false },
        { input: 'POINT(504750 4077905)', esperado: false },
        { input: '37°26\'46.5"N', esperado: false },
      ];
      
      casos.forEach(({ input, esperado }) => {
        const result = esNMEA(input);
        console.log(`   esNMEA("${input.substring(0,20)}"): ${result} (esperado: ${esperado})`);
        expect(result).toBe(esperado);
      });
    });
  });
});
