import { useEffect, useState } from 'react';
import { api } from '../api';
import { FilaConvocatoria } from '../components/FilaConvocatoria';
import { LineaContacto, nombreCliente } from '../components/Cliente';
import { csv, descargar, type EventoDia, ics } from '../exportar';
import { actualizarCliente, alternarCliente, importarMarcas, NOMBRE_ESTADO, useMarcas, type EstadoCliente, type SeguimientoCliente } from '../marcas';
import { enlace } from '../ruta';
import type { Convocatoria, Programador } from '../tipos';

const ORDEN_ESTADO: EstadoCliente[] = ['interesado', 'contactado', 'pendiente', 'cerrado', 'descartado'];
const MES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

/** aaaa-mm-dd en la hora local del usuario. */
const diaLocal = (d = new Date()) => d.toLocaleDateString('sv-SE');
const sumarDias = (n: number) => diaLocal(new Date(Date.now() + n * 86_400_000));
const fechaCorta = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });

type Grupo = 'atrasadas' | 'semana' | 'despues' | 'sinFecha' | 'terminados';
const TITULO_GRUPO: Record<Grupo, string> = {
  atrasadas: 'Para hoy o atrasadas',
  semana: 'Esta semana',
  despues: 'Más adelante',
  sinFecha: 'Sin fecha de próxima acción',
  terminados: 'Cerrados y descartados',
};

function grupoDe(s: SeguimientoCliente, hoy: string): Grupo {
  if (s.estado === 'cerrado' || s.estado === 'descartado') return 'terminados';
  if (!s.proxima) return 'sinFecha';
  if (s.proxima <= hoy) return 'atrasadas';
  return s.proxima <= sumarDias(7) ? 'semana' : 'despues';
}

/** Lista de clientes por urgencia: primero lo que toca hoy, luego por fecha; sin fecha, por estado. */
export function ordenarClientes(clientes: Record<string, SeguimientoCliente>, hoy = diaLocal()) {
  const grupos = Object.keys(TITULO_GRUPO) as Grupo[];
  return Object.keys(clientes).sort((a, b) => {
    const x = clientes[a]!;
    const y = clientes[b]!;
    return (
      grupos.indexOf(grupoDe(x, hoy)) - grupos.indexOf(grupoDe(y, hoy)) ||
      (x.proxima ?? '').localeCompare(y.proxima ?? '') ||
      ORDEN_ESTADO.indexOf(x.estado) - ORDEN_ESTADO.indexOf(y.estado) ||
      y.actualizado.localeCompare(x.actualizado)
    );
  });
}

function FilaSeguimiento({ id, s, p, hoy }: { id: string; s: SeguimientoCliente; p: Programador | undefined; hoy: string }) {
  const cambiarEstado = (estado: EstadoCliente) =>
    // Al contactar sin fecha de próxima acción, se propone volver a llamar en una semana.
    actualizarCliente(id, { estado, ...((estado === 'contactado' || estado === 'interesado') && !s.proxima && { proxima: sumarDias(7) }) });
  const atrasada = s.proxima && s.proxima < hoy && grupoDe(s, hoy) === 'atrasadas';
  return (
    <li className="fila-convocatoria fila-cliente">
      <a className="fila-titulo" href={enlace('programador', id)}>
        {p ? nombreCliente(p) : s.nombre}
      </a>
      {p && (
        <span className="fila-detalle">
          {[p.ciudad, p.provincia].filter(Boolean).join(', ')} · {p.contratos} conciertos
          {p.rango && ` · paga ${euros.format(p.rango.min)}–${euros.format(p.rango.max)}`}
          {p.meses.length > 0 && ` · contrata en ${p.meses.map((m) => MES_CORTO[m - 1]).join(', ')}`}
        </span>
      )}
      {p?.contactoBreve && <LineaContacto c={p.contactoBreve} />}
      <div className="seguimiento">
        <select value={s.estado} onChange={(e) => cambiarEstado(e.target.value as EstadoCliente)} aria-label="Estado">
          {ORDEN_ESTADO.map((e) => (
            <option key={e} value={e}>
              {NOMBRE_ESTADO[e]}
            </option>
          ))}
        </select>
        <label className={`proxima${atrasada ? ' proxima-atrasada' : ''}`}>
          Próxima acción
          <input type="date" value={s.proxima ?? ''} onChange={(e) => actualizarCliente(id, { proxima: e.target.value || null })} />
        </label>
        <span className="atajos-fecha">
          <button type="button" className="marca" onClick={() => actualizarCliente(id, { proxima: sumarDias(7) })}>
            +1 sem.
          </button>
          <button type="button" className="marca" onClick={() => actualizarCliente(id, { proxima: sumarDias(30) })}>
            +1 mes
          </button>
        </span>
        <input
          type="text"
          defaultValue={s.nota}
          placeholder="Nota: con quién hablaste, qué grupo le ofreciste…"
          onBlur={(e) => e.target.value !== s.nota && actualizarCliente(id, { nota: e.target.value })}
          aria-label="Nota"
        />
        <button type="button" className="marca" onClick={() => alternarCliente(id, s.nombre)}>
          Quitar
        </button>
      </div>
    </li>
  );
}

/** Clientes en seguimiento: estado, próxima acción con fecha, nota propia y contacto a mano. */
function MisClientes({ datos }: { datos: Record<string, Programador> }) {
  const { clientes } = useMarcas();
  const ids = Object.keys(clientes);
  const hoy = diaLocal();
  const orden = ordenarClientes(clientes, hoy);
  const pendientesHoy = orden.filter((id) => grupoDe(clientes[id]!, hoy) === 'atrasadas').length;
  let anterior: Grupo | null = null;
  return (
    <section className="bloque">
      <h3>
        Clientes <span className="contador">{ids.length}</span>
      </h3>
      <p className="ayuda">
        Ayuntamientos y programadores a los que quieres vender tus grupos. Pon fecha a la próxima acción y la lista se ordena sola por urgencia.
      </p>
      {pendientesHoy > 0 && (
        <p className="llamada">
          Tienes {pendientesHoy} {pendientesHoy === 1 ? 'cliente' : 'clientes'} para hoy o con la fecha pasada.
        </p>
      )}
      {ids.length === 0 ? (
        <p className="ayuda">
          Aún no has añadido ninguno: en <a href="#/clientes">Clientes</a> pulsa «☆ Añadir a mi lista».
        </p>
      ) : (
        <ul className="filas">
          {orden.map((id) => {
            const s = clientes[id]!;
            const g = grupoDe(s, hoy);
            const cabecera = g !== anterior ? <li key={`g-${g}`} className="grupo-lista">{TITULO_GRUPO[g]}</li> : null;
            anterior = g;
            return [cabecera, <FilaSeguimiento key={id} id={id} s={s} p={datos[id]} hoy={hoy} />];
          })}
        </ul>
      )}
    </section>
  );
}

const origen = () => `${window.location.origin}${window.location.pathname}`;
const cierreDe = (c: Convocatoria) => c.fechaFinSolicitud ?? c.cierreAproximado ?? null;

/** Excel, calendario y copia de seguridad de todo lo de Mi lista. */
function Descargas({ clientes, programadores, ayudas }: { clientes: Record<string, SeguimientoCliente>; programadores: Record<string, Programador>; ayudas: Convocatoria[] }) {
  const marcas = useMarcas();
  const [aviso, setAviso] = useState<string | null>(null);
  const hoy = diaLocal();
  const excelClientes = () => {
    const filas = ordenarClientes(clientes, hoy).map((id) => {
      const s = clientes[id]!;
      const p = programadores[id];
      const c = p?.contactoBreve;
      return [
        p ? nombreCliente(p) : s.nombre,
        p?.provincia,
        NOMBRE_ESTADO[s.estado],
        s.proxima,
        s.nota,
        c?.nombre,
        c?.cargo,
        c?.email,
        c?.telefono,
        p?.contratos,
        p?.rango ? `${Math.round(p.rango.min)}–${Math.round(p.rango.max)} €` : null,
        p?.meses.map((m) => MES_CORTO[m - 1]).join(', '),
        `${origen()}${enlace('programador', id)}`,
      ];
    });
    descargar(
      `mis-clientes-${hoy}.csv`,
      csv(['Cliente', 'Provincia', 'Estado', 'Próxima acción', 'Nota', 'Contacto', 'Cargo', 'Email', 'Teléfono', 'Conciertos contratados', 'Paga normalmente', 'Meses en que contrata', 'Ficha'], filas),
      'text/csv;charset=utf-8',
    );
  };
  const excelAyudas = () =>
    descargar(
      `mis-ayudas-${hoy}.csv`,
      csv(
        ['Ayuda', 'Organismo', 'Plazo', 'Abre', 'Cierra', 'Cierre aproximado', 'Presupuesto', 'Ficha', 'BDNS'],
        ayudas.map((c) => [
          c.tituloCorto ?? c.titulo,
          c.organoNiveles.slice(1).join(' · ') || c.organo,
          { abierta: 'Abierto', proxima: 'Por abrir', cerrada: 'Cerrado', desconocido: 'Sin fechas' }[c.plazo],
          c.fechaInicioSolicitud,
          c.fechaFinSolicitud,
          c.fechaFinSolicitud ? null : c.cierreAproximado,
          c.presupuesto,
          `${origen()}${enlace('convocatoria', c.id)}`,
          c.urlDetalle,
        ]),
      ),
      'text/csv;charset=utf-8',
    );
  const calendario = () => {
    const eventos: EventoDia[] = [];
    for (const [id, s] of Object.entries(clientes)) {
      if (!s.proxima || s.estado === 'cerrado' || s.estado === 'descartado') continue;
      const p = programadores[id];
      eventos.push({
        uid: `cliente-${id}-${s.proxima}`,
        fecha: s.proxima,
        titulo: `Llamar: ${p ? nombreCliente(p) : s.nombre}`,
        descripcion: [s.nota, p?.contactoBreve?.telefono && `Tel. ${p.contactoBreve.telefono}`, p?.contactoBreve?.email].filter(Boolean).join(' · '),
        url: `${origen()}${enlace('programador', id)}`,
      });
    }
    for (const c of ayudas) {
      if (c.plazo === 'proxima' && c.fechaInicioSolicitud) eventos.push({ uid: `abre-${c.id}`, fecha: c.fechaInicioSolicitud, titulo: `Abre: ${c.tituloCorto ?? c.titulo}`, url: `${origen()}${enlace('convocatoria', c.id)}` });
      const cierre = cierreDe(c);
      if (cierre && cierre >= hoy && c.plazo !== 'cerrada') {
        eventos.push({
          uid: `cierra-${c.id}`,
          fecha: cierre,
          titulo: `Cierra${c.fechaFinSolicitud ? '' : ' (aprox.)'}: ${c.tituloCorto ?? c.titulo}`,
          url: `${origen()}${enlace('convocatoria', c.id)}`,
        });
      }
    }
    if (!eventos.length) {
      setAviso('No hay fechas que añadir: pon fecha de próxima acción a tus clientes o guarda ayudas con plazo.');
      return;
    }
    descargar(`mi-lista-${hoy}.ics`, ics('Mi lista · Subvencionados', eventos.sort((a, b) => a.fecha.localeCompare(b.fecha))), 'text/calendar;charset=utf-8');
    setAviso(`${eventos.length} fechas en el calendario. Si lo vuelves a importar, los eventos se actualizan en vez de duplicarse.`);
  };
  const copia = () => descargar(`copia-mi-lista-${hoy}.json`, JSON.stringify(marcas, null, 1), 'application/json');
  const restaurar = (f: File | undefined) => {
    if (!f) return;
    f.text()
      .then((t) => importarMarcas(JSON.parse(t)))
      .then(
        () => setAviso('Copia restaurada y sumada a lo que ya tenías.'),
        (e: Error) => setAviso(e instanceof SyntaxError ? 'El fichero no es una copia de Mi lista' : e.message),
      );
  };
  return (
    <section className="bloque descargas">
      <h3>Descargar</h3>
      <p className="acciones">
        <button type="button" className="accion" onClick={excelClientes} disabled={!Object.keys(clientes).length}>
          Clientes en Excel
        </button>
        <button type="button" className="accion" onClick={excelAyudas} disabled={!ayudas.length}>
          Ayudas en Excel
        </button>
        <button type="button" className="accion" onClick={calendario}>
          📅 Mis fechas al calendario
        </button>
      </p>
      <p className="ayuda">
        Tu lista se guarda solo en este navegador. Para pasarla a otro dispositivo o no perderla:{' '}
        <button type="button" className="enlace-boton" onClick={copia}>
          descargar copia
        </button>{' '}
        ·{' '}
        <label className="enlace-boton">
          restaurar copia
          <input type="file" accept="application/json,.json" hidden onChange={(e) => restaurar(e.target.files?.[0])} />
        </label>
      </p>
      {aviso && <p className="ayuda">{aviso}</p>}
    </section>
  );
}

const fila = (c: Convocatoria) => ({ convocatoria: c, plazo: c.plazo, puntuacion: 0, encaje: 'directo' as const, motivos: [], avisos: [] });
// Primero las que se pueden pedir (por fecha de cierre o apertura), luego el resto por fecha de publicación.
const orden = (c: Convocatoria) =>
  c.plazo === 'abierta' ? `0${cierreDe(c) ?? '9999'}` : c.plazo === 'proxima' ? `1${c.fechaInicioSolicitud ?? '9999'}` : `2${9999 - Number(c.fechaPublicacion?.slice(0, 4) ?? 0)}`;

/** Las convocatorias que el usuario ha guardado y las que ha ocultado (para poder recuperarlas). */
export function Guardadas() {
  const { guardadas, ocultas, clientes } = useMarcas();
  const [datos, setDatos] = useState<Record<string, Convocatoria>>({});
  const [programadores, setProgramadores] = useState<Record<string, Programador>>({});
  const idsClientes = Object.keys(clientes);
  useEffect(() => {
    const faltan = idsClientes.filter((id) => !programadores[id]);
    if (!faltan.length) return;
    api
      .programadores(`ids=${encodeURIComponent(faltan.join(','))}&porPagina=200`)
      .then((r) => setProgramadores((d) => ({ ...d, ...Object.fromEntries(r.items.map((p) => [p.id, p])) })), (e: Error) => setError(e.message));
  }, [idsClientes.join(',')]);
  const [error, setError] = useState<string | null>(null);
  const ids = [...guardadas, ...ocultas];
  const clave = ids.join(',');

  useEffect(() => {
    const faltan = ids.filter((id) => !datos[id]);
    if (!faltan.length) return;
    api
      .convocatorias({ ids: faltan.join(','), porPagina: 500 } as never)
      .then((r) => setDatos((d) => ({ ...d, ...Object.fromEntries(r.items.map((c) => [c.id, c])) })), (e: Error) => setError(e.message));
  }, [clave]);

  const lista = (xs: string[]) => xs.map((id) => datos[id]).filter((c): c is Convocatoria => !!c).sort((a, b) => orden(a).localeCompare(orden(b)));

  return (
    <section>
      {error && <p className="error">{error}</p>}
      <MisClientes datos={programadores} />
      <section className="bloque">
        <h3>
          Ayudas guardadas <span className="contador">{guardadas.length}</span>
        </h3>
        <p className="ayuda">Las que te interesan de verdad.</p>
        {guardadas.length === 0 ? (
          <p className="ayuda">Aún no has guardado ninguna: pulsa «☆ Guardar» en cualquier subvención.</p>
        ) : (
          <ul className="filas">
            {lista(guardadas).map((c) => (
              <FilaConvocatoria key={c.id} m={fila(c)} destino />
            ))}
          </ul>
        )}
      </section>
      <Descargas clientes={clientes} programadores={programadores} ayudas={lista(guardadas)} />
      <section className="bloque">
        <h3>
          Ayudas que no me interesan <span className="contador">{ocultas.length}</span>
        </h3>
        <p className="ayuda">Ya no te aparecen en ninguna lista. Pulsa «recuperar» para que vuelvan.</p>
        {ocultas.length > 0 && (
          <ul className="filas">
            {lista(ocultas).map((c) => (
              <FilaConvocatoria key={c.id} m={fila(c)} destino mostrarOcultas />
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
