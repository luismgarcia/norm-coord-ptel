# Prompts Rápidos PTEL

## INICIO DE SESIÓN

Copia y pega esto al comenzar una nueva conversación:

```
INICIO SESIÓN PTEL

Proyecto: norm-coord-ptel
Ya hice git pull y npm test pasa OK.

Localiza el repositorio, lee .ptel/ y dime en qué punto estamos.
```

### Con rol específico:
```
INICIO SESIÓN PTEL

Proyecto: norm-coord-ptel
Ya sincronicé y los tests pasan.

Activa rol [DataMaster / MapWizard / DesignCraft / GitMaster].
Localiza el repositorio, lee .ptel/ y dime el estado del proyecto.
```

---

## PROTOCOLO OBLIGATORIO DE CLAUDE

Al recibir "INICIO SESIÓN PTEL", Claude DEBE:

1. `list_allowed_directories` → Listar directorios permitidos
2. Buscar carpeta `norm-coord-ptel` (nombre exacto)
3. **EXCLUIR** carpetas: `_BACKUP_*`, `_OLD_*`, `_TEST_*`
4. Verificar que existe `.ptel/` dentro
5. Informar al usuario qué ruta encontró
6. Leer archivos de estado
7. Reportar resumen + próximas prioridades

**NO asumir rutas. Detectar dinámicamente.**

---

## SINCRONIZACIÓN MULTI-DISPOSITIVO

**Reglas de oro** (ver SYNC_MULTI_DEVICE.md para detalles):

| Momento | Comando |
|---------|---------|
| Al EMPEZAR | `git pull` → `npm install` → `npm test` |
| Al TERMINAR | `git add .` → `git commit` → `git push` |

### Nomenclatura de carpetas

| Tipo | Formato |
|------|---------|
| **Repo activo** | `norm-coord-ptel` (solo este nombre) |
| **Backup** | `_BACKUP_norm-coord-ptel_FECHA` |
| **Versión antigua** | `_OLD_norm-coord-ptel` |

⚠️ Backups van FUERA de `Documents/GitHub/`

---

## ACTIVACIÓN DE ROL

### DataMaster (Datos y Geodesia)
```
Activa rol DATAMASTER
Vamos a trabajar en [tarea de datos/validación].
```

### MapWizard (APIs y Código)
```
Activa rol MAPWIZARD
Vamos a trabajar en [tarea de código/APIs].
```

### DesignCraft (Diseño UI/UX)
```
Activa rol DESIGNCRAFT
Vamos a trabajar en [tarea de interfaz].
```

### GitMaster (Git/GitHub/CI-CD)
```
Activa rol GITMASTER
Vamos a trabajar en [tarea de repositorio/sincronización].
```

---

## CIERRE DE SESIÓN

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

---

## VERIFICACIÓN RÁPIDA

```
ESTADO PTEL

Muestra:
- Versión actual
- Fase y progreso
- Features completadas vs pendientes
- Última sesión y siguiente prioridad
```

---

## EMERGENCIAS

### Si Claude pierde contexto:
```
Para. Lee CLAUDE.md y todos los archivos en .ptel/ de GitHub.
Dame un resumen completo del estado del proyecto.
```

### Si los tests fallan:
```
npm test falla con este error: [pegar error]
Corrige antes de continuar. No hacer commit hasta que pasen.
```

---

*Ver guía completa en: `.ptel/GUIA_TRABAJO_CLAUDE_v4.md`*