#!/usr/bin/env python3
"""
download_dera.py

Script para descargar datos WFS de DERA (Datos Espaciales de Referencia de Andalucía)
para el sistema offline del proyecto PTEL.

USO:
    python download_dera.py                    # Descargar todas las capas
    python download_dera.py --layer health     # Solo centros sanitarios
    python download_dera.py --output ./data    # Directorio personalizado

CAPAS DISPONIBLES:
    health      - Centros de salud y hospitales (DERA g12)
    education   - Centros educativos (API Datos Abiertos)
    security    - Instalaciones seguridad (ISE)
    heritage    - Patrimonio cultural (IAPH)
    energy      - Infraestructuras energéticas (DERA g10)
    hydraulic   - Infraestructuras hidráulicas (DERA)
    sports      - Instalaciones deportivas (DERA)

RESULTADO:
    Archivos GeoJSON en public/data/dera/
    Aproximadamente 5-10 MB comprimido

@version 1.0.0
@date 2025-12-03
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Optional
from urllib.parse import urlencode

try:
    import requests
except ImportError:
    print("ERROR: requests no instalado. Ejecuta: pip install requests")
    sys.exit(1)

# ============================================================================
# CONFIGURACIÓN
# ============================================================================

WFS_CONFIG = {
    "health": {
        "name": "Centros Sanitarios",
        "urls": [
            {
                "url": "https://www.ideandalucia.es/services/DERA_g12_servicios/wfs",
                "layer": "DERA_g12_servicios:g12_01_CentroSalud",
                "description": "Centros de Atención Primaria"
            },
            {
                "url": "https://www.ideandalucia.es/services/DERA_g12_servicios/wfs",
                "layer": "DERA_g12_servicios:g12_02_Hospital_CAE",
                "description": "Hospitales y CAE"
            }
        ]
    },
    "security": {
        "name": "Instalaciones de Seguridad",
        "urls": [
            {
                "url": "https://www.ideandalucia.es/services/DERA_g12_servicios/wfs",
                "layer": "DERA_g12_servicios:g12_26_Policia",
                "description": "Comisarías de Policía"
            },
            {
                "url": "https://www.ideandalucia.es/services/DERA_g12_servicios/wfs",
                "layer": "DERA_g12_servicios:g12_29_ParqueBomberos",
                "description": "Parques de Bomberos"
            },
            {
                "url": "https://www.ideandalucia.es/services/DERA_g12_servicios/wfs",
                "layer": "DERA_g12_servicios:g12_34_GuardiaCivil",
                "description": "Guardia Civil"
            },
            {
                "url": "https://www.ideandalucia.es/services/DERA_g12_servicios/wfs",
                "layer": "DERA_g12_servicios:g12_35_GestionEmergencias",
                "description": "Gestión Emergencias PTEAnd"
            }
        ]
    },
    "energy": {
        "name": "Infraestructuras Energéticas",
        "urls": [
            {
                "url": "https://www.ideandalucia.es/services/DERA_g10_infra_energetica/wfs",
                "layer": "DERA_g10_infra_energetica:g10_02_ParqueEolico",
                "description": "Parques Eólicos"
            }
        ]
    },
    "education": {
        "name": "Centros Educativos",
        "urls": [
            {
                "url": "https://www.ideandalucia.es/services/DERA_g12_servicios/wfs",
                "layer": "DERA_g12_servicios:g12_05_CentroEducativo",
                "description": "Centros Educativos"
            }
        ]
    },
    "municipal": {
        "name": "Servicios Municipales",
        "urls": [
            {
                "url": "https://www.ideandalucia.es/services/DERA_g12_servicios/wfs",
                "layer": "DERA_g12_servicios:g12_11_Ayuntamiento",
                "description": "Ayuntamientos"
            }
        ]
    }
}

DEFAULT_OUTPUT_DIR = Path(__file__).parent.parent.parent / "public" / "data" / "dera"
REQUEST_TIMEOUT = 60  # segundos
BATCH_SIZE = 1000  # features por petición


# ============================================================================
# FUNCIONES DE DESCARGA
# ============================================================================

def build_wfs_url(base_url: str, layer: str, cql_filter: Optional[str] = None, 
                  start_index: int = 0, count: int = BATCH_SIZE) -> str:
    """Construye URL de petición WFS GetFeature."""
    params = {
        "service": "WFS",
        "version": "2.0.0",
        "request": "GetFeature",
        "typeName": layer,
        "outputFormat": "application/json",
        "srsName": "EPSG:25830",
        "startIndex": str(start_index),
        "count": str(count)
    }
    
    if cql_filter:
        params["CQL_FILTER"] = cql_filter
    
    return f"{base_url}?{urlencode(params)}"


def fetch_wfs_features(url: str, layer: str, description: str, 
                       cql_filter: Optional[str] = None) -> dict:
    """Descarga todas las features de una capa WFS con paginación."""
    all_features = []
    start_index = 0
    total_features = None
    
    print(f"\n  📡 {description}")
    print(f"     Capa: {layer}")
    
    while True:
        request_url = build_wfs_url(url, layer, cql_filter, start_index, BATCH_SIZE)
        
        try:
            response = requests.get(request_url, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()
            data = response.json()
            
            features = data.get("features", [])
            if not features:
                break
                
            all_features.extend(features)
            
            # Primera petición: obtener total
            if total_features is None:
                total_features = data.get("numberMatched", data.get("totalFeatures", "?"))
                print(f"     Total esperado: {total_features}")
            
            print(f"     Descargados: {len(all_features)} features")
            
            # Si devolvió menos del batch, terminamos
            if len(features) < BATCH_SIZE:
                break
                
            start_index += BATCH_SIZE
            time.sleep(0.5)  # Rate limiting
            
        except requests.exceptions.RequestException as e:
            print(f"     ❌ Error: {e}")
            break
    
    return {
        "type": "FeatureCollection",
        "features": all_features,
        "numberMatched": len(all_features),
        "source": layer,
        "downloadedAt": datetime.utcnow().isoformat() + "Z"
    }


def download_layer(layer_key: str, output_dir: Path) -> bool:
    """Descarga una capa completa y guarda en GeoJSON."""
    if layer_key not in WFS_CONFIG:
        print(f"❌ Capa desconocida: {layer_key}")
        return False
    
    config = WFS_CONFIG[layer_key]
    print(f"\n🔄 Descargando: {config['name']}")
    
    all_features = []
    
    for source in config["urls"]:
        result = fetch_wfs_features(
            source["url"],
            source["layer"],
            source["description"],
            source.get("cql_filter")
        )
        all_features.extend(result.get("features", []))
    
    # Guardar resultado
    output_file = output_dir / f"{layer_key}.geojson"
    geojson = {
        "type": "FeatureCollection",
        "features": all_features,
        "metadata": {
            "layer": layer_key,
            "name": config["name"],
            "featuresCount": len(all_features),
            "downloadedAt": datetime.utcnow().isoformat() + "Z",
            "sources": [s["layer"] for s in config["urls"]]
        }
    }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(geojson, f, ensure_ascii=False, indent=2)
    
    file_size = output_file.stat().st_size / 1024
    print(f"  ✅ Guardado: {output_file.name} ({len(all_features)} features, {file_size:.1f} KB)")
    
    return True


def download_all(output_dir: Path) -> dict:
    """Descarga todas las capas disponibles."""
    results = {}
    
    for layer_key in WFS_CONFIG.keys():
        success = download_layer(layer_key, output_dir)
        results[layer_key] = success
    
    return results


# ============================================================================
# CLI
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Descarga datos DERA para sistema offline PTEL"
    )
    parser.add_argument(
        "--layer", "-l",
        choices=list(WFS_CONFIG.keys()) + ["all"],
        default="all",
        help="Capa a descargar (default: all)"
    )
    parser.add_argument(
        "--output", "-o",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help=f"Directorio de salida (default: {DEFAULT_OUTPUT_DIR})"
    )
    parser.add_argument(
        "--list", "-L",
        action="store_true",
        help="Listar capas disponibles"
    )
    
    args = parser.parse_args()
    
    if args.list:
        print("\n📋 Capas disponibles:\n")
        for key, config in WFS_CONFIG.items():
            print(f"  {key:12} - {config['name']}")
            for source in config["urls"]:
                print(f"                └─ {source['description']}")
        return 0
    
    # Crear directorio de salida
    args.output.mkdir(parents=True, exist_ok=True)
    
    print(f"""
╔══════════════════════════════════════════════════════════════════╗
║           DESCARGA DATOS DERA - PTEL ANDALUCÍA                   ║
╚══════════════════════════════════════════════════════════════════╝
  Directorio: {args.output}
  Capas: {args.layer if args.layer != 'all' else ', '.join(WFS_CONFIG.keys())}
""")
    
    start_time = time.time()
    
    if args.layer == "all":
        results = download_all(args.output)
    else:
        results = {args.layer: download_layer(args.layer, args.output)}
    
    elapsed = time.time() - start_time
    
    # Resumen
    success = sum(1 for v in results.values() if v)
    total = len(results)
    
    print(f"""
╔══════════════════════════════════════════════════════════════════╗
║                        RESUMEN                                    ║
╠══════════════════════════════════════════════════════════════════╣
  ✅ Completadas: {success}/{total}
  ⏱️  Tiempo: {elapsed:.1f}s
  📁 Archivos en: {args.output}
╚══════════════════════════════════════════════════════════════════╝
""")
    
    return 0 if success == total else 1


if __name__ == "__main__":
    sys.exit(main())
