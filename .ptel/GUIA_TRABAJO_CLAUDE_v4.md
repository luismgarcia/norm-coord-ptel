# Guía de Trabajo con Claude para el Proyecto PTEL
## Versión 4.1 - Actualizada 2025-12-02

---

## Información del proyecto

| Campo | Valor |
|-------|-------|
| **Nombre del repositorio** | `norm-coord-ptel` |
| **URL GitHub** | https://github.com/luismgarcia/norm-coord-ptel |
| **URL Deploy** | https://luismgarcia.github.io/norm-coord-ptel |
| **Ubicación** | `Documents/GitHub/norm-coord-ptel` (detectar en cada dispositivo) |
| **Stack** | React + TypeScript + Vite |
| **Versión actual** | 0.5.2 |
| **Tests** | 921 total (860 passing, 93%) |
| **Tiempo tests** | ~1.6s (con mocks HTTP) |

---

# FASE 1: ANTES DE HABLAR CON CLAUDE

## 1.1 Preparación en tu ordenador

```bash
# Mac
cd ~/Documents/GitHub/norm-coord-ptel

# Windows
cd C:\Users\TuUsuario\Documents\GitHub\norm-coord-ptel
```

## 1.2 Verificar cambios remotos (opcional pero recomendado)

Antes de aplicar cambios, puedes ver qué modificaciones hay en GitHub:

```bash
git fetch origin main                              # Descarga cambios SIN aplicar
git log main..origin/main --oneline                # Ver commits nuevos
git diff main origin/main --stat                   # Ver archivos modificados
```

Si todo está bien, continúa con el paso 1.3.

## 1.3 Sincronización obligatoria

```bash
git pull origin main
npm install      # Solo si hubo cambios en package.json
npm test         # Verificar que pasan todos los tests
```

| Resultado tests | Acción |
|-----------------|--------|
| ✅ Todos pasan | Continuar con Claude |
| ❌ Alguno falla | PARAR. No iniciar sesión hasta resolver |

---

# FASE 2: INICIO DE SESIÓN CON CLAUDE

## 2.1 Mensaje de inicio (copia y pega)

### Opción A: Inicio estándar
```
INICIO SESIÓN PTEL

Proyecto: norm-coord-ptel
Ya hice git pull y npm test pasa OK.

Localiza el repositorio, lee .ptel/ y dime en qué punto estamos.
```

### Opción B: Con rol específico
```
INICIO SESIÓN PTEL

Proyecto: norm-coord-ptel
Ya sincronicé y los tests pasan.

Activa rol [DataMaster / MapWizard / DesignCraft / GitMaster].
Localiza el repositorio, lee .ptel/ y dime el estado del proyecto.
```

### Opción C: Con tarea específica
```
INICIO SESIÓN PTEL

Proyecto: norm-coord-ptel
Ya sincronicé. Hoy quiero trabajar en [ÁREA/TAREA].

Localiza el repo, lee .ptel/ y confirma el estado de esa área.
```

### Opción D: Inicio ultrarrápido
```
INICIO PTEL
Área: [testing/geocoding/ui/learning]
Objetivo: [una línea]
```
Claude lee `.ptel/` automáticamente para el resto del contexto.

---

## 2.2 Protocolo obligatorio de Claude al iniciar

Claude DEBE ejecutar esta secuencia ANTES de leer archivos de estado:

| Paso | Acción | Verificación |
|------|--------|--------------|
| 1 | Listar directorios permitidos | `list_allowed_directories` |
| 2 | Buscar carpeta `norm-coord-ptel` | Nombre exacto |
| 3 | Excluir carpetas de backup | Las que empiezan por `_BACKUP_`, `_OLD_`, `_TEST_` |
| 4 | Verificar que existe `.ptel/` dentro | Confirmación del proyecto correcto |
| 5 | Informar al usuario qué ruta encontró | Transparencia |
| 6 | Leer archivos de estado | `.ptel/*.json` |
| 7 | Reportar resumen | Estado actual + próximas prioridades |

### Si hay ambigüedad

Si Claude encuentra más de una carpeta válida (o ninguna), debe preguntar:

> «He encontrado [X carpetas / ninguna carpeta] que coinciden con el proyecto. ¿Puedes confirmar en qué dispositivo estás y la ruta correcta?»

**Claude NO debe asumir rutas. Siempre detectar dinámicamente.**

---

## 2.3 Estructura de archivos de estado

```
.ptel/
├── PTEL_ESTADO_SESION.json   ← Estado actual del proyecto
├── PTEL_FEATURES.json        ← Lista de funcionalidades y su estado
├── handoff.json              ← Información para la próxima sesión
├── claude-progress.txt       ← Log de progreso (últimas 5-7 sesiones)
├── archive/                  ← Sesiones antiguas (>2 semanas)
│   └── progress-YYYY-MM.txt
├── PTEL_ROLES.md             ← Definición de roles especializados
├── PROMPTS_RAPIDOS.md        ← Comandos frecuentes
├── SYNC_MULTI_DEVICE.md      ← Guía sincronización multi-dispositivo
└── GUIA_TRABAJO_CLAUDE_v4.md ← Esta guía
```

**Regla fundamental**: Estos archivos son la "memoria" de Claude. Si no están actualizados, Claude no sabe dónde estamos.

---

## 2.4 Gestión del archivo claude-progress.txt

Cuando supere ~400 líneas:
1. Mover sesiones >2 semanas a `.ptel/archive/progress-YYYY-MM.txt`
2. Mantener solo últimas 5-7 sesiones en archivo principal
3. Conservar sección de lecciones aprendidas (L1-L8+) siempre visible

---

# FASE 3: DURANTE LA SESIÓN DE TRABAJO

## 3.1 Cómo pedir trabajo a Claude

### ❌ Evitar (demasiado vago):
- "Mejora el código"
- "Arregla los bugs"
- "Continúa con el proyecto"

### ✅ Preferir (específico y acotado):
```
[ÁREA]: geocodificación
[TAREA]: Implementar cliente WFS para centros educativos
[CONTEXTO]: Ya tenemos el cliente de centros sanitarios funcionando
[CRITERIO DE ÉXITO]: Buscar colegios por nombre/municipio y devolver coordenadas UTM
[RESTRICCIONES]: Usar la misma estructura que WFSHealthGeocoder.ts
```

---

## 3.2 Roles especializados

| Rol | Especialidad | Cuándo usarlo |
|-----|--------------|---------------|
| **DataMaster** | Geodesia, validación, tipos TypeScript | Normalización coordenadas, validación INE, calidad datos |
| **MapWizard** | React/TypeScript, APIs geoespaciales | Geocodificadores, integración APIs, lógica negocio |
| **DesignCraft** | UI/UX, Tailwind CSS, componentes | Interfaz usuario, estilos, accesibilidad |
| **GitMaster** | Git, GitHub, CI/CD, sincronización | Commits, conflictos, releases, multi-dispositivo |

### Activar un rol
```
Activa rol [NOMBRE_ROL]. Vamos a trabajar en [tarea específica].
```

---

## 3.3 Cambiar de área de trabajo

```
Vamos a cambiar de [ÁREA ACTUAL] a [NUEVA ÁREA].

Antes de cambiar:
1. Documenta el estado actual de [ÁREA ACTUAL] en .ptel/
2. Lee el contexto de [NUEVA ÁREA]
3. Propón qué hacer en [NUEVA ÁREA]
```

---

## 3.4 Si Claude pierde contexto

### Síntomas:
- Pregunta cosas ya discutidas
- Propone soluciones descartadas
- No recuerda decisiones anteriores

### Solución:
```
Parece que has perdido contexto. Lee estos archivos de GitHub ahora:
1. CLAUDE.md
2. .ptel/PTEL_ESTADO_SESION.json
3. .ptel/claude-progress.txt

Confirma qué entiendes del estado del proyecto.
```

---

# FASE 4: CIERRE DE SESIÓN

## 4.1 Cuándo cerrar

- Al terminar de trabajar por el día
- Al cambiar de ordenador
- Si la conversación supera 30-40 mensajes
- Antes de cambiar de tema completamente

## 4.2 Mensaje de cierre (copia y pega)

```
CIERRE SESIÓN PTEL

Necesito que:
1. Actualices .ptel/PTEL_ESTADO_SESION.json con el estado actual
2. Añadas entrada a .ptel/claude-progress.txt
3. Actualices .ptel/PTEL_FEATURES.json si completamos alguna feature
4. Actualices .ptel/handoff.json para la próxima sesión
5. Hagas commit con mensaje descriptivo
6. Hagas git push

Resume qué queda pendiente para la próxima sesión.
```

## 4.3 Lo que Claude debe hacer al cerrar

1. Verificar que `npm test` pasa
2. Actualizar todos los archivos de estado
3. Commit con mensaje descriptivo
4. Push a GitHub
5. Proporcionar resumen de:
   - Lo completado
   - Lo que quedó a medias
   - Prioridades para próxima sesión

---

# REGLAS DE SINCRONIZACIÓN MULTI-DISPOSITIVO

## Ubicaciones por dispositivo

| Dispositivo | Ruta base típica |
|-------------|------------------|
| Mac | `~/Documents/GitHub/norm-coord-ptel` |
| Windows | `C:\Users\[USER]\Documents\GitHub\norm-coord-ptel` |

## Nomenclatura obligatoria de carpetas

| Tipo | Formato | Ejemplo |
|------|---------|--------|
| **Repo activo** | `norm-coord-ptel` | Solo este nombre, sin sufijos |
| **Backup** | `_BACKUP_norm-coord-ptel_FECHA` | `_BACKUP_norm-coord-ptel_2025-12-01` |
| **Versión antigua** | `_OLD_norm-coord-ptel` | Para versiones descartadas |
| **Experimento** | `_TEST_norm-coord-ptel-xxx` | Para pruebas aisladas |

⚠️ **Los backups deben ir FUERA de la carpeta GitHub** para evitar confusiones:

```
Documents/
├── GitHub/
│   └── norm-coord-ptel/           ← ÚNICO repo activo
└── _Backups_Repos/
    └── _BACKUP_norm-coord-ptel_2025-12-01/
```

## Reglas de oro

| Momento | Comando | Por qué |
|---------|---------|--------|
| **Al EMPEZAR** | `git pull` → `npm install` → `npm test` | Sincronizar y verificar |
| **Al TERMINAR** | `git add .` → `git commit` → `git push` | Subir cambios |

| Qué | Regla |
|-----|-------|
| `node_modules/` | NUNCA se sube (cada máquina hace `npm install`) |
| `dist/` | No se sube (se genera con `npm run build`) |
| Archivos grandes | NO van a Git (usar Drive si necesario) |
| Estado sesión | Siempre en `.ptel/` |

---

# SISTEMA DE TESTS

## Tests con mocks HTTP (por defecto)

El proyecto incluye mocks que eliminan dependencia de servicios externos:

```bash
npm test                    # Ejecuta tests con mocks (~1.6s)
```

- **Tiempo**: 187s → 1.6s (mejora 99%)
- **Archivos**: `src/lib/__tests__/setup.ts`, `__mocks__/wfsResponses.ts`
- **Documentación**: `src/lib/__tests__/MOCKS_README.md`

## Tests con red real (opcional)

```bash
PTEL_REAL_NETWORK=true npm test    # Usa servicios WFS/Overpass reales
```

Solo usar cuando se necesite validar respuestas reales de APIs.

---

# MENSAJES DE EMERGENCIA

### "No entiendo dónde estamos"
```
Para. Lee CLAUDE.md y todos los archivos en .ptel/ de GitHub.
Dame un resumen completo del estado del proyecto.
```

### "Esto no es lo que pedí"
```
Eso no es correcto. Lo que necesito es [descripción clara].
¿Puedes intentarlo de nuevo?
```

### "Los tests fallan"
```
npm test está fallando con este error:
[pegar error]

Corrige esto antes de continuar. No hagas commit hasta que pasen.
```

### "Necesito que recuerdes esto"
```
IMPORTANTE para futuras sesiones: [información crítica].
Añade esto a .ptel/claude-progress.txt.
```

---

# CHECKLIST RÁPIDO

## Al empezar ☐
- [ ] `git fetch` + revisar cambios (opcional)
- [ ] `git pull` ejecutado
- [ ] `npm test` pasa OK
- [ ] Mensaje de inicio enviado
- [ ] Claude confirmó la ruta del proyecto
- [ ] Claude leyó `.ptel/` y reportó estado

## Durante ☐
- [ ] Peticiones específicas y acotadas
- [ ] Verifico código antes de pasar a otra cosa
- [ ] Si cambio de área, uso protocolo de cambio

## Al cerrar ☐
- [ ] `npm test` pasa antes de commit
- [ ] Mensaje de cierre enviado
- [ ] Claude actualizó archivos `.ptel/`
- [ ] Commit hecho con mensaje descriptivo
- [ ] Push a GitHub completado
- [ ] Sé qué toca en la próxima sesión

---

# LECCIONES APRENDIDAS (PERSISTENTES)

Estas lecciones se mantienen siempre visibles:

| ID | Lección | Contexto |
|----|---------|----------|
| L1 | Validar datos contra fuente autoritativa | Códigos INE erróneos en tests |
| L2 | Preservar estructura semántica al normalizar | `normalizarTexto()` eliminaba separadores |
| L3 | Tests con múltiples casos edge | Detectar regresiones temprano |
| L4 | Ubicación canónica del repositorio | Detectar dinámicamente, no asumir |
| L5 | Tests de integridad referencial | Previenen errores en datos estáticos |
| L6 | Commits frecuentes | Evitan perder visibilidad del progreso |
| L7 | Timeouts ocultan causa raíz | Con mocks se ven problemas reales |
| L8 | Tests integridad previenen errores silenciosos | 233 validaciones estructurales |

---

# RESUMEN DE UNA PÁGINA

| Fase | Acción | Mensaje clave |
|------|--------|---------------|
| **1. Preparar** | git fetch + git pull + npm test | Verificar sincronización |
| **2. Inicio** | Dar contexto + nombre proyecto | "INICIO SESIÓN PTEL, proyecto: norm-coord-ptel" |
| **3. Trabajo** | Ser específico | "[ÁREA] + [TAREA] + [CRITERIO]" |
| **4. Bloqueo** | Recargar contexto | "Lee CLAUDE.md y .ptel/, has perdido contexto" |
| **5. Cambio área** | Documentar antes | "Documenta [ACTUAL], luego cambiamos a [NUEVA]" |
| **6. Cierre** | Actualizar estado | "Actualiza .ptel/, commit + push, resume pendientes" |

---

*Última actualización: 2025-12-02*
*Versión: 4.1*
*Proyecto PTEL - 860/921 tests passing (93%)*
