import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig, PluginOption } from "vite";
import { VitePWA } from 'vite-plugin-pwa';

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
    
    // PWA con Service Worker para offline
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt'],
      
      // Manifest de la PWA
      manifest: {
        name: 'PTEL Normalizador de Coordenadas',
        short_name: 'PTEL Coords',
        description: 'Normalización de coordenadas para Planes Territoriales de Emergencias Locales de Andalucía',
        theme_color: '#1e40af',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/norm-coord-ptel/',
        start_url: '/norm-coord-ptel/',
        icons: [
          {
            src: 'pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable'
          }
        ]
      },
      
      // Configuración de Workbox
      workbox: {
        // Archivos a precachear (app shell)
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        
        // Estrategias de caché en runtime
        runtimeCaching: [
          {
            // Datos DERA GeoJSON - CacheFirst (prioridad local)
            urlPattern: /\/data\/dera\/.*\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'dera-geodata-v1',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 90 // 90 días
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Otros datos JSON - StaleWhileRevalidate
            urlPattern: /\/data\/.*\.json$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'app-data-v1',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 días
              }
            }
          },
          {
            // APIs externas (CartoCiudad, DERA WFS) - NetworkFirst con fallback
            urlPattern: /^https:\/\/(www\.cartociudad\.es|www\.ideandalucia\.es)\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'external-apis-v1',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 1 día
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      
      // Modo de desarrollo
      devOptions: {
        enabled: false // No activar SW en desarrollo
      }
    })
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
