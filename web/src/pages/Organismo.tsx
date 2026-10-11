import { useEffect, useState } from 'react';
import { api } from '../api';
import { Contacto } from '../components/Contacto';
import { FilaContrato } from '../components/FilaContrato';
import { TarjetaConvocatoria } from '../components/TarjetaConvocatoria';
import { NOMBRE_ADMINISTRACION, type ContactoMunicipio, type Contrato, type Convocatoria, type Organismo } from '../tipos';
import { lugar } from './Organismos';

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const POR_TANDA = 20;

export function PaginaOrganismo({ id }: { id: string }) {
  const [o, setO] = useState<(Organismo & { convocatorias: Convocatoria[]; contratos: { total: number; items: Contrato[] }; contacto: ContactoMunicipio | null }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vistas, setVistas] = useState(POR_TANDA);
  const [soloVigentes, setSoloVigentes] = useState(false);

  useEffect(() => {
    setO(null);
    api.organismo(id).then(setO, (e: Error) => setError(e.message));
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!o) return <p className="ayuda">Cargando…</p>;
  const lista = soloVigentes ? o.convocatorias.filter((c) => c.plazo === 'abierta' || c.plazo === 'proxima') : o.convocatorias;

  return (
    <section className="pagina">
      <p className="migas">
        <a href="#/organismos">← Organismos</a>
      </p>
      <header className="bloque">
        <h2>{o.nombre}</h2>
        <p className="organo">{o.niveles.slice(1, -1).join(' · ')}</p>
        <dl className="datos">
          <div>
            <dt>Administración</dt>
            <dd>{NOMBRE_ADMINISTRACION[o.administracion]}</dd>
          </div>
          <div>
            <dt>Dónde</dt>
            <dd>{lugar(o)}</dd>
          </div>
          <div>
            <dt>Convocatorias de música</dt>
            <dd>
              {o.convocatorias.length} ({o.concursos} concursos, {o.directas} directas)
            </dd>
          </div>
          <div>
            <dt>Concedido</dt>
            <dd>{euros.format(o.concedidoTotal)}</dd>
          </div>
          <div>
            <dt>Activo</dt>
            <dd>
              {o.primerAnio ?? '—'}–{o.ultimoAnio ?? '—'}
            </dd>
          </div>
        </dl>
      </header>

      {o.contacto && <Contacto c={o.contacto} />}

      {o.porAnio.length > 0 && (
        <section className="bloque">
          <h3>Año a año</h3>
          <div className="tabla-scroll">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Año</th>
                  <th className="num">Convocatorias</th>
                  <th className="num">Presupuesto</th>
                  <th className="num">Concedido</th>
                </tr>
              </thead>
              <tbody>
                {[...o.porAnio].reverse().map((a) => (
                  <tr key={a.anio}>
                    <td>{a.anio}</td>
                    <td className="num">{a.convocatorias}</td>
                    <td className="num">{euros.format(a.presupuesto)}</td>
                    <td className="num">{euros.format(a.concedido)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="ayuda">La BDNS solo publica las concesiones de los últimos cuatro años.</p>
        </section>
      )}

      {o.beneficiarios.length > 0 && (
        <section className="bloque">
          <h3>Quién ha recibido más (entidades)</h3>
          <ul>
            {o.beneficiarios.map((b) => (
              <li key={b.nombre}>
                {b.nombre} · {euros.format(b.importe)} en {b.veces} {b.veces === 1 ? 'concesión' : 'concesiones'}
              </li>
            ))}
          </ul>
        </section>
      )}

      {o.contratos.total > 0 && (
        <section className="bloque">
          <h3>
            Contratos de música en {o.ubicacion?.municipio} <span className="contador">{o.contratos.total}</span>
          </h3>
          <p className="ayuda">
            Contratos públicos de conciertos de los órganos de contratación de este municipio (ayuntamiento, patronatos,
            empresas municipales…), de la Plataforma de Contratación del Sector Público.
          </p>
          <ul className="filas">
            {o.contratos.items.map((c) => (
              <FilaContrato key={c.id} c={c} />
            ))}
          </ul>
        </section>
      )}

      <section className="bloque">
        <h3>Sus convocatorias</h3>
        <label className="casilla">
          <input type="checkbox" checked={soloVigentes} onChange={(e) => setSoloVigentes(e.target.checked)} /> Solo abiertas o
          por abrir
        </label>
        {lista.length === 0 && <p className="ayuda">Ninguna ahora mismo.</p>}
        {lista.slice(0, vistas).map((c) => (
          <TarjetaConvocatoria key={c.id} c={c} />
        ))}
        {lista.length > vistas && <button onClick={() => setVistas((v) => v + POR_TANDA)}>Ver más ({lista.length - vistas})</button>}
      </section>
    </section>
  );
}
