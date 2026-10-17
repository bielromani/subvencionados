import { alternarCliente, NOMBRE_ESTADO, useMarcas } from '../marcas';
import { enlace } from '../ruta';
import { NOMBRE_ESTILO, type ContactoBreve, type Estilo, type Programador } from '../tipos';
import { mesesTexto } from './Directorio';
import { Etiqueta } from './TarjetaConvocatoria';

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

export function BotonCliente({ id, nombre }: { id: string; nombre: string }) {
  const { clientes } = useMarcas();
  const s = clientes[id];
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
      {email && <a href={`mailto:${email}`}>✉ {email}</a>}
      {tel && <a href={`tel:${tel.replace(/[^\d+]/g, '')}`}>☎ {tel}</a>}
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
        {p.importeHabitual != null && ` · suele pagar ${euros.format(p.importeHabitual)}`}
        {p.ultimo && ` · último ${new Date(`${p.ultimo}T00:00:00`).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}`}
      </span>
      {p.contactoBreve ? <LineaContacto c={p.contactoBreve} /> : <span className="ayuda">Sin contacto directo: escribe por la web del organismo.</span>}
      <span className="botones-marca">
        <BotonCliente id={p.id} nombre={p.nombre} />
      </span>
    </li>
  );
}
