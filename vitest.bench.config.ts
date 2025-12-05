/**
 * Configuración Vitest para Benchmarks de Rendimiento
 * 
 * Sesión S1.3 - Suite benchmark PTEL
 * 
 * Ejecutar: npx vitest bench
 * 
 * @see https://vitest.dev/guide/features.html#benchmarking
 */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Solo archivos .bench.ts
    include: ['src/**/*.bench.ts'],
    
    // Entorno Node para benchmarks (más estable)
    environment: 'node',
    
    // Globals para bench() y describe()
    globals: true,
    
    // Sin setup files para benchmarks puros
    // setupFiles: [],
    
    // Timeout extendido para benchmarks largos
    testTimeout: 60000,
    hookTimeout: 30000,
    
    // Configuración específica de benchmark
    benchmark: {
      // Incluir solo archivos bench
      include: ['src/**/*.bench.ts'],
      
      // Reporters para output
      reporters: ['default'],
      
      // Output en JSON para análisis posterior
      outputFile: './bench-results.json',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
