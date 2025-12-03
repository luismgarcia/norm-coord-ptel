#!/usr/bin/env python3
"""
download_dera_actions.py

Versión optimizada para GitHub Actions del descargador DERA.
Más robusto, con reintentos y logging detallado.

@version 1.0.0
@date 2025-12-03
"""

import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from urllib.parse import urlencode

import requests

# ============================================================================
# CONFIGURACIÓN
# ============================================================================

OUTPUT_DIR = Path("public/data/dera")
METADATA_FILE = Path("public/data/metadata.json")

MAX_RETRIES = 3
RETRY_DELAY = 5  # segundos
REQUEST_TIMEOUT = 60  # segundos

WFS_LAYERS = {
    "health": [
        ("https://www.ideandalucia.es/services/DERA_g12_servicios/wfs", 
         "DERA_g12_servicios:g12_01_CentroSalud", "CAP"),
        ("https://www.ideandalucia.es/services/DERA_g12_servicios/wfs", 
         "DERA_g12_servicios:g12_02_Hospital_CAE", "Hospitales"),
    ],
    "security": [
        ("https://www.ideandalucia.es/services/DERA_g12_servicios/wfs",
         "DERA_g12_servicios:g12_26_Policia", "Policía"),
        ("https://www.ideandalucia.es/services/DERA_g12_servicios/wfs",
         "DERA_g12_servicios:g12_29_ParqueBomberos", "Bomberos"),
        ("https://www.ideandalucia.es/services/DERA_g12_servicios/wfs",
         "DERA_g12_servicios:g12_34_GuardiaCivil", "Guardia Civil"),
    ],
    "education": [
        ("https://www.ideandalucia.es/services/DERA_g12_servicios/wfs",
         "DERA_g12_servicios:g12_05_CentroEducativo", "Centros Educativos"),
    ],
    "municipal": [
        ("https://www.ideandalucia.es/services/DERA_g12_servicios/wfs",
         "DERA_g12_servicios:g12_32_CentrosJuntaAndalucia", "Centros Junta"),
        ("https://www.ideandalucia.es/services/DERA_g12_servicios/wfs",
         "DERA_g12_servicios:g12_11_Ayuntamiento", "Ayuntamientos"),
    ],
    "emergency": [
        ("https://www.ideandalucia.es/services/DERA_g12_servicios/wfs",
         "DERA_g12_servicios:g12_35_GestionEmergencias", "Centros Emergencias"),
    ],
    "energy": [
        ("https://www.ideandalucia.es/services/DERA_g10_infra_energetica/wfs",
         "DERA_g10_infra_energetica:g10_02_ParqueEolico", "Parques Eólicos"),
    ],
}

# ============================================================================
# FUNCIONES
# ============================================================================

def log(msg: str, level: str = "INFO"):
    """Log con timestamp."""
    ts = datetime.now().strftime("%H:%M:%S")
    prefix = {"INFO": "📊", "OK": "✅", "WARN": "⚠️", "ERROR": "❌"}.get(level, "")
    print(f"[{ts}] {prefix} {msg}")


def fetch_wfs(url: str, layer: str) -> dict:
    """Descarga una capa WFS con reintentos."""
    params = {
        "SERVICE": "WFS",
        "VERSION": "2.0.0",
        "REQUEST": "GetFeature",
        "TYPENAME": layer,
        "OUTPUTFORMAT": "application/json",
        "SRSNAME": "EPSG:25830",
    }
    
    full_url = f"{url}?{urlencode(params)}"
    
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            log(f"Descargando {layer} (intento {attempt}/{MAX_RETRIES})...")
            response = requests.get(full_url, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()
            
            data = response.json()
            count = len(data.get("features", []))
            log(f"{layer}: {count} features", "OK")
            return data
            
        except requests.exceptions.Timeout:
            log(f"Timeout en {layer}", "WARN")
        except requests.exceptions.HTTPError as e:
            log(f"HTTP Error {e.response.status_code} en {layer}", "WARN")
        except requests.exceptions.RequestException as e:
            log(f"Error de red en {layer}: {e}", "WARN")
        except json.JSONDecodeError:
            log(f"Respuesta no válida JSON en {layer}", "WARN")
        
        if attempt < MAX_RETRIES:
            log(f"Reintentando en {RETRY_DELAY}s...")
            time.sleep(RETRY_DELAY)
    
    log(f"Falló descarga de {layer} después de {MAX_RETRIES} intentos", "ERROR")
    return {"type": "FeatureCollection", "features": []}


def merge_features(layers: list) -> dict:
    """Combina features de múltiples capas."""
    all_features = []
    
    for url, layer, desc in layers:
        data = fetch_wfs(url, layer)
        features = data.get("features", [])
        
        # Añadir metadata de origen
        for f in features:
            if "properties" not in f:
                f["properties"] = {}
            f["properties"]["_source"] = desc
        
        all_features.extend(features)
    
    return {
        "type": "FeatureCollection",
        "features": all_features,
        "crs": {
            "type": "name",
            "properties": {"name": "EPSG:25830"}
        }
    }


def save_geojson(data: dict, filename: str) -> int:
    """Guarda GeoJSON y retorna count."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUTPUT_DIR / filename
    
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    
    count = len(data.get("features", []))
    size_kb = path.stat().st_size / 1024
    log(f"Guardado {filename}: {count} features ({size_kb:.1f} KB)", "OK")
    return count


def update_metadata(stats: dict):
    """Actualiza archivo de metadata."""
    METADATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    
    metadata = {
        "lastUpdate": datetime.now().isoformat(),
        "source": "IDEAndalucía DERA WFS",
        "crs": "EPSG:25830",
        "layers": stats,
        "totalFeatures": sum(stats.values()),
    }
    
    with open(METADATA_FILE, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    
    log(f"Metadata actualizado: {sum(stats.values())} features totales", "OK")


# ============================================================================
# MAIN
# ============================================================================

def main():
    log("=== Descarga DERA para GitHub Actions ===")
    log(f"Directorio destino: {OUTPUT_DIR}")
    
    stats = {}
    
    for category, layers in WFS_LAYERS.items():
        log(f"\n--- Procesando {category} ---")
        data = merge_features(layers)
        count = save_geojson(data, f"{category}.geojson")
        stats[category] = count
    
    update_metadata(stats)
    
    log("\n=== Resumen ===")
    total = 0
    for cat, count in stats.items():
        log(f"  {cat}: {count}")
        total += count
    log(f"  TOTAL: {total} features")
    
    # Exit code basado en éxito
    if total > 0:
        log("\nDescarga completada exitosamente", "OK")
        sys.exit(0)
    else:
        log("\nNo se descargaron features", "ERROR")
        sys.exit(1)


if __name__ == "__main__":
    main()
