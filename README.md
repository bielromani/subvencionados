# Subvencionados · Música

Buscador de subvenciones públicas españolas para **promotores que gestionan grupos de jazz, música clásica y ópera**.
El objetivo a largo plazo es cubrir cualquier sector; esta primera versión es el piloto de viabilidad.

## Qué hace ya

- **Ingesta desde la BDNS** (`npm run sync`): busca en la Base de Datos Nacional de Subvenciones todas las convocatorias
  que pueden ser de música, descarga su detalle, las clasifica y muestra estadísticas del nicho (cuántas hay, de qué
  administración, en qué comunidades, cuántas encajan con un promotor).
- **Clasificador por reglas** (`server/src/clasificacion/musica.ts`):
  - si es de música (descartando falsos positivos como «banda ancha», «concierto económico» o el verbo «opera»);
  - estilos: mencionados expresamente (★) o compatibles, cuando la ayuda es de música en general;
  - qué financia: giras, festivales, producción, grabación…;
  - quién puede pedirla: empresas o autónomos, entidades sin ánimo de lucro o ayuntamientos.
- **Perfil del promotor y recomendaciones** (`server/src/emparejamiento.ts`): cruza la forma jurídica, las comunidades
  donde trabaja, los estilos de sus grupos y lo que quiere financiar. Explica por qué encaja cada ayuda y en qué hay
  que fijarse. Separa tres tipos:
  - **directas**: ayudas que puede pedir él;
  - **indirectas**: ayudas que cobran ayuntamientos para programar, es decir, clientes potenciales;
  - **precedentes**: nominativas ya concedidas a proyectos parecidos.
- **Web** (React): pestañas *Para ti*, *Explorar* (filtros por estilo, comunidad, administración, actividad y plazo)
  y *Mi perfil*.

## Puesta en marcha

Requisitos: Node.js ≥ 22.13 (se usa el SQLite que trae Node, sin dependencias nativas).

```bash
npm install
npm run seed:demo   # carga 6 ejemplos reales de 2026 (con fuente) para ver la web sin la BDNS
npm run sync        # descarga datos oficiales de la BDNS (tarda: 1 petición/segundo)
npm run dev         # API en :3001 y web en http://localhost:5173
```

Opciones de la sincronización:

```bash
npm run sync -- --desde=2024-01-01      # periodo (por defecto, desde el 1 de enero del año pasado)
npm run sync -- --max-paginas=2          # para una prueba rápida
npm run sync -- --terminos=jazz,ópera    # términos de búsqueda concretos
npm run sync -- --refrescar              # vuelve a descargar las ya guardadas
```

Variables de entorno: `PORT` (API, por defecto 3001), `SUBV_DB` (ruta de la base de datos SQLite) y `BDNS_URLS`
(dominios de la API separados por comas).

## Comprobaciones

```bash
npm test            # tests de la API, el clasificador, el emparejamiento y el cliente BDNS
npm run typecheck
npm run build
```

## Estructura

```
server/
  src/bdns/            cliente de la API de la BDNS y conversión a nuestro modelo
  src/clasificacion/   clasificador de música por reglas
  src/emparejamiento.ts  perfil del promotor → recomendaciones
  src/app.ts           API REST (Express)
  src/db.ts            SQLite
  src/scripts/         sync (BDNS) y seed-demo
  src/data/demo.ts     ejemplos reales para desarrollo
web/                   React + Vite
docs/                  fuentes de datos y hoja de ruta
```

Consulta [docs/fuentes-de-datos.md](docs/fuentes-de-datos.md) para ver qué falta verificar de la BDNS y
[docs/hoja-de-ruta.md](docs/hoja-de-ruta.md) para los siguientes pasos.
