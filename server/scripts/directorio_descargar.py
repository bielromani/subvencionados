"""Descarga las fuentes oficiales del directorio de ayuntamientos y concejales de cultura.

Uso: python3 directorio_descargar.py datos/directorio/fuentes

Guarda cada fichero tal como lo sirve la fuente y un estado.json con la fecha y el resultado.
Lo ejecuta el workflow directorio-cultura.yml (la red del entorno de desarrollo no llega a estas webs).
"""
import json
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

SOCRATA = "https://analisi.transparenciacatalunya.cat/resource"

# (fichero, url o lista de URL alternativas, descripción, licencia)
FUENTES = [
    ("cat-carrecs.csv", f"{SOCRATA}/m5nd-xjza.csv?$limit=100000",
     "Generalitat de Catalunya · Càrrecs electes dels ens locals (Municat)", "CC BY 4.0 (dades obertes Generalitat)"),
    ("cat-ajuntaments.csv", f"{SOCRATA}/vevv-8fvw.csv?$limit=10000",
     "Generalitat de Catalunya · Dades d'ens locals - Ajuntaments (Municat)", "CC BY 4.0 (dades obertes Generalitat)"),
    ("euskadi-entidades.json",
     "https://opendata.euskadi.eus/contenidos/ds_registros/registro_entidades_locales/opendata/entidades.json",
     "Gobierno Vasco · Registro de entidades locales", "CC BY 4.0 (Open Data Euskadi)"),
    ("galicia-concellos.csv",
     "https://abertos.xunta.gal/catalogo/administracion-publica/-/dataset/0301/casas-dos-concellos-galicia/102/acceso-aos-datos.csv",
     "Xunta de Galicia · Casas dos concellos de Galicia", "CC BY 4.0 (Abertos Xunta)"),
    ("clm-ayuntamientos.csv",
     "https://datosabiertos.castillalamancha.es/sites/datosabiertos.castillalamancha.es/files/Entidades_Locales_CLM%20%28Junio_2025%29.csv",
     "Junta de Comunidades de Castilla-La Mancha · Directorio de Ayuntamientos (junio 2025)", "CC BY-SA 3.0 ES"),
    ("castellon-ayuntamientos.csv",
     "https://dipcas.opendatasoft.com/api/v2/catalog/datasets/ayuntamientos/exports/csv",
     "Diputación de Castellón · Ayuntamientos", "CC BY 4.0"),
    ("gva-entidades-locales.csv",
     "https://dadesobertes.gva.es/dataset/93721b0e-3a83-4108-a7b5-040058c5d6c6/resource/29864181-c7b1-470c-a4e6-e5958ead7c4a/download/mapets.csv",
     "Generalitat Valenciana · Recursos de gobierno abierto de las entidades locales", "CC BY 4.0 (dadesobertes.gva.es)"),
    ("navarra-entidades.csv",
     "https://datosabiertos.navarra.es/dataset/ebce4d71-a914-46ed-b7c6-d7e73046b511/resource/621b149e-4410-4353-b7d1-b08e3ff5d1e2/download/2025-municipios.csv",
     "Gobierno de Navarra · Guía de entidades locales de Navarra", "CC BY 4.0 (Open Data Navarra)"),
    ("andalucia-rael.txt", "https://datos.juntadeandalucia.es/api/v0/rael/all?format=csv",
     "Junta de Andalucía · Registro Andaluz de Entidades Locales (RAEL)", "CC BY 4.0 (datos abiertos Junta de Andalucía)"),
    ("aragon-municipios.csv", "https://opendata.aragon.es/GA_OD_Core/download?resource_id=11&formato=csv",
     "Gobierno de Aragón · Información general de los municipios de Aragón", "CC BY 4.0 (Aragón Open Data)"),
    ("diba-electes.json", "https://do.diba.cat/api/dataset/electes/format/json/pag-ini/1/pag-fi/10000",
     "Diputació de Barcelona · Càrrecs electes (amb àmbit de treball)", "CC BY 4.0"),
    ("ine-poblacion.xlsx", [f"https://www.ine.es/pob_xls/pobmun{a}.{e}" for a in (25, 24) for e in ("xlsx",)],
     "INE · Cifras oficiales de población de los municipios (padrón)", "INE: reutilización libre citando la fuente"),
    ("salamanca-alcaldes.csv",
     "https://datosabiertossalamanca.es/dataset/55683da4-954e-4b34-8ab2-bc4a97e70682/resource/204dceb7-50fd-42a7-9aa9-4a4d61f951e9/download/sp02.csv",
     "Diputación de Salamanca · Alcaldes de la provincia", "CC BY 4.0"),
]

WIKIDATA_CONSULTA = """
SELECT ?ine (SAMPLE(?w) AS ?web) (MAX(?p) AS ?poblacion) WHERE {
  ?m wdt:P772 ?ine .
  FILTER(STRLEN(?ine) = 5)
  OPTIONAL { ?m wdt:P856 ?w }
  OPTIONAL { ?m wdt:P1082 ?p }
} GROUP BY ?ine
"""


def descargar(url: str, datos: bytes | None = None, cabeceras: dict | None = None) -> bytes:
    req = urllib.request.Request(url, data=datos, headers={
        "User-Agent": "subvencionados/1.0 (https://github.com/bielromani/subvencionados)", **(cabeceras or {})})
    ultimo = None
    for intento in range(3):
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001 - se reintenta cualquier fallo de red
            ultimo = e
            time.sleep(5 * (intento + 1))
    raise RuntimeError(str(ultimo))


def main() -> None:
    destino = Path(sys.argv[1])
    destino.mkdir(parents=True, exist_ok=True)
    estado = {"fecha": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "fuentes": []}
    fallos = 0
    todas = FUENTES + [("wikidata-webs.csv", "https://query.wikidata.org/sparql",
                        "Wikidata · web oficial y población de cada municipio (P856 y P1082 por código INE P772)", "CC0")]
    for fichero, url, descripcion, licencia in todas:
        try:
            if fichero == "wikidata-webs.csv":
                cuerpo = urllib.parse.urlencode({"query": WIKIDATA_CONSULTA}).encode()
                datos = descargar(url, cuerpo, {"Accept": "text/csv"})
            else:
                # Varias URL: la primera que responda (p. ej. el padrón del último año publicado).
                candidatas = [url] if isinstance(url, str) else url
                for i, u in enumerate(candidatas):
                    try:
                        datos, url = descargar(u), u
                        break
                    except RuntimeError:
                        if i == len(candidatas) - 1:
                            raise
            if len(datos) < 2000 or datos.lstrip()[:15].lower().startswith((b"<!doctype", b"<html")):
                raise RuntimeError(f"respuesta inesperada ({len(datos)} bytes)")
            (destino / fichero).write_bytes(datos)
            resultado = f"{len(datos)} bytes"
        except Exception as e:  # noqa: BLE001 - una fuente caída no detiene las demás
            fallos += 1
            resultado = f"ERROR: {e}"
            if (destino / fichero).exists():
                resultado += " (se conserva la descarga anterior)"
        print(f"{fichero}: {resultado}")
        estado["fuentes"].append({"fichero": fichero, "url": url, "descripcion": descripcion,
                                  "licencia": licencia, "resultado": resultado})
    (destino / "estado.json").write_text(json.dumps(estado, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    if fallos > len(todas) // 2:
        sys.exit(f"Fallaron {fallos} de {len(todas)} fuentes")


if __name__ == "__main__":
    main()
