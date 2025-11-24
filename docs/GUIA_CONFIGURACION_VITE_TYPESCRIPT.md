# Guía de Configuración Vite/TypeScript
## Proyecto PTEL Coordinate Normalizer

> Configuración optimizada para aplicación React/TypeScript geoespacial con soporte EPSG:25830.

---

## 📋 Tabla de Contenidos

1. [Configuración Vite](#configuración-vite)
2. [Configuración TypeScript](#configuración-typescript)
3. [Configuración Tailwind CSS](#configuración-tailwind-css)
4. [Variables de Entorno](#variables-de-entorno)
5. [Optimizaciones Producción](#optimizaciones-producción)

---

## 🚀 Configuración Vite

### `vite.config.ts`

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'
  
  return {
    plugins: [
      react({
        fastRefresh: true
      })
    ],
    
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@services': path.resolve(__dirname, './src/services'),
        '@utils': path.resolve(__dirname, './src/utils'),
        '@types': path.resolve(__dirname, './src/types')
      }
    },
    
    // GitHub Pages deployment
    base: isProduction ? '/norm-coord-ptel/' : '/',
    
    build: {
      outDir: 'dist',
      sourcemap: !isProduction,
      minify: 'terser',
      target: 'es2020',
      chunkSizeWarningLimit: 1000,
      
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-tabs'],
            'vendor-geo': ['proj4'],
            'vendor-icons': ['@phosphor-icons/react']
          }
        }
      },
      
      terserOptions: {
        compress: {
          drop_console: isProduction,
          drop_debugger: isProduction
        }
      }
    },
    
    server: {
      port: 5173,
      strictPort: false,
      open: true,
      cors: true
    },
    
    preview: {
      port: 4173,
      strictPort: false
    },
    
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'proj4',
        'framer-motion'
      ],
      exclude: []
    }
  }
})
```

---

## 📘 Configuración TypeScript

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@services/*": ["./src/services/*"],
      "@utils/*": ["./src/utils/*"],
      "@types/*": ["./src/types/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### `tsconfig.node.json`

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

---

## 🎨 Configuración Tailwind CSS

### `tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Sistema de colores PTEL
        'confidence-high': '#388E3C',
        'confidence-medium': '#FBC02D',
        'confidence-low': '#F57C00',
        'confidence-critical': '#D32F2F',
        'confidence-confirmed': '#1976D2',
        
        // shadcn/ui colors
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

---

## 🔐 Variables de Entorno

### `.env.example`

```env
# API Keys (opcional - el sistema usa APIs gratuitas sin key)
VITE_CARTOCIUDAD_API_URL=https://www.cartociudad.es/geocoder/api/geocoder

# CDAU Andalucía
VITE_CDAU_WFS_URL=https://www.callejerodeandalucia.es/servicios/cdau/wfs

# IECA Services
VITE_IECA_WFS_URL=https://www.juntadeandalucia.es/institutodeestadisticaycartografia/geoserver-ieca/

# Configuración App
VITE_APP_NAME=PTEL Coordinate Normalizer
VITE_APP_VERSION=0.4.0
VITE_DEFAULT_CRS=EPSG:25830
VITE_DEFAULT_MUNICIPALITY=Granada

# Debug
VITE_DEBUG_MODE=false
VITE_LOG_LEVEL=info
```

### Uso en código

```typescript
// src/config/env.ts
export const config = {
  apiUrls: {
    cartociudad: import.meta.env.VITE_CARTOCIUDAD_API_URL || 'https://www.cartociudad.es/geocoder/api/geocoder',
    cdau: import.meta.env.VITE_CDAU_WFS_URL || 'https://www.callejerodeandalucia.es/servicios/cdau/wfs',
    ieca: import.meta.env.VITE_IECA_WFS_URL || 'https://www.juntadeandalucia.es/institutodeestadisticaycartografia/geoserver-ieca/'
  },
  app: {
    name: import.meta.env.VITE_APP_NAME || 'PTEL Coordinate Normalizer',
    version: import.meta.env.VITE_APP_VERSION || '0.4.0',
    defaultCrs: import.meta.env.VITE_DEFAULT_CRS || 'EPSG:25830'
  },
  debug: import.meta.env.VITE_DEBUG_MODE === 'true'
}
```

---

## ⚡ Optimizaciones Producción

### Bundle Splitting

```typescript
// vite.config.ts - manualChunks optimizado
manualChunks: (id) => {
  if (id.includes('node_modules')) {
    // React core
    if (id.includes('react') || id.includes('react-dom')) {
      return 'vendor-react'
    }
    // UI components
    if (id.includes('@radix-ui') || id.includes('framer-motion')) {
      return 'vendor-ui'
    }
    // Geospatial
    if (id.includes('proj4') || id.includes('leaflet')) {
      return 'vendor-geo'
    }
    // Icons
    if (id.includes('@phosphor-icons')) {
      return 'vendor-icons'
    }
    // Everything else
    return 'vendor'
  }
}
```

### Lazy Loading de Componentes

```typescript
// src/App.tsx
import { lazy, Suspense } from 'react'

// Lazy load componentes pesados
const MapViewer = lazy(() => import('./components/MapViewer'))
const ExportPanel = lazy(() => import('./components/ExportPanel'))

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <MapViewer />
    </Suspense>
  )
}
```

---

## 📦 Dependencias Esenciales

### package.json

```json
{
  "name": "norm-coord-ptel",
  "version": "0.4.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives",
    "deploy": "npm run build && gh-pages -d dist"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "proj4": "^2.11.0",
    "framer-motion": "^11.0.0",
    "@phosphor-icons/react": "^2.1.0",
    "sonner": "^1.4.0",
    "zustand": "^4.4.7",
    "fuse.js": "^7.0.0",
    "xlsx": "^0.18.5",
    "jszip": "^3.10.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.6.0",
    "vite": "^5.4.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

---

## 🐛 Troubleshooting

### Error: "Cannot find module '@/components/...'"

```bash
# Verificar que paths está configurado en tsconfig.json
# y que vite.config.ts tiene los alias correspondientes
```

### Error: proj4 no encuentra definición EPSG

```typescript
// Asegurar que las definiciones se registran antes de usar
import proj4 from 'proj4'

proj4.defs('EPSG:25830', '+proj=utm +zone=30 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs')
proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs')
```

### Error CORS en APIs

```typescript
// Usar proxy en desarrollo
// vite.config.ts
server: {
  proxy: {
    '/api/cartociudad': {
      target: 'https://www.cartociudad.es',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/cartociudad/, '/geocoder/api/geocoder')
    }
  }
}
```

### Build muy grande

```bash
# Analizar bundle
npm run build
# Ver dist/stats.html si tienes visualizer configurado

# Soluciones:
# 1. Lazy loading de componentes pesados
# 2. Tree-shaking de imports
# 3. Excluir dependencias no usadas
```

---

## 📚 Referencias

- [Vite Documentation](https://vitejs.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [proj4js](http://proj4js.org/)

---

**Última actualización**: 24 Noviembre 2025  
**Versión configuración**: Vite 5.4 + TypeScript 5.6
