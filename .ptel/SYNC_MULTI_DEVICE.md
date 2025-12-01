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

- [ ] `git pull` en nuevo dispositivo
- [ ] `npm install` si es primera vez o cambió package.json
- [ ] `npm test` para verificar (59 tests deben pasar)
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
