# Fuentes de datos

## 1. BDNS (fuente principal)

Por el art. 20.8 de la Ley 38/2003 General de Subvenciones (reformado por la Ley 15/2014, en vigor desde 2016),
**toda convocatoria de subvenciones** de cualquier administración (Estado, comunidades autónomas, diputaciones y
ayuntamientos) se registra en la Base de Datos Nacional de Subvenciones. Para el Estado y las entidades locales, la
convocatoria solo es eficaz cuando se publica su extracto en el boletín oficial, y ese extracto lo envía la BDNS.

Matiz: la STC 33/2018 permite a las **comunidades autónomas** publicar el extracto por su cuenta. Hay que comprobar
con datos reales que sus convocatorias también aparecen en la BDNS y, si faltan, rastrear sus diarios oficiales.

También registra **concesiones**: quién recibió cuánto, incluidas las subvenciones nominativas.

### Dominios

La BDNS se publica en dos dominios del Ministerio de Hacienda. El cliente (`server/src/bdns/cliente.ts`) prueba los
dos y se queda con el que responda:

| Uso | URL |
|---|---|
| Portal web | https://www.pap.hacienda.gob.es/bdnstrans/GE/es/index |
| Portal web (alias) | https://www.infosubvenciones.es/bdnstrans/GE/es/index |
| Documentación de la API (Swagger) | https://www.infosubvenciones.es/bdnstrans/doc/swagger |
| Ficha de una convocatoria | https://www.pap.hacienda.gob.es/bdnstrans/GE/es/convocatorias/{código} |
| API | `{dominio}/bdnstrans/api` |

> Si `infosubvenciones.es` no carga en el navegador, prueba `pap.hacienda.gob.es/bdnstrans`, que es la misma base de
> datos.

### Endpoints que usamos (pendiente de verificar contra la API real)

El código se ha escrito con la forma documentada por el Swagger y por clientes públicos de terceros, pero **todavía no
se ha probado contra la API real**: el entorno donde se desarrolló no tenía acceso de red a esos dominios. Todos los
campos se leen como opcionales y los fallos se registran sin detener la sincronización.

- `GET /convocatorias/busqueda?vpd=GE&descripcion=&descripcionTipoBusqueda=&fechaDesde=dd/mm/aaaa&page=&pageSize=`:
  listado paginado (`content`, `totalElements`, `last`).
- `GET /convocatorias?vpd=GE&numConv={código}`: detalle con órgano, regiones (NUTS), tipos de beneficiario,
  finalidad, presupuesto, fechas de solicitud, URL de las bases y anuncios.

Primera prueba que hay que hacer con acceso:

```bash
npm run sync -- --max-paginas=1 --terminos=jazz
```

Si algún campo tiene otro nombre, se corrige en `server/src/bdns/tipos.ts` y `server/src/bdns/normalizar.ts`; el test
`server/test/normalizar.test.ts` usa un fixture que habrá que sustituir por una respuesta real.

## 2. Fuentes complementarias (pendientes)

| Fuente | Por qué | Prioridad |
|---|---|---|
| PDF de las bases (enlazado desde la BDNS) | Los requisitos reales (estilos, beneficiarios, gastos) están ahí; título y finalidad no bastan | Alta |
| Plataforma de Contratación del Sector Público | Gran parte del dinero público para conciertos son **contratos** (cachés de fiestas, programación), no subvenciones | Alta |
| Diarios oficiales autonómicos | Por si alguna comunidad publica fuera de la BDNS (STC 33/2018) | Media |
| Circuitos (PLATEA del INAEM y redes autonómicas) | Programación pagada en teatros municipales | Media |
| AIE, SGAE y fundaciones | No son públicas, pero los promotores las piden | Baja |
| Europa Creativa e Ibermúsicas | Giras internacionales | Baja |
