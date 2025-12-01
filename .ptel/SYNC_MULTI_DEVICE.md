# 🔄 Guía de Trabajo Multi-Dispositivo PTEL

## Dispositivos configurados
- **Mac**: `/Users/lm/Documents/GitHub/norm-coord-ptel`
- **Windows**: `C:\Users\[USER]\Documents\GitHub\norm-coord-ptel`

---

## ⚡ Comandos esenciales

### Al INICIAR sesión de trabajo
```bash
cd ~/Documents/GitHub/norm-coord-ptel   # Mac
cd C:\Users\[USER]\Documents\GitHub\norm-coord-ptel  # Windows

# 1. Ver qué cambió en remoto (opcional pero recomendado)
git fetch origin main
git log main..origin/main --oneline      # Commits nuevos
git diff main origin/main --stat         # Archivos modificados

# 2. Aplicar cambios
git pull origin main
npm install   # Solo si package.json cambió
npm test      # Verificar que todo funciona
```

### Al TERMINAR sesión de trabajo
```bash
git add .
git commit -m "feat/fix/docs: descripción breve"
git push origin main
```

---

## 📁 Estructura de archivos

### ✅ VAN a GitHub (se sincronizan)
- `src/` - Código fuente
- `.ptel/` - Estado del proyecto y handoffs
- `docs/` - Documentación
- `package.json` - Dependencias
- Tests, configs, etc.

### ❌ NO van a GitHub (locales)
- `node_modules/` - Se regenera con `npm install`
- `data-local/` - Documentos municipales originales
- `backup_*/` - Backups locales
- Archivos `.odt`, `.pdf` grandes

---

## 📍 Nomenclatura de carpetas

| Tipo | Formato | Ejemplo |
|------|---------|--------|
| **Repo activo** | `norm-coord-ptel` | Solo este nombre |
| **Backup** | `_BACKUP_norm-coord-ptel_FECHA` | `_BACKUP_norm-coord-ptel_2025-12-01` |
| **Versión antigua** | `_OLD_norm-coord-ptel` | Para versiones descartadas |
| **Experimento** | `_TEST_norm-coord-ptel-xxx` | Para pruebas aisladas |

⚠️ **Los backups van FUERA de `Documents/GitHub/`**

---

## 🚨 Resolución de conflictos

Si Git detecta conflictos al hacer pull:

1. **Opción segura**: Guardar cambios locales
   ```bash
   git stash
   git pull origin main
   git stash pop
   ```

2. **Si hay conflicto real**: Editar archivo, buscar `<<<<<<<` y resolver

---

## 📋 Checklist cambio de dispositivo

- [ ] `git fetch` + revisar cambios (opcional)
- [ ] `git pull` en nuevo dispositivo
- [ ] `npm install` si es primera vez o cambió package.json
- [ ] `npm test` para verificar
- [ ] Leer `.ptel/PTEL_ESTADO_SESION.json` para contexto
- [ ] Al terminar: commit + push

---

## 🔐 Tokens y credenciales

Cada dispositivo necesita configurar:
- `gh auth login` - GitHub CLI
- Claude Desktop con MCP configurado

**NUNCA** guardar tokens en archivos del repo.

---

Última actualización: 2025-12-01