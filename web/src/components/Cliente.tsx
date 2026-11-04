import { alternarCliente, NOMBRE_ESTADO, useMarcas } from '../marcas';
import { enlace } from '../ruta';
import { NOMBRE_ESTILO, type ContactoBreve, type Estilo, type Programador } from '../tipos';
import { mesesTexto } from './Directorio';
import { Etiqueta } from './TarjetaConvocatoria';

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

export function BotonCliente({ id, nombre, compacto = false }: { id: string; nombre: string; compacto?: boolean }) {
  const { clientes } = useMarcas();
  const s = clientes[id];
  if (compacto)
    return (
      <button
        type="button"
        className={`estrella${s ? ' estrella-activa' : ''}`}
        aria-pressed={!!s}
        aria-label={s ? `En mi lista (${NOMBRE_ESTADO[s.estado]}): quitar` : 'Añadir a mi lista'}
        title={s ? `En mi lista · ${NOMBRE_ESTADO[s.estado]}` : 'Añadir a mi lista'}
        onClick={() => alternarCliente(id, nombre)}
      >
        {s ? '★' : '☆'}
      </button>
    );
  return (
    <button type="button" className={`marca${s ? ' marca-activa' : ''}`} aria-pressed={!!s} onClick={() => alternarCliente(id, nombre)}>
      {s ? `★ En mi lista · ${NOMBRE_ESTADO[s.estado]}` : '☆ Añadir a mi lista'}
    </button>
  );
}

/** Email y teléfono en una línea, con enlaces para escribir o llamar. */
export function LineaContacto({ c }: { c: ContactoBreve }) {
  const tel = c.telefono?.split(/\s*[;/]\s*/)[0];
  const email = c.email?.split(/;\s*/)[0];
  return (
    <span className="linea-contacto">
      {c.nombre && (
        <span>
          <strong>{c.nombre}</strong>
          {c.cargo && <span className="ayuda"> · {c.cargo}</span>}
        </span>
      )}
      {tel && (
        <a className="accion" href={`tel:${tel.replace(/[^\d+]/g, '')}`} title={tel}>
          ☎ <span className="solo-escritorio">{tel}</span>
          <span className="solo-movil">Llamar</span>
        </a>
      )}
      {email && (
        <a className="accion" href={`mailto:${email}`} title={email}>
          ✉ <span className="solo-escritorio">{email}</span>
          <span className="solo-movil">Email</span>
        </a>
      )}
      {!c.deCultura && <span className="ayuda">(contacto general del ayuntamiento)</span>}
    </span>
  );
}

/** «Junta de Gobierno Local del Ayuntamiento de Cartagena» -> «Ayuntamiento de Cartagena». */
export const nombreCliente = (p: Programador) =>
  p.contactoBreve?.municipio && /ayuntamiento|ajuntament|concello|junta de gobierno|alcald/i.test(p.nombre) && !/instituto|patronato|fundaci|empresa|s\.a\.|consorcio|organismo/i.test(p.nombre)
    ? `Ayuntamiento de ${p.contactoBreve.municipio}`
    : p.nombre;

/** Un cliente (quien contrata música) en una lista: cuánto contrata, cuánto paga, cuándo y a quién llamar. */
export function FilaCliente({ p, estilo }: { p: Programador; estilo?: Estilo }) {
  const estilos = (Object.entries(p.estilos) as [Estilo, number][]).sort((a, b) => b[1] - a[1]);
  return (
    <li className="fila-convocatoria fila-cliente">
      <div className="etiquetas">
        {p.meses.length > 0 && <Etiqueta tono="exito">Contrata en {mesesTexto(p.meses)}</Etiqueta>}
        {estilos.map(([e, n]) => (
          <Etiqueta key={e} tono={e === estilo ? 'acento' : 'neutro'}>
            {NOMBRE_ESTILO[e]} {n}
          </Etiqueta>
        ))}
      </div>
      <a className="fila-titulo" href={enlace('programador', p.id)}>
        {nombreCliente(p)}
      </a>
      <span className="fila-detalle">
        {[p.ciudad, p.provincia !== p.ciudad ? p.provincia : null].filter(Boolean).join(', ')} · {p.contratos} contratos de música
        {p.rango
          ? ` · paga ${p.rango.min === p.rango.max ? euros.format(p.rango.min) : `${euros.format(p.rango.min)}–${euros.format(p.rango.max)}`}`
          : p.importeHabitual != null && ` · suele pagar ${euros.format(p.importeHabitual)}`}
        {p.contratos > 0 && p.menores / p.contratos >= 0.7 && ' · sin concurso'}
        {p.ultimo && ` · último ${new Date(`${p.ultimo}T00:00:00`).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}`}
      </span>
      {p.contactoBreve ? <LineaContacto c={p.contactoBreve} /> : <span className="ayuda">Sin contacto directo: escribe por la web del organismo.</span>}
      <BotonCliente id={p.id} nombre={p.nombre} compacto />
    </li>
  );
}

const MES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Un cliente en la lista: quién es, qué programa, cuánto y cuándo contrata, y a quién llamar. */
export function FilaClienteNueva({ p, estilo, mesActual }: { p: Programador; estilo?: Estilo; mesActual: number }) {
  const estilos = (Object.entries(p.estilos) as [Estilo, number][]).sort((a, b) => b[1] - a[1]);
  const c = p.contactoBreve;
  const tel = c?.telefono?.split(/\s*[;/]\s*/)[0];
  const email = c?.email?.split(/;\s*/)[0];
  const pronto = p.meses.some((m) => [mesActual, (mesActual % 12) + 1].includes(m));
  return (
    <li className="fila-cli">
      <div className="fila-cli-quien">
        <a className="fila-ayuda-titulo" href={enlace('programador', p.id)}>
          {nombreCliente(p)}
        </a>
        <span className="fila-ayuda-detalle">{[p.ciudad, p.provincia !== p.ciudad ? p.provincia : null].filter(Boolean).join(', ')}</span>
        <span className="etiquetas">
          {estilos.map(([e, n]) => (
            <span key={e} className={`etiqueta${e === estilo ? ' etiqueta-acento' : ''}`}>
              {NOMBRE_ESTILO[e]} {n}
            </span>
          ))}
          {p.contratos > 0 && p.menores / p.contratos >= 0.7 && <span className="etiqueta" title="La mayoría de sus conciertos son contratos menores: lo decide el programador">Sin concurso</span>}
        </span>
      </div>
      <dl className="fila-cli-datos">
        <div>
          <dt>Conciertos</dt>
          <dd>{p.contratos}</dd>
        </div>
        <div>
          <dt>Paga</dt>
          <dd>{p.rango ? (p.rango.min === p.rango.max ? euros.format(p.rango.min) : `${euros.format(p.rango.min)}–${euros.format(p.rango.max)}`) : p.importeHabitual != null ? euros.format(p.importeHabitual) : '—'}</dd>
        </div>
        <div>
          <dt>Contrata en</dt>
          <dd className={pronto ? 'tono-verde' : ''}>{p.meses.length ? p.meses.map((m) => MES_CORTO[m - 1]).join(', ') : '—'}</dd>
        </div>
      </dl>
      <div className="fila-cli-contacto">
        {c?.nombre ? (
          <span className="contacto-nombre">
            <strong>{c.nombre}</strong>
            {c.cargo && <span>{c.cargo}</span>}
          </span>
        ) : (
          <span className="ayuda">{c ? (c.deCultura ? 'Cultura' : 'Contacto general') : 'Sin contacto directo'}</span>
        )}
        <span className="botones-contacto">
          {tel && (
            <a className="boton-icono borde" href={`tel:${tel.replace(/[^\d+]/g, '')}`} title={`Llamar: ${tel}`} aria-label={`Llamar al ${tel}`}>
              <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
              </svg>
            </a>
          )}
          {email && (
            <a className="boton-icono borde" href={`mailto:${email}`} title={`Escribir: ${email}`} aria-label={`Escribir a ${email}`}>
              <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6h16v12H4zM4 7l8 6 8-6" />
              </svg>
            </a>
          )}
          <BotonCliente id={p.id} nombre={p.nombre} compacto />
        </span>
      </div>
    </li>
  );
}

/** Quien contrata música en directo (ayuntamientos, diputaciones, teatros...), con a quién llamar y cuándo. */
