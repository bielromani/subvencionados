// Informe del nicho a partir de los datos descargados de la BDNS. Todas las cifras salen de
// datos/bdns/; nada se estima salvo lo que se indica expresamente (próximas previstas).

import { plazo } from './emparejamiento.js';
import { agruparOrganismos } from './organismos.js';
import type { Convocatoria } from './tipos.js';

const euros = (n: number) => `${Math.round(n).toLocaleString('es-ES', { useGrouping: 'always' })} €`;
const num = (n: number) => n.toLocaleString('es-ES', { useGrouping: 'always' });
const anioDe = (c: Convocatoria) => c.fechaPublicacion?.slice(0, 4) ?? 'sin fecha';
const concedido = (cs: Convocatoria[]) => cs.reduce((t, c) => t + (c.concesiones?.importeTotal ?? 0), 0);

function mediana(valores: number[]): number | null {
  const v = valores.filter((x) => x > 0).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m]! : (v[m - 1]! + v[m]!) / 2;
}

function tabla(cabecera: string[], filas: (string | number)[][]): string {
  const alinear = cabecera.map((_, i) => (filas.some((f) => typeof f[i] === 'number' || /€$/.test(String(f[i]))) ? '---:' : '---'));
  return [
    `| ${cabecera.join(' | ')} |`,
    `|${alinear.join('|')}|`,
    ...filas.map((f) => `| ${f.map((x) => (typeof x === 'number' ? num(x) : x)).join(' | ')} |`),
  ].join('\n');
}

function agrupar<T>(xs: T[], clave: (x: T) => string[]): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const x of xs) for (const k of clave(x)) m.set(k, [...(m.get(k) ?? []), x]);
  return m;
}

const NOMBRE_LINEA: Record<string, string> = {
  giras: 'Giras y circulación',
  festivales: 'Festivales, ciclos y programación',
  produccion: 'Producción y creación',
  grabacion: 'Grabación',
  internacional: 'Internacionalización',
  composicion: 'Composición y encargos',
  formacion: 'Formación (escuelas, conservatorios, becas)',
  equipamiento: 'Equipamiento e inversiones',
  'sin especificar': 'Sin especificar',
};

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function generarInforme(todas: Convocatoria[], hoy = new Date()): string {
  const musica = todas.filter((c) => c.clasificacion.musical);
  const objetivo = musica.filter((c) => c.clasificacion.estilosCompatibles.length > 0);
  const concursos = objetivo.filter((c) => c.tipo === 'concurrencia');
  const directas = objetivo.filter((c) => c.tipo === 'directa');
  const fechas = musica.map((c) => c.fechaPublicacion).filter((f): f is string => !!f).sort();
  const anioActual = String(hoy.getFullYear());
  // La BDNS solo publica las concesiones de los últimos años: el concedido empieza en esta fecha.
  const fechasConcesion = objetivo
    .flatMap((c) => c.concesiones?.entidades.map((e) => e.fecha) ?? [])
    .filter((f): f is string => !!f)
    .sort();
  const esFormacion = (c: Convocatoria) => c.clasificacion.lineas.includes('formacion');
  const sinFormacion = objetivo.filter((c) => !esFormacion(c));

  // Por año
  const porAnio = [...agrupar(objetivo, (c) => [anioDe(c)]).entries()].sort((a, b) => a[0].localeCompare(b[0]));
  // Por comunidad
  const ambito = (c: Convocatoria) => (c.ambitoNacional ? ['Sin restricción territorial'] : c.ccaa.length ? c.ccaa : ['No indicado']);
  const porCcaa = [...agrupar(objetivo, ambito).entries()].sort((a, b) => b[1].length - a[1].length);
  // Quién puede pedir los concursos
  const b = (f: (c: Convocatoria) => boolean | null) => concursos.filter(f).length;
  // Mes de apertura de los concursos
  const porMes = agrupar(
    concursos.filter((c) => c.fechaInicioSolicitud),
    (c) => [String(Number(c.fechaInicioSolicitud!.slice(5, 7)))],
  );
  // Organismos
  const organismos = agruparOrganismos(objetivo)
    .filter((o) => o.concedidoTotal > 0)
    .sort((a, b) => b.concedidoTotal - a.concedidoTotal)
    .slice(0, 20);
  // Series y previsión
  const series = new Map(objetivo.filter((c) => c.serie).map((c) => [c.serie!.id, c.serie!]));
  const enTresMeses = new Date(hoy.getFullYear(), hoy.getMonth() + 3, 1).toISOString().slice(0, 7);
  const previstas = [...series.values()].filter(
    (s) => s.proximaPrevista && s.proximaPrevista >= hoy.toISOString().slice(0, 7) && s.proximaPrevista < enTresMeses,
  );

  const lineas = [
    '# Informe del nicho: subvenciones públicas para música en España',
    '',
    `Generado el ${hoy.toISOString().slice(0, 10)} con \`npm run informe\` a partir de \`datos/bdns/\`. Fuente: Base de`,
    'Datos Nacional de Subvenciones (BDNS). Las convocatorias se clasifican por reglas (ver',
    '`server/src/clasificacion/musica.ts`); la precisión medida está en `docs/evaluacion-clasificador.md`.',
    '',
    '## Resumen',
    '',
    `- Periodo cubierto: ${fechas[0] ?? '—'} a ${fechas.at(-1) ?? '—'}.`,
    `- Convocatorias de música: **${num(musica.length)}**; compatibles con jazz, clásica u ópera: **${num(objetivo.length)}**`,
    `  (${num(concursos.length)} concursos y ${num(directas.length)} concesiones directas o nominativas).`,
    `- Importe concedido registrado en las compatibles: **${euros(concedido(objetivo))}**`,
    `  (${euros(concedido(concursos))} en concursos y ${euros(concedido(directas))} en concesiones directas).` +
      (fechasConcesion.length ? ` Concesiones registradas desde ${fechasConcesion[0]}: la BDNS solo publica las de los últimos cuatro años.` : ''),
    `- Sin contar formación (escuelas de música, conservatorios, becas), que no es para el promotor:` +
      ` ${num(sinFormacion.length)} convocatorias y ${euros(concedido(sinFormacion))} concedidos.`,
    `- Mencionan expresamente el estilo: jazz ${num(objetivo.filter((c) => c.clasificacion.estilosExplicitos.includes('jazz')).length)},` +
      ` clásica ${num(objetivo.filter((c) => c.clasificacion.estilosExplicitos.includes('clasica')).length)},` +
      ` ópera y lírica ${num(objetivo.filter((c) => c.clasificacion.estilosExplicitos.includes('opera')).length)}.` +
      ' El resto son ayudas de música en general.',
    `- Concursos con el plazo abierto hoy: **${num(concursos.filter((c) => plazo(c, hoy) === 'abierta').length)}**;` +
      ` por abrir: **${num(concursos.filter((c) => plazo(c, hoy) === 'proxima').length)}**.`,
    `- Convocatorias que se repiten año tras año (series): ${num(series.size)}; previstas en los próximos 3 meses según su`,
    `  historial (estimación): ${num(previstas.length)}.`,
    `- Concursos generales de cultura (desde 2023) en los que un concierto puede encajar: ${num(todas.filter((c) => c.clasificacion.culturaGeneral && c.tipo === 'concurrencia').length)}.`,
    '',
    '## Por año (compatibles con jazz, clásica u ópera)',
    '',
    tabla(
      ['Año', 'Convocatorias', 'Concursos', 'Directas', 'Presupuesto declarado', 'Concedido registrado'],
      porAnio.map(([anio, cs]) => [
        anio === anioActual ? `${anio} (en curso)` : anio,
        cs.length,
        cs.filter((c) => c.tipo === 'concurrencia').length,
        cs.filter((c) => c.tipo === 'directa').length,
        euros(cs.reduce((t, c) => t + (c.presupuesto ?? 0), 0)),
        euros(concedido(cs)),
      ]),
    ),
    '',
    'El concedido de los años recientes crece con el tiempo: las concesiones se registran meses después de la convocatoria.',
    '',
    '## Qué financian (compatibles)',
    '',
    tabla(
      ['Actividad', 'Convocatorias', 'Concursos', 'Concedido registrado'],
      [
        ...[...agrupar(objetivo, (c) => (c.clasificacion.lineas.length ? c.clasificacion.lineas : ['sin especificar'])).entries()]
          .sort((a, b) => b[1].length - a[1].length)
          .map(([k, cs]) => [NOMBRE_LINEA[k] ?? k, cs.length, cs.filter((c) => c.tipo === 'concurrencia').length, euros(concedido(cs))]),
      ],
    ),
    '',
    'Una convocatoria puede financiar varias actividades. La formación (escuelas de música y conservatorios) concentra',
    'importes altos pero no es una oportunidad para el promotor.',
    '',
    '## Por comunidad autónoma',
    '',
    tabla(
      ['Ámbito', 'Convocatorias', 'Concursos', 'Concedido registrado'],
      porCcaa.map(([k, cs]) => [k, cs.length, cs.filter((c) => c.tipo === 'concurrencia').length, euros(concedido(cs))]),
    ),
    '',
    '## Por administración',
    '',
    tabla(
      ['Administración', 'Convocatorias', 'Concursos', 'Concedido registrado'],
      [...agrupar(objetivo, (c) => [c.administracion]).entries()]
        .sort((a, b) => b[1].length - a[1].length)
        .map(([k, cs]) => [k, cs.length, cs.filter((c) => c.tipo === 'concurrencia').length, euros(concedido(cs))]),
    ),
    '',
    '## Quién puede pedir los concursos',
    '',
    tabla(
      ['Beneficiarios admitidos', 'Concursos'],
      [
        ['Autónomos y empresas', b((c) => c.clasificacion.beneficiarios.empresas)],
        ['Asociaciones y fundaciones', b((c) => c.clasificacion.beneficiarios.sinAnimoLucro)],
        ['Personas físicas (músicos: premios, concursos, becas)', b((c) => c.clasificacion.beneficiarios.personasFisicas)],
        ['Ayuntamientos y entidades locales', b((c) => c.clasificacion.beneficiarios.entidadesLocales)],
      ],
    ),
    '',
    'Un concurso puede admitir varios tipos de beneficiario.',
    '',
    '## Importes típicos',
    '',
    `- Mediana del presupuesto declarado de los concursos: ${(() => {
      const m = mediana(concursos.map((c) => c.presupuesto ?? 0));
      return m === null ? '—' : euros(m);
    })()}.`,
    `- Mediana de lo concedido a una entidad en una convocatoria: ${(() => {
      const m = mediana(objetivo.flatMap((c) => c.concesiones?.entidades.map((e) => e.importe) ?? []));
      return m === null ? '—' : euros(m);
    })()}.`,
    '',
    '## Mes en que abren los concursos',
    '',
    tabla(
      ['Mes', 'Concursos'],
      MESES.map((nombre, i) => [nombre, porMes.get(String(i + 1))?.length ?? 0]),
    ),
    '',
    '## Organismos que más han concedido',
    '',
    tabla(
      ['Organismo', 'Entidad', 'Convocatorias', 'Años', 'Concedido registrado'],
      organismos.map((o) => [
        o.nombre,
        o.entidad ?? '—',
        o.convocatorias,
        o.primerAnio === o.ultimoAnio ? String(o.primerAnio) : `${o.primerAnio}-${o.ultimoAnio}`,
        euros(o.concedidoTotal),
      ]),
    ),
    '',
  ];
  return lineas.join('\n');
}
