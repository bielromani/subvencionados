# Fuentes de datos

## 1. BDNS (fuente principal, en uso)

Por el art. 20.8 de la Ley 38/2003 General de Subvenciones (reformado por la Ley 15/2014, en vigor desde 2016),
**toda convocatoria de subvenciones** de cualquier administración (Estado, comunidades autónomas, diputaciones y
ayuntamientos) se registra en la Base de Datos Nacional de Subvenciones. También se registran las **concesiones**:
quién recibió cuánto, incluidas las subvenciones nominativas y directas.

Matiz: la STC 33/2018 permite a las comunidades autónomas publicar el extracto en su diario oficial sin pasar por la
BDNS. Los datos muestran convocatorias autonómicas registradas en la BDNS, pero no se ha medido si falta alguna.

### Lo comprobado contra la API real (8 de octubre de 2026)

| Dato | Valor |
|---|---|
| Convocatorias registradas | 657.261 (desde 2008; regular desde 2014 y completo desde 2016) |
| Concesiones registradas | 30.173.780 |
| Convocatorias con finalidad Cultura (id 11) | 134.019 (≈10.000-16.500 al año) |
| Ejemplo: búsqueda «jazz» | 453 convocatorias |
| Tamaño máximo de página | 10.000 resultados |
| Límite de uso | No hay cabeceras de límite; el aviso legal advierte contra el abuso, por eso se espera 400 ms entre peticiones |

Base de la API: `https://www.pap.hacienda.gob.es/bdnstrans/api` (`www.infosubvenciones.es` sirve lo mismo; el
cliente usa los dos).

| Endpoint | Uso |
|---|---|
| `GET /convocatorias/busqueda?vpd=GE&page&pageSize&descripcion&fechaDesde=dd/mm/aaaa&fechaHasta&finalidad` | Listado. La búsqueda por texto no distingue tildes pero busca subcadenas («opera» encuentra «cooperación») |
| `GET /convocatorias?vpd=GE&numConv={código}` | Ficha: órgano (`nivel1` = ESTADO/AUTONOMICA/LOCAL), `tipoConvocatoria`, presupuesto, beneficiarios, regiones NUTS, fechas de solicitud, URL de las bases, anuncios |
| `GET /concesiones/busqueda?vpd=GE&numeroConvocatoria={código}` | Concesiones de una convocatoria: beneficiario, importe, fecha |
| `GET /finalidades`, `/regiones`, `/beneficiarios`, `/instrumentos`, `/actividades`, `/organos` | Catálogos |

Ficha pública de una convocatoria: `https://www.pap.hacienda.gob.es/bdnstrans/GE/es/convocatorias/{código}`.

### Cómo se recolecta

Ver `server/src/bdns/recolector.ts`:

1. **Descubrir.** Listados de la finalidad Cultura por años y búsquedas por texto en todas las finalidades
   (música, concierto, orquesta, jazz, lírica, ópera, zarzuela, coral…). Se queda con las de título musical.
2. **Descargar.** La ficha completa y las concesiones de cada convocatoria nueva. Las concesiones a personas
   físicas se guardan sin nombre ni DNI.
3. **Refrescar.** Vuelve a descargar las de los últimos 60 días, porque sus plazos y concesiones aún cambian.

### Observaciones de la primera descarga (1 sept.-8 oct. 2026: 148 convocatorias de música)

- 119 son concesiones directas o nominativas y 28 concursos: la mayor parte del dinero se da sin concurso.
- Muchos concursos van dirigidos a personas físicas (premios, concursos de maquetas): sirven a los músicos, no al
  promotor.
- La fecha de inicio a veces falta y el plazo depende de la publicación en el boletín («a partir del día siguiente
  de la publicación…»); `abierto` puede valer `false` aunque el plazo no haya empezado.

## 2. Fuentes complementarias (pendientes)

| Fuente | Por qué | Prioridad |
|---|---|---|
| PDF de las bases y anuncios del boletín | Los requisitos reales (estilos, gastos, criterios) están ahí; el título no basta | Alta |
| Convocatorias genéricas de cultura (finalidad 11 sin palabras musicales en el título) | Muchas ayudas municipales «a actividades culturales» admiten conciertos | Alta |
| Plataforma de Contratación del Sector Público | Gran parte del dinero público para conciertos son contratos (cachés), no subvenciones | Alta |
| Diarios oficiales autonómicos | Por si alguna comunidad publica fuera de la BDNS (STC 33/2018) | Media |
| AIE, SGAE y fundaciones | No son públicas, pero los promotores las piden | Baja |
| Europa Creativa e Ibermúsicas | Giras internacionales | Baja |
