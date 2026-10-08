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
