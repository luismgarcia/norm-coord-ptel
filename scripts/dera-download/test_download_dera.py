#!/usr/bin/env python3
"""
test_download_dera.py

Tests unitarios y de integración para el script de descarga DERA.
Ejecutar con: pytest test_download_dera.py -v

@version 1.0.0
@date 2025-12-03
"""

import json
import pytest
import requests
from pathlib import Path
from unittest.mock import patch, MagicMock
from urllib.parse import urlencode

# Importar módulo a testear
from download_dera_actions import (
    WFS_LAYERS,
    OUTPUT_DIR,
    MAX_RETRIES,
    fetch_wfs,
    merge_features,
)


# ============================================================================
# TESTS DE CONFIGURACIÓN
# ============================================================================

class TestConfiguracion:
    """Tests de configuración del script."""
    
    def test_wfs_layers_tiene_6_categorias(self):
        """WFS_LAYERS debe tener exactamente 6 categorías."""
        categorias_esperadas = {'health', 'security', 'education', 'municipal', 'emergency', 'energy'}
        assert set(WFS_LAYERS.keys()) == categorias_esperadas
    
    def test_cada_categoria_tiene_al_menos_una_capa(self):
        """Cada categoría debe tener al menos una capa configurada."""
        for categoria, capas in WFS_LAYERS.items():
            assert len(capas) >= 1, f"Categoría '{categoria}' no tiene capas"
    
    def test_formato_tuplas_capas(self):
        """Cada capa debe ser tupla de (url, nombre_capa, descripcion)."""
        for categoria, capas in WFS_LAYERS.items():
            for capa in capas:
                assert isinstance(capa, tuple), f"Capa en '{categoria}' no es tupla"
                assert len(capa) == 3, f"Tupla en '{categoria}' debe tener 3 elementos"
                url, nombre, desc = capa
                assert url.startswith('https://'), f"URL inválida en '{categoria}'"
                assert 'DERA' in nombre, f"Nombre de capa inválido en '{categoria}'"
                assert len(desc) > 0, f"Descripción vacía en '{categoria}'"
    
    def test_urls_son_ideandalucia(self):
        """Todas las URLs deben ser de ideandalucia.es."""
        for categoria, capas in WFS_LAYERS.items():
            for url, _, _ in capas:
                assert 'ideandalucia.es' in url, f"URL no es de IDEAndalucía: {url}"


# ============================================================================
# TESTS DE NOMBRES DE CAPAS (crítico - el bug que encontramos)
# ============================================================================

class TestNombresCapas:
    """Tests para verificar nombres correctos de capas WFS."""
    
    # Nombres correctos verificados el 2025-12-03
    CAPAS_CORRECTAS = {
        'health': [
            'DERA_g12_servicios:g12_01_CentroSalud',
            'DERA_g12_servicios:g12_02_Hospital_CAE',
        ],
        'security': [
            'DERA_g12_servicios:g12_26_Policia',
            'DERA_g12_servicios:g12_29_ParqueBomberos',
            'DERA_g12_servicios:g12_34_GuardiaCivil',
        ],
        'education': [
            'DERA_g12_servicios:g12_05_CentroEducativo',  # NO g12_03
        ],
        'municipal': [
            'DERA_g12_servicios:g12_32_CentrosJuntaAndalucia',
            'DERA_g12_servicios:g12_11_Ayuntamiento',
        ],
        'emergency': [
            'DERA_g12_servicios:g12_35_GestionEmergencias',
        ],
        'energy': [
            'DERA_g10_infra_energetica:g10_02_ParqueEolico',  # NO g10_05
        ],
    }
    
    def test_nombres_capas_correctos(self):
        """Verificar que los nombres de capas son los correctos."""
        for categoria, capas_esperadas in self.CAPAS_CORRECTAS.items():
            capas_configuradas = [nombre for _, nombre, _ in WFS_LAYERS[categoria]]
            for capa_esperada in capas_esperadas:
                assert capa_esperada in capas_configuradas, \
                    f"Falta capa '{capa_esperada}' en categoría '{categoria}'"
    
    def test_no_usar_nombres_antiguos_incorrectos(self):
        """Verificar que NO se usan los nombres antiguos incorrectos."""
        nombres_incorrectos = [
            'g12_03_CentroEducativo',  # Correcto: g12_05
            'g10_05_ParqueEolico',     # Correcto: g10_02
        ]
        for categoria, capas in WFS_LAYERS.items():
            for _, nombre, _ in capas:
                for incorrecto in nombres_incorrectos:
                    assert incorrecto not in nombre, \
                        f"Nombre incorrecto '{incorrecto}' encontrado en '{categoria}'"


# ============================================================================
# TESTS DE ACCESIBILIDAD WFS (integración - requiere red)
# ============================================================================

@pytest.mark.integration
class TestAccesibilidadWFS:
    """Tests de integración que verifican acceso real a servicios WFS."""
    
    @pytest.fixture
    def timeout(self):
        return 30  # segundos
    
    def test_servicio_g12_servicios_accesible(self, timeout):
        """El servicio DERA_g12_servicios debe estar accesible."""
        url = "https://www.ideandalucia.es/services/DERA_g12_servicios/wfs"
        params = {"SERVICE": "WFS", "REQUEST": "GetCapabilities"}
        response = requests.get(url, params=params, timeout=timeout)
        assert response.status_code == 200
        assert 'WFS_Capabilities' in response.text or 'FeatureTypeList' in response.text
    
    def test_servicio_g10_energia_accesible(self, timeout):
        """El servicio DERA_g10_infra_energetica debe estar accesible."""
        url = "https://www.ideandalucia.es/services/DERA_g10_infra_energetica/wfs"
        params = {"SERVICE": "WFS", "REQUEST": "GetCapabilities"}
        response = requests.get(url, params=params, timeout=timeout)
        assert response.status_code == 200
    
    def test_capa_centros_salud_existe(self, timeout):
        """La capa g12_01_CentroSalud debe existir y devolver features."""
        url = "https://www.ideandalucia.es/services/DERA_g12_servicios/wfs"
        params = {
            "SERVICE": "WFS",
            "VERSION": "2.0.0",
            "REQUEST": "GetFeature",
            "TYPENAME": "DERA_g12_servicios:g12_01_CentroSalud",
            "OUTPUTFORMAT": "application/json",
            "COUNT": "1",
        }
        response = requests.get(url, params=params, timeout=timeout)
        assert response.status_code == 200
        data = response.json()
        assert data.get('type') == 'FeatureCollection'
        assert 'features' in data
    
    def test_capa_educacion_nombre_correcto(self, timeout):
        """La capa g12_05_CentroEducativo (NO g12_03) debe existir."""
        url = "https://www.ideandalucia.es/services/DERA_g12_servicios/wfs"
        params = {
            "SERVICE": "WFS",
            "VERSION": "2.0.0",
            "REQUEST": "GetFeature",
            "TYPENAME": "DERA_g12_servicios:g12_05_CentroEducativo",
            "OUTPUTFORMAT": "application/json",
            "COUNT": "1",
        }
        response = requests.get(url, params=params, timeout=timeout)
        assert response.status_code == 200
        data = response.json()
        assert data.get('type') == 'FeatureCollection'
        assert 'features' in data
        assert len(data['features']) > 0, "Capa educación debe tener features"
    
    def test_capa_energia_nombre_correcto(self, timeout):
        """La capa g10_02_ParqueEolico (NO g10_05) debe existir."""
        url = "https://www.ideandalucia.es/services/DERA_g10_infra_energetica/wfs"
        params = {
            "SERVICE": "WFS",
            "VERSION": "2.0.0",
            "REQUEST": "GetFeature",
            "TYPENAME": "DERA_g10_infra_energetica:g10_02_ParqueEolico",
            "OUTPUTFORMAT": "application/json",
            "COUNT": "1",
        }
        response = requests.get(url, params=params, timeout=timeout)
        assert response.status_code == 200
        data = response.json()
        assert data.get('type') == 'FeatureCollection'


# ============================================================================
# TESTS DE CONTEOS MÍNIMOS (integración)
# ============================================================================

@pytest.mark.integration
class TestConteosMinimos:
    """Tests que verifican conteos mínimos esperados por capa."""
    
    # Conteos mínimos basados en datos reales 2025-12-03
    # Usamos 80% del valor real para tolerar variaciones
    CONTEOS_MINIMOS = {
        'health': 1300,      # Real: 1700
        'security': 1000,    # Real: 1259
        'education': 5000,   # Real: 6725
        'municipal': 1100,   # Real: 1414
        'emergency': 15,     # Real: 23
        'energy': 100,       # Real: 161
    }
    
    @pytest.fixture
    def timeout(self):
        return 60  # segundos - más tiempo para descargas completas
    
    def test_conteo_minimo_health(self, timeout):
        """Health debe tener al menos 1300 features."""
        data = self._descargar_categoria('health', timeout)
        total = sum(len(d.get('features', [])) for d in data)
        assert total >= self.CONTEOS_MINIMOS['health'], \
            f"Health tiene {total} features, esperado >= {self.CONTEOS_MINIMOS['health']}"
    
    def test_conteo_minimo_education(self, timeout):
        """Education debe tener al menos 5000 features."""
        data = self._descargar_categoria('education', timeout)
        total = sum(len(d.get('features', [])) for d in data)
        assert total >= self.CONTEOS_MINIMOS['education'], \
            f"Education tiene {total} features, esperado >= {self.CONTEOS_MINIMOS['education']}"
    
    def _descargar_categoria(self, categoria, timeout):
        """Helper para descargar todas las capas de una categoría."""
        resultados = []
        for url, layer, _ in WFS_LAYERS[categoria]:
            params = {
                "SERVICE": "WFS",
                "VERSION": "2.0.0",
                "REQUEST": "GetFeature",
                "TYPENAME": layer,
                "OUTPUTFORMAT": "application/json",
                "SRSNAME": "EPSG:25830",
            }
            try:
                response = requests.get(url, params=params, timeout=timeout)
                if response.status_code == 200:
                    resultados.append(response.json())
            except Exception:
                pass
        return resultados


# ============================================================================
# TESTS DE ESTRUCTURA GEOJSON
# ============================================================================

class TestEstructuraGeoJSON:
    """Tests de estructura del GeoJSON generado."""
    
    def test_merge_features_genera_featurecollection(self):
        """merge_features debe generar un FeatureCollection válido."""
        # Mock de datos
        mock_data = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [500000, 4200000]},
                    "properties": {"nombre": "Test"}
                }
            ]
        }
        
        with patch('download_dera_actions.fetch_wfs', return_value=mock_data):
            resultado = merge_features([
                ("http://test.com", "test:layer", "Test Layer")
            ])
        
        assert resultado['type'] == 'FeatureCollection'
        assert 'features' in resultado
        assert 'crs' in resultado
        assert resultado['crs']['properties']['name'] == 'EPSG:25830'
    
    def test_merge_features_anade_source_a_properties(self):
        """merge_features debe añadir _source a cada feature."""
        mock_data = {
            "type": "FeatureCollection",
            "features": [
                {"type": "Feature", "properties": {"nombre": "Test"}}
            ]
        }
        
        with patch('download_dera_actions.fetch_wfs', return_value=mock_data):
            resultado = merge_features([
                ("http://test.com", "test:layer", "Mi Descripción")
            ])
        
        assert resultado['features'][0]['properties']['_source'] == 'Mi Descripción'


# ============================================================================
# TESTS DE MANEJO DE ERRORES
# ============================================================================

class TestManejoErrores:
    """Tests de manejo de errores y reintentos."""
    
    def test_fetch_wfs_reintenta_en_timeout(self):
        """fetch_wfs debe reintentar cuando hay timeout."""
        with patch('download_dera_actions.requests.get') as mock_get:
            mock_get.side_effect = requests.exceptions.Timeout()
            
            resultado = fetch_wfs("http://test.com", "test:layer")
            
            # Debe haber intentado MAX_RETRIES veces
            assert mock_get.call_count == MAX_RETRIES
            # Debe retornar FeatureCollection vacío
            assert resultado == {"type": "FeatureCollection", "features": []}
    
    def test_fetch_wfs_reintenta_en_error_http(self):
        """fetch_wfs debe reintentar cuando hay error HTTP."""
        with patch('download_dera_actions.requests.get') as mock_get:
            # Crear mock de respuesta con status_code
            mock_response = MagicMock()
            mock_response.status_code = 500
            error = requests.exceptions.HTTPError()
            error.response = mock_response
            mock_response.raise_for_status.side_effect = error
            mock_get.return_value = mock_response
            
            resultado = fetch_wfs("http://test.com", "test:layer")
            
            assert mock_get.call_count == MAX_RETRIES
            assert resultado['features'] == []
    
    def test_fetch_wfs_maneja_json_invalido(self):
        """fetch_wfs debe manejar respuestas JSON inválidas."""
        with patch('download_dera_actions.requests.get') as mock_get:
            mock_response = MagicMock()
            mock_response.raise_for_status.return_value = None
            mock_response.json.side_effect = json.JSONDecodeError("test", "doc", 0)
            mock_get.return_value = mock_response
            
            resultado = fetch_wfs("http://test.com", "test:layer")
            
            assert resultado['features'] == []


# ============================================================================
# TESTS DE ARCHIVOS EXISTENTES
# ============================================================================

class TestArchivosExistentes:
    """Tests que verifican los archivos GeoJSON generados."""
    
    @pytest.fixture
    def data_dir(self):
        """Directorio donde están los datos descargados."""
        # Ruta relativa desde el script
        return Path(__file__).parent.parent.parent / "public" / "data" / "dera"
    
    def test_archivos_geojson_existen(self, data_dir):
        """Todos los archivos GeoJSON esperados deben existir."""
        archivos_esperados = [
            'health.geojson',
            'security.geojson', 
            'education.geojson',
            'municipal.geojson',
            'emergency.geojson',
            'energy.geojson',
        ]
        for archivo in archivos_esperados:
            path = data_dir / archivo
            assert path.exists(), f"Falta archivo {archivo}"
    
    def test_archivos_son_geojson_valido(self, data_dir):
        """Los archivos deben contener GeoJSON válido."""
        for archivo in data_dir.glob("*.geojson"):
            with open(archivo) as f:
                data = json.load(f)
            assert data.get('type') == 'FeatureCollection', \
                f"{archivo.name} no es FeatureCollection"
            assert 'features' in data, f"{archivo.name} no tiene features"
    
    def test_archivos_tienen_features(self, data_dir):
        """Los archivos deben tener al menos 1 feature."""
        for archivo in data_dir.glob("*.geojson"):
            with open(archivo) as f:
                data = json.load(f)
            assert len(data.get('features', [])) > 0, \
                f"{archivo.name} está vacío"
    
    def test_metadata_existe_y_es_valido(self, data_dir):
        """El archivo metadata.json debe existir y ser válido."""
        metadata_path = data_dir.parent / "metadata.json"
        assert metadata_path.exists(), "Falta metadata.json"
        
        with open(metadata_path) as f:
            metadata = json.load(f)
        
        assert 'lastUpdate' in metadata
        assert 'layers' in metadata
        assert 'totalFeatures' in metadata
        assert metadata['crs'] == 'EPSG:25830'


# ============================================================================
# EJECUCIÓN DIRECTA
# ============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
