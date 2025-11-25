# Gama de Colores y Estilos - Conversor UTM30

## Paleta de Colores Principal (OKLCH)

### Colores Base
```css
--background: oklch(0.96 0.01 200);        /* Fondo principal - gris azulado muy claro */
--foreground: oklch(0.25 0.02 210);        /* Texto principal - gris oscuro azulado */
```

### Colores de Tarjetas
```css
--card: oklch(0.98 0.008 200);             /* Fondo de tarjetas - casi blanco con tinte azul */
--card-foreground: oklch(0.25 0.02 210);   /* Texto en tarjetas */
```

### Colores de Acción
```css
--primary: oklch(0.42 0.04 215);           /* Azul principal para botones y acentos */
--primary-foreground: oklch(0.96 0.01 200); /* Texto sobre primary */

--secondary: oklch(0.78 0.03 205);         /* Azul secundario claro */
--secondary-foreground: oklch(0.25 0.02 210); /* Texto sobre secondary */

--accent: oklch(0.78 0.03 205);            /* Color de acento - azul claro */
--accent-foreground: oklch(0.25 0.02 210); /* Texto sobre accent */
```

### Colores de Estado
```css
--muted: oklch(0.78 0.03 205);             /* Elementos atenuados - azul muy claro */
--muted-foreground: oklch(0.42 0.04 215);  /* Texto atenuado */

--destructive: oklch(0.628 0.258 29);      /* Rojo para acciones destructivas */
--destructive-foreground: oklch(0.98 0.013 17); /* Texto sobre destructive */
```

### Colores de Borde y Input
```css
--border: oklch(0.85 0.02 205);            /* Bordes - gris azulado */
--input: oklch(0.85 0.02 205);             /* Bordes de inputs */
--ring: oklch(0.42 0.04 215);              /* Anillo de foco */
```

### Radio de Bordes
```css
--radius: 0.5rem;                          /* 8px - border radius base */
```

## Modo Oscuro (Dark Mode)

```css
.dark {
  --background: oklch(0.25 0.02 210);
  --foreground: oklch(0.96 0.01 200);
  
  --card: oklch(0.30 0.025 215);
  --card-foreground: oklch(0.96 0.01 200);
  
  --primary: oklch(0.78 0.03 205);
  --primary-foreground: oklch(0.25 0.02 210);
  
  --secondary: oklch(0.42 0.04 215);
  --secondary-foreground: oklch(0.96 0.01 200);
  
  --muted: oklch(0.42 0.04 215);
  --muted-foreground: oklch(0.78 0.03 205);
  
  --accent: oklch(0.78 0.03 205);
  --accent-foreground: oklch(0.25 0.02 210);
  
  --destructive: oklch(0.628 0.258 29);
  --destructive-foreground: oklch(0.98 0.013 17);
  
  --border: oklch(0.42 0.04 215);
  --input: oklch(0.42 0.04 215);
  --ring: oklch(0.78 0.03 205);
}
```

## Colores Específicos por Componente

### Archivo Original (Azul)
```css
background: oklch(0.95 0.02 220) / rgb(239, 246, 255); /* bg-blue-50 */
border: oklch(0.80 0.05 220) / rgb(191, 219, 254);     /* border-blue-200 */
text-primary: oklch(0.30 0.08 240) / rgb(30, 64, 175); /* text-blue-900 */
text-secondary: oklch(0.45 0.08 240) / rgb(29, 78, 216); /* text-blue-700 */
badge: oklch(0.50 0.12 240) / rgb(37, 99, 235);        /* bg-blue-600 */
```

### Archivo Convertido (Verde)
```css
background: oklch(0.95 0.02 145) / rgb(240, 253, 244); /* bg-green-50 */
border: oklch(0.85 0.05 145) / rgb(187, 247, 208);     /* border-green-200 */
text-primary: oklch(0.30 0.08 145) / rgb(20, 83, 45);  /* text-green-900 */
text-secondary: oklch(0.45 0.10 145) / rgb(21, 128, 61); /* text-green-700 */
badge: oklch(0.50 0.12 145) / rgb(22, 163, 74);        /* bg-green-600 */
icon: oklch(0.55 0.12 145) / rgb(34, 197, 94);         /* text-green-600 */
```

### Estadísticas Válidas (Verde Éxito)
```css
background: oklch(0.95 0.02 145) / rgb(240, 253, 244); /* bg-green-50 */
border: oklch(0.85 0.05 145) / rgb(187, 247, 208);     /* border-green-200 */
icon-text: oklch(0.55 0.12 145) / rgb(34, 197, 94);    /* text-green-600 */
```

### Estadísticas Normalizadas (Azul Info)
```css
background: oklch(0.95 0.02 220) / rgb(239, 246, 255); /* bg-blue-50 */
border: oklch(0.80 0.05 220) / rgb(191, 219, 254);     /* border-blue-200 */
icon-text: oklch(0.50 0.12 240) / rgb(37, 99, 235);    /* text-blue-600 */
```

### Estadísticas Inválidas (Rojo Destructivo)
```css
background: oklch(0.628 0.258 29 / 0.1);               /* bg-destructive/10 */
border: oklch(0.628 0.258 29 / 0.2);                   /* border-destructive/20 */
icon-text: oklch(0.628 0.258 29);                      /* text-destructive */
```

## Tipografía

### Fuentes
```css
--font-sans: Inter;          /* Fuente principal */
--font-serif: PT Serif;      /* Fuente serif */
--font-mono: Roboto Mono;    /* Fuente monoespaciada para coordenadas */
```

### Enlaces Google Fonts (en index.html)
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter&family=PT+Serif&family=Roboto+Mono&display=swap">
```

### Jerarquía Tipográfica
```css
/* Título principal */
h1: text-3xl md:text-4xl font-semibold tracking-tight

/* Subtítulo */
p (descripción): text-muted-foreground text-sm md:text-base

/* Títulos de tarjetas */
CardTitle: text-2xl font-semibold

/* Descripciones de tarjetas */
CardDescription: text-base text-muted-foreground

/* Texto normal */
text-sm, text-base

/* Coordenadas (monospace) */
font-mono text-xs
```

## Efectos y Sombras

### Sombras
```css
--shadow-color: oklch(0.25 0.02 210);
--shadow-opacity: 0.04;
--shadow-blur: 20px;
--shadow-spread: 0px;
--shadow-offset-x: 0px;
--shadow-offset-y: 4px;
```

### Transiciones
```css
transition-all
duration: 0.3s (para animaciones con framer-motion)
```

### Bordes
```css
border-2 (para elementos destacados)
border (para elementos normales)
border-dashed (para zona de drop)
rounded-lg (para la mayoría de elementos)
```

## Clases Tailwind Específicas

### Botones Primarios
```jsx
<Button size="lg" className="text-lg px-8">
  /* Color primary por defecto */
</Button>
```

### Botones Outline
```jsx
<Button variant="outline" size="lg">
  /* Borde con fondo transparente */
</Button>
```

### Zona de Drop (Drag & Drop)
```jsx
className={`
  border-2 border-dashed rounded-lg p-12
  ${isDragging 
    ? 'border-primary bg-primary/10 scale-[1.02]' 
    : 'border-border hover:border-primary/50 hover:bg-muted/50'
  }
`}
```

### Cards con Bordes Destacados
```jsx
<Card className="border-2 border-primary/20">
```

### Badges
```jsx
<Badge variant="secondary">CSV</Badge>
<Badge className="bg-blue-600 hover:bg-blue-700">EPSG:4326</Badge>
<Badge className="bg-green-600 hover:bg-green-700">UTM30N</Badge>
```

## Iconos (Phosphor Icons)

### Pesos y Tamaños
```jsx
import { Icon } from '@phosphor-icons/react'

<Icon size={20} />              /* Tamaño estándar */
<Icon size={28} />              /* Tamaño para títulos */
<Icon size={32} />              /* Tamaño para estadísticas */
<Icon size={40} />              /* Tamaño grande para zona drop */
<Icon size={48} />              /* Tamaño para steps */

<Icon weight="regular" />       /* Por defecto */
<Icon weight="duotone" />       /* Para zona drop y destacados */
<Icon weight="fill" />          /* Para steps activos */
<Icon weight="bold" />          /* Para botones principales */
```

### Colores de Iconos
```jsx
className="text-primary"        /* Azul principal */
className="text-green-600"      /* Verde éxito */
className="text-blue-600"       /* Azul info */
className="text-destructive"    /* Rojo error */
className="text-muted-foreground" /* Gris atenuado */
```

## Sistema de Steps (Stepper Horizontal)

### Steps Inactivos
```jsx
opacity-40
text-muted-foreground
weight="regular"
```

### Step Activo
```jsx
opacity-100
text-primary
weight="fill"
```

### Step Completado (interactivo)
```jsx
cursor-pointer
hover:scale-105
transition-transform
```

## Animaciones (Framer Motion)

```jsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3 }}
>
```

## Resumen de Paleta en HEX (aproximado)

| Color | Light Mode | Dark Mode | Uso |
|-------|-----------|-----------|-----|
| Background | `#F5F7FA` | `#3D4349` | Fondo principal |
| Primary | `#526D82` | `#A5C9CA` | Botones y acentos |
| Secondary | `#B8CFD8` | `#526D82` | Elementos secundarios |
| Muted | `#B8CFD8` | `#526D82` | Elementos atenuados |
| Blue (Info) | `#2563EB` | `#60A5FA` | Archivo original |
| Green (Success) | `#16A34A` | `#4ADE80` | Archivo convertido |
| Red (Error) | `#DC2626` | `#F87171` | Errores |

## Notas Importantes

1. **Todos los colores están en formato OKLCH** para mejor precisión de color
2. **El sistema usa Tailwind CSS v4** con configuración en `@theme`
3. **Los colores están diseñados** para cumplir WCAG AA en contraste
4. **La paleta es coherente** entre modo claro y oscuro
5. **Se usa un sistema de variables CSS** que permite fácil personalización

## Aplicar en Nueva Versión

Para aplicar estos estilos en otra versión:

1. Copia el contenido de `src/index.css` (variables CSS)
2. Usa las mismas fuentes en `index.html`
3. Importa `@phosphor-icons/react` para iconos
4. Usa `shadcn/ui` para componentes base
5. Aplica las clases Tailwind documentadas arriba
6. Usa `framer-motion` para animaciones suaves
