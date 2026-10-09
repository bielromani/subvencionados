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
| `GET /convocatorias/documentos?idDocumento={id}` | PDF de un documento de la convocatoria (texto de la convocatoria, bases...). Cada ficha trae la lista en `documentos` |
| `GET /organos?vpd=GE&idAdmon=L` | Entidades locales por provincia > municipio o diputación > órganos (2.971 entidades en octubre de 2026) |
| `GET /finalidades`, `/regiones`, `/beneficiarios`, `/instrumentos`, `/actividades` | Catálogos |

Ficha pública de una convocatoria: `https://www.pap.hacienda.gob.es/bdnstrans/GE/es/convocatorias/{código}`.

### Cómo se recolecta

Ver `server/src/bdns/recolector.ts`:

1. **Descubrir.** Listados de la finalidad Cultura por años y búsquedas por texto en todas las finalidades
   (música, concierto, orquesta, jazz, lírica, ópera, zarzuela, coral…). Se queda con las de título musical y,
   desde 2023, con los concursos generales de cultura en los que un concierto puede encajar.
2. **Descargar.** La ficha completa y las concesiones de cada convocatoria nueva. Las concesiones a personas
   físicas se guardan sin nombre ni DNI.
3. **Refrescar.** Vuelve a descargar las de los últimos 60 días, porque sus plazos y concesiones aún cambian.
4. **Documentos.** De los concursos (de música, últimos 3 años; generales de cultura, último año) descarga el
   PDF preferentemente en castellano y guarda su texto (comprimido, con los saltos de página) en
   `datos/bdns/documentos/`. El PDF no se copia: se enlaza a la descarga oficial.
5. **Vigilancia.** Se valida el formato de cada ficha; si falla más del 20 %, la ejecución termina con error y
   GitHub avisa por correo.

## 2. Referencias territoriales (en uso)

| Fuente | Fichero | Uso |
|---|---|---|
| Catálogo de entidades locales de la BDNS (`/organos?idAdmon=L`) | `datos/referencia/entidades-locales.json` | Provincia de cada ayuntamiento, diputación o cabildo |
| Nomenclátor de municipios del INE (`ine.es/daco/daco42/codmun/diccionarioAA.xlsx`) | `datos/referencia/municipios-ine.json` | Código oficial de municipio (8.132 municipios) |

Las descarga el workflow `referencias.yml` el día 2 de cada mes. Con ellas, cada convocatoria local queda ubicada
en su municipio, provincia y comunidad (en la primera muestra, 134 de 134; 94 hasta el municipio y 40 diputaciones,
cabildos y consejos insulares en su provincia).

### Observaciones de la primera descarga (1 sept.-8 oct. 2026: 148 convocatorias de música)

- 119 son concesiones directas o nominativas y 28 concursos: la mayor parte del dinero se da sin concurso.
- Muchos concursos van dirigidos a personas físicas (premios, concursos de maquetas): sirven a los músicos, no al
  promotor.
- La fecha de inicio a veces falta y el plazo depende de la publicación en el boletín («a partir del día siguiente
  de la publicación…»); `abierto` puede valer `false` aunque el plazo no haya empezado.

## 3. Fuentes complementarias (pendientes)

| Fuente | Por qué | Prioridad |
|---|---|---|
| Plataforma de Contratación del Sector Público | Gran parte del dinero público para conciertos son contratos (cachés), no subvenciones | Alta |
| Diarios oficiales autonómicos | Por si alguna comunidad publica fuera de la BDNS (STC 33/2018) | Media |
| AIE, SGAE y fundaciones | No son públicas, pero los promotores las piden | Baja |
| Europa Creativa e Ibermúsicas | Giras internacionales | Baja |

## 4. Directorio de ayuntamientos y responsables de cultura (en uso)

No hay ninguna lista oficial de concejales de cultura de toda España: el Ministerio solo publica nombres de alcaldes
y concejales (concejales.redsara.es), sin área ni contacto. Lo que sí está en abierto (comprobado el 9 de octubre
de 2026):

| Ámbito | Fuente | Datos |
|---|---|---|
| Cataluña | Municat (Generalitat): `m5nd-xjza` cargos electos y `vevv-8fvw` ayuntamientos | **Área de gobierno de cada concejal**, teléfono, email, web, alcalde |
| Provincia de Barcelona | Diputació de Barcelona, dataset `electes` | Área («àmbit de treball») de cada concejal |
| País Vasco | Registro de entidades locales (Open Data Euskadi) | Web, alcalde |
| Galicia | Casas dos concellos (Abertos Xunta) | Teléfono, email, web |
| Castilla-La Mancha | Directorio de Ayuntamientos (junio 2025) | Teléfono, email, web, alcalde |
| Comunitat Valenciana | Recursos de gobierno abierto de las EELL (GVA) y Ayuntamientos (Diputación de Castellón) | Teléfono, email; web y alcalde en Castellón |
| Navarra | Guía de entidades locales | Teléfono, email, web, alcalde |
| Andalucía | Registro Andaluz de Entidades Locales (RAEL, API) | Teléfono, email, web, alcalde |
| Aragón | Información general de los municipios | Teléfono, email, alcalde |
| Salamanca | Diputación: alcaldes de la provincia | Alcalde |
| Resto | Wikidata (P856 y P1082 por código INE) | Web y población |

Sin directorio abierto encontrado: Madrid, Murcia, Canarias, Baleares, Asturias, Cantabria, La Rioja, Extremadura,
Castilla y León (salvo Salamanca), Ceuta y Melilla. Para ellas queda la web del ayuntamiento.

Los teléfonos y emails son los institucionales del ayuntamiento. Para enviar comunicaciones comerciales por email
hay que cumplir la LSSI y el RGPD.
