# Datos

`bdns/` contiene lo descargado automáticamente de la **Base de Datos Nacional de Subvenciones**
(Sistema Nacional de Publicidad de Subvenciones y Ayudas Públicas, IGAE, Ministerio de Hacienda)
por el workflow `.github/workflows/recolectar-bdns.yml`. No se edita a mano.

- `bdns/convocatorias/AAAA.json`: una convocatoria por línea, agrupadas por año de registro:
  - `detalle`: respuesta íntegra de `GET /convocatorias?numConv=…`;
  - `concesiones`: respuesta de `GET /concesiones/busqueda?numeroConvocatoria=…`, sin el identificador
    interno de la persona y con las **personas físicas anonimizadas** (`"PERSONA FÍSICA"`);
  - `primeraDescarga` y `actualizado`: cuándo se descargó.
- `bdns/estado.json`: hasta qué fecha se ha buscado y qué queda pendiente de descargar.

Solo se guardan las convocatorias cuyo título parece de música (ver `server/src/bdns/recolector.ts`).

Fuente: SNPSAP – https://www.pap.hacienda.gob.es/bdnstrans/GE/es/index · Aviso legal sobre la
reutilización: https://www.infosubvenciones.es/bdnstrans/GE/es/avisolegal. Los datos son dinámicos:
la BDNS puede corregirlos después de su descarga.

## Directorio de ayuntamientos y responsables de cultura

`directorio/` lo genera el workflow `.github/workflows/directorio-cultura.yml` (día 3 de cada mes):

- `directorio/fuentes/`: las descargas de cada fuente oficial tal cual, con `estado.json` (fecha, URL, licencia
  y resultado de cada una). Las hace `server/scripts/directorio_descargar.py`.
- `directorio/ayuntamientos.csv`: los 8.132 municipios del INE por comunidad y provincia, con teléfono, email y web
  del ayuntamiento, alcalde/sa y, si se conoce, el responsable de cultura y el email y teléfono de cultura.
- `directorio/cultura.csv`: concejales y consejeros cuya área de gobierno incluye cultura (solo Cataluña publica
  este dato), los investigados a mano y el personal de cultura de los ayuntamientos de Cádiz (directorio de la
  Diputación).
- `directorio/directorio-cultura.xlsx`: lo mismo en Excel, con resumen por provincia y la lista de fuentes.

`server/scripts/directorio_construir.py` cruza las fuentes con el nomenclátor del INE; se puede volver a ejecutar en
local sin red: `python3 server/scripts/directorio_construir.py datos`.

`directorio/cultura-investigado.csv` se mantiene a mano (no lo toca el workflow): responsables de cultura de las capitales
de provincia y las ciudades de más de 50.000 habitantes, buscados uno a uno en webs municipales, boletines y prensa, con
el enlace a la fuente, el año de esa fuente y notas (`DUDOSO` cuando las fuentes se contradicen). Separador `;`.
