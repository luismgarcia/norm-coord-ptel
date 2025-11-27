import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig, PluginOption } from "vite";

import sparkPlugin from "@github/spark/spark-vite-plugin";
import createIconImportProxy from "@github/spark/vitePhosphorIconProxyPlugin";
import { resolve } from 'path'

const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname

// https://vite.dev/config/
export default defineConfig({
  base: '/norm-coord-ptel/',
  plugins: [
    react(),
    tailwindcss(),
    // DO NOT REMOVE
    createIconImportProxy() as PluginOption,
    sparkPlugin() as PluginOption,
  ],
  resolve: {
    alias: {
      '@': resolve(projectRoot, 'src')
    }
  },
  build: {
    // Aumentar límite de advertencia a 600KB
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Code-splitting: separar librerías pesadas en chunks independientes
        manualChunks: {
          // React core
          'vendor-react': ['react', 'react-dom'],
          
          // Procesamiento de archivos (pesado ~300KB)
          'vendor-files': ['xlsx', 'papaparse', 'jszip'],
          
          // UI y animaciones
          'vendor-ui': ['framer-motion', '@radix-ui/react-dialog', '@radix-ui/react-popover'],
          
          // Gráficos y visualización
          'vendor-charts': ['recharts', 'd3'],
          
          // Utilidades
          'vendor-utils': ['date-fns', 'zod', 'clsx', 'tailwind-merge'],
          
          // Coordenadas (proj4 es pesado)
          'vendor-geo': ['proj4'],
        }
      }
    }
  }
});
