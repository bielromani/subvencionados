# Subvencionados · Música

Buscador de subvenciones públicas españolas para **promotores que gestionan grupos de jazz, música clásica y ópera**.
El objetivo a largo plazo es cubrir cualquier sector; esta primera versión es el piloto de viabilidad.

## Qué hace ya

- **Descarga automática desde la BDNS** (Base de Datos Nacional de Subvenciones, donde por ley se registran
  las subvenciones de todas las administraciones: Estado, comunidades autónomas, diputaciones y ayuntamientos).
  Un workflow de GitHub Actions (`.github/workflows/recolectar-bdns.yml`) se ejecuta cada día y, en cada pasada:
  - busca las convocatorias de música nuevas;
  - descarga su ficha completa y las **concesiones** (quién cobró y cuánto);
  - guarda todo en `datos/bdns/` y hace commit.

  El histórico se descarga desde 2014. Ver [datos/LEEME.md](datos/LEEME.md).
- **Clasificador por reglas** (`server/src/clasificacion/musica.ts`), ajustado con títulos reales:
  - detecta si una convocatoria es de música, incluidos títulos en catalán, gallego y euskera;
  - descarta falsos positivos como «cooperación», «concierto económico» o los concursos de fotografía de un
    festival de jazz;
  - reconoce los estilos, mencionados expresamente (★) o compatibles cuando la ayuda es de música en general;
  - indica qué financia la ayuda y quién puede pedirla.
- **Recomendaciones para el promotor** (`server/src/emparejamiento.ts`), con motivos y avisos, en cinco bloques:
  - concursos abiertos o por abrir;
  - concursos cerrados recientes que suelen repetirse cada año;
  - premios y concursos para sus músicos (personas físicas);
  - ayudas a ayuntamientos, que son clientes potenciales;
  - precedentes: concesiones directas y nominativas, con lo concedido.
- **Fase 1 terminada**: textos de las bases, series año a año, ubicación por municipio, directorio de
  organismos (`GET /api/organismos`), concursos generales de cultura y vigilancia del formato. Cifras del nicho en
  [docs/informe-nicho.md](docs/informe-nicho.md).
- **Fase 2 en curso: ficha de cada convocatoria.** Todas tienen una **ficha básica automática, sin IA**: el
  extracto oficial partido en apartados, frases literales de las bases con su página (importe máximo, porcentaje,
  plazo, minimis, compatibilidad, cachés) y enlaces a los documentos. Además hay 105 **fichas completas** que Claude
  leyó en la sesión de trabajo (plazos, dinero, requisitos, gastos, criterios, documentación), cada dato con su cita
  comprobada; otras se leen solo si se piden. `npm run fichas` prepara los textos e importa y comprueba las fichas.
- **Web** (React), cada página con su dirección para guardarla o compartirla:
  - *Inicio*: lo urgente (cierra pronto, abre pronto, previstas, nuevas) y el resumen de cada grupo;
  - *Mis grupos*: las ayudas de cada grupo, las de su estilo aparte de las generales, con el porqué;
  - *Recomendaciones* (`#/para-ti`): todas, por tipo de encaje;
  - *Convocatorias*: filtros por plazo, tipo, estilo, comunidad, administración y actividad; cada convocatoria
    tiene su página con la ficha y sus ediciones de otros años;
  - *Contratos*: contratos públicos de conciertos (abiertos y adjudicados) de la Plataforma de Contratación;
  - *Dónde tocar*: festivales y ciclos, programadores públicos y circuitos, con sus fuentes;
  - *Calendario*: plazos que abren y cierran y ediciones previstas, exportable a cualquier calendario (.ics);
  - *Organismos*: quién convoca, cuánto ha concedido y a quién;
  - *Mercado*: cifras y gráficos por año, comunidad, provincia (mapa) y actividad;
  - *Mi perfil*: los datos del promotor.

## Puesta en marcha

Requisitos: Node.js ≥ 22.13 (usa el SQLite que trae Node).

```bash
git pull            # trae los datos que el workflow descarga cada día
npm install
npm run dev         # importa datos/bdns a la base local y arranca API (:3001) y web (http://localhost:5173)
```

La descarga se hace en GitHub Actions. También se puede lanzar en local si la red permite acceder a la BDNS:

```bash
npm run recolectar                          # incremental: desde la última ejecución
npm run recolectar -- --desde=2014-01-01    # histórico
npm run recolectar -- --minutos=30          # se para a los 30 minutos y deja el resto pendiente
npm run importar                            # carga datos/bdns en la base de datos de la app
npm run informe                             # regenera docs/informe-nicho.md con las cifras del nicho
npm run fichas -- --simular                 # qué convocatorias merecen ficha y cuáles faltan
npm run fichas -- --preparar=DIR            # textos de las bases + instrucciones para extraer las fichas
npm run fichas -- --importar=DIR            # valida las fichas extraídas, comprueba las citas y las guarda
```

Para lanzar el histórico o forzar una actualización desde GitHub: pestaña *Actions* → *Recolectar BDNS* →
*Run workflow*. Al terminar, la página de cada ejecución muestra un resumen con cifras.

## Comprobaciones

```bash
npm test            # tests (con respuestas reales de la BDNS como fixtures)
npm run typecheck
npm run build
```

## Estructura

```
server/
  src/bdns/            cliente de la API de la BDNS, recolector, almacén en ficheros y normalización
  src/clasificacion/   clasificador de música por reglas
  src/emparejamiento.ts  perfil del promotor → recomendaciones
  src/app.ts           API REST (Express)
  src/db.ts            SQLite
  src/series.ts        la misma convocatoria año a año y previsión de la próxima
  src/organismos.ts    directorio de organismos que financian música
  src/referencias.ts   ubicación de cada organismo (catálogo BDNS + nomenclátor INE)
  src/informe.ts       informe del nicho
  src/ficha/           ficha básica automática y ficha con IA: esquema, comprobación de citas y selección
  src/scripts/         recolectar, importar, informe, referencias y muestra de evaluación
datos/bdns/            lo descargado de la BDNS (lo actualiza el workflow diario)
datos/referencia/      entidades locales y municipios (workflow mensual)
datos/fichas/          fichas extraídas de las bases con IA, con citas comprobadas
web/                   React + Vite
docs/                  plan por fases y fuentes de datos
```

Variables de entorno: `PORT` (API, 3001), `SUBV_DB` (SQLite), `SUBV_DATOS` (carpeta de datos) y `BDNS_URLS`.

Plan de trabajo por fases: [docs/plan.md](docs/plan.md). Fuentes de datos: [docs/fuentes-de-datos.md](docs/fuentes-de-datos.md).

Fuente de los datos: Sistema Nacional de Publicidad de Subvenciones y Ayudas Públicas (BDNS), IGAE, Ministerio de
Hacienda. Los datos de personas físicas beneficiarias no se guardan.
