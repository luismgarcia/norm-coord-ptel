# Guía de Contribución
## Sistema PTEL Coordinate Normalizer

> Guía para contribuir al desarrollo del sistema de normalización de coordenadas PTEL Andalucía.

**Última actualización**: 20 noviembre 2025  
**Versión**: 1.0.0

---

## 📋 Tabla de Contenidos

1. [Código de Conducta](#código-de-conducta)
2. [Cómo Contribuir](#cómo-contribuir)
3. [Configuración del Entorno](#configuración-del-entorno)
4. [Estándares de Código](#estándares-de-código)
5. [Proceso de Pull Request](#proceso-de-pull-request)
6. [Reportar Bugs](#reportar-bugs)
7. [Solicitar Funcionalidades](#solicitar-funcionalidades)

---

## 🤝 Código de Conducta

### Principios

- **Respeto**: Trata a todos los contribuidores con respeto
- **Inclusividad**: Ambiente acogedor para todos
- **Colaboración**: Trabajo en equipo constructivo
- **Profesionalismo**: Comunicación clara y profesional

### Comportamiento Esperado

- Usar lenguaje inclusivo
- Respetar diferentes puntos de vista
- Aceptar críticas constructivas
- Enfocarse en lo mejor para la comunidad
- Mostrar empatía hacia otros miembros

---

## 🚀 Cómo Contribuir

### Formas de Contribuir

1. **Código**: Nuevas funcionalidades, corrección de bugs
2. **Documentación**: Mejoras, traducciones, ejemplos
3. **Testing**: Casos de prueba, validación
4. **Revisión**: Code review de Pull Requests
5. **Datos**: Patrones de coordenadas corruptas, casos edge

### Áreas Prioritarias

- Patrones de normalización UTF-8 (actualmente 27, objetivo 50+)
- Geocodificadores especializados por tipología
- Tests con datos reales de municipios andaluces
- Documentación de casos de uso

---

## ⚙️ Configuración del Entorno

### Prerrequisitos

- Node.js 18+ 
- npm 9+ o pnpm
- Git
- Editor con soporte TypeScript (VSCode recomendado)

### Setup Local

```bash
# 1. Fork del repositorio
# 2. Clonar tu fork
git clone https://github.com/TU-USUARIO/ptel-coordinate-normalizer.git
cd ptel-coordinate-normalizer

# 3. Instalar dependencias
npm install

# 4. Crear rama para tu contribución
git checkout -b feature/mi-contribucion

# 5. Iniciar servidor desarrollo
npm run dev
```

### Estructura del Proyecto

```
src/
├── components/     # Componentes React
├── services/       # Lógica de negocio
├── hooks/          # React hooks personalizados
├── store/          # Estado global (Zustand)
├── types/          # TypeScript types
├── utils/          # Utilidades puras
└── lib/            # Configuración librerías
```

---

## 📝 Estándares de Código

### TypeScript

```typescript
// ✅ Correcto: Interfaces explícitas
interface CoordinateInput {
  x: number;
  y: number;
  crs?: string;
}

// ❌ Incorrecto: any
function process(data: any) { ... }
```

### Nomenclatura

| Tipo | Convención | Ejemplo |
|------|-----------|---------|
| Componentes | PascalCase | `DataTable.tsx` |
| Funciones | camelCase | `normalizeCoordinate()` |
| Constantes | UPPER_SNAKE | `MAX_RETRIES` |
| Types/Interfaces | PascalCase | `CoordinateRecord` |
| Archivos | kebab-case | `coordinate-utils.ts` |

### Documentación

```typescript
/**
 * Normaliza coordenada aplicando correcciones UTF-8
 * 
 * @param input - Coordenada raw a normalizar
 * @returns Coordenada normalizada con metadata
 * 
 * @example
 * ```typescript
 * const result = normalizeCoordinate({ x: 447850, y: 4111234 });
 * ```
 */
function normalizeCoordinate(input: CoordinateInput): NormalizedResult {
  // ...
}
```

### Testing

```typescript
describe('EncodingNormalizer', () => {
  it('should fix UTF-8 mojibake in municipality names', () => {
    const normalizer = new EncodingNormalizer();
    const result = normalizer.normalize('CÃ³rdoba');
    expect(result.normalized).toBe('Córdoba');
  });
  
  it('should detect truncated Y coordinates', () => {
    // Test con datos reales de Colomera
    const result = detectTruncation(77905, 'Granada');
    expect(result.corrected).toBe(4077905);
  });
});
```

---

## 🔄 Proceso de Pull Request

### Antes de Crear PR

1. **Actualizar rama main**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Ejecutar tests**
   ```bash
   npm run test
   npm run lint
   npm run type-check
   ```

3. **Verificar build**
   ```bash
   npm run build
   ```

### Crear Pull Request

1. **Título descriptivo**: `feat: añadir detector de coordenadas ED50`
2. **Descripción completa**:
   - Qué cambia
   - Por qué es necesario
   - Cómo probarlo
   - Screenshots si aplica

### Prefijos de Commit

| Prefijo | Uso |
|---------|-----|
| `feat:` | Nueva funcionalidad |
| `fix:` | Corrección de bug |
| `docs:` | Documentación |
| `style:` | Formato (no afecta código) |
| `refactor:` | Refactorización |
| `test:` | Tests |
| `chore:` | Mantenimiento |

### Ejemplo de Commit

```bash
git commit -m "feat(normalizer): añadir patrón para doble tilde mojibake

- Detecta patrón '´´' como separador decimal corrupto
- Testado con datos reales de Berja, Almería
- Añade 3 tests unitarios

Closes #42"
```

---

## 🐛 Reportar Bugs

### Información Necesaria

1. **Descripción clara** del problema
2. **Pasos para reproducir**
3. **Comportamiento esperado** vs actual
4. **Datos de ejemplo** (anonimizados si necesario)
5. **Entorno**: navegador, versión, SO

### Plantilla de Issue

```markdown
## Descripción
[Descripción clara del bug]

## Pasos para Reproducir
1. Ir a '...'
2. Hacer clic en '...'
3. Ver error

## Comportamiento Esperado
[Qué debería pasar]

## Comportamiento Actual
[Qué pasa realmente]

## Datos de Ejemplo
```
X: 447850
Y: 77905 (truncada)
Municipio: Colomera
```

## Entorno
- Navegador: Chrome 120
- SO: macOS 14
- Versión PTEL: 0.4.0
```

---

## 💡 Solicitar Funcionalidades

### Proceso

1. **Buscar issues existentes** para evitar duplicados
2. **Crear issue** con etiqueta `enhancement`
3. **Describir**:
   - Problema que resuelve
   - Propuesta de solución
   - Alternativas consideradas
   - Impacto estimado

### Prioridades del Proyecto

**Alta prioridad**:
- Mejoras en precisión de normalización
- Nuevos geocodificadores especializados
- Rendimiento con datasets grandes

**Media prioridad**:
- Mejoras de UX
- Documentación adicional
- Soporte nuevos formatos archivo

**Baja prioridad**:
- Cambios estéticos
- Funcionalidades "nice to have"

---

## 📊 Datos para Testing

### Fuentes de Datos Reales

Los contribuidores pueden usar datos anonimizados de:

- **Colomera (Granada)**: Documento ODT con coordenadas truncadas
- **Berja (Almería)**: CSV con mojibake UTF-8
- **Hornos (Jaén)**: DBF con separadores atípicos
- **Guadix (Granada)**: Shapefile con coordenadas completas

### Patrones Conocidos Pendientes

Si encuentras nuevos patrones de corrupción, por favor documéntalos:

```typescript
// Patrón encontrado en [municipio]
{
  input: "504 750´´92",
  expected: 504750.92,
  pattern: "espacio + doble tilde como decimal",
  source: "Berja CSV 2024"
}
```

---

## 🏆 Reconocimiento

Todos los contribuidores serán reconocidos en:
- README.md (sección Contributors)
- Release notes
- Documentación del proyecto

---

**Guía de Contribución** | **v1.0.0**  
**Sistema PTEL Coordinate Normalizer** 🤝
