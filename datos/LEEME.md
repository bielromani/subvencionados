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
