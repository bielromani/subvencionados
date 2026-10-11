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
- `bdns/documentos/AAAA/ID.txt.gz`: texto de las bases (PDF oficial pasado por `pdftotext`), con las páginas
  separadas por saltos de página para poder citarlas.

Solo se guardan las convocatorias cuyo título parece de música y, desde 2023, los concursos generales de cultura
en los que puede encajar un concierto (ver `server/src/bdns/recolector.ts`).

`referencia/` tiene el catálogo de entidades locales de la BDNS y el nomenclátor de municipios del INE
(workflow `.github/workflows/referencias.yml`).

`fichas/CODIGO.json` son las fichas que Claude extrae del texto de las bases (`npm run fichas`,
`server/src/ficha/`). Cada dato lleva una cita literal con su página,
comprobada contra el documento: lo que no se encuentra queda marcado para revisar y la web no lo enseña.
No son datos oficiales: el texto de las bases prevalece siempre.

Fuente: SNPSAP – https://www.pap.hacienda.gob.es/bdnstrans/GE/es/index · Aviso legal sobre la
reutilización: https://www.infosubvenciones.es/bdnstrans/GE/es/avisolegal. Los datos son dinámicos:
la BDNS puede corregirlos después de su descarga.

## Directorio de ayuntamientos y responsables de cultura

`directorio/` viene del proyecto del directorio de cultura (rama `claude/bold-einstein-fytyn8`, workflow
`directorio-cultura.yml`). Aquí solo se copian los datos: el workflow no se ha traído para no gastar minutos de Actions.

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

La web lo cruza por código INE (`server/src/contactos.ts`): cada programador municipal y cada organismo que es un
municipio enseña a quién contactar, con la fuente y el año de cada dato. De las personas solo se enseña el contacto
institucional: los emails de proveedores gratuitos y los móviles personales se omiten.
