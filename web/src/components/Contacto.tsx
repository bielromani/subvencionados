import type { ContactoMunicipio } from '../tipos';

const correo = (lista: string) =>
  lista.split(/;\s*/).map((e, i) => (
    <span key={e}>
      {i > 0 && ' · '}
      <a href={`mailto:${e}`}>{e}</a>
    </span>
  ));
const telefono = (t: string) => <a href={`tel:${t.split(/\s*[;/]\s*/)[0]!.replace(/[^\d+]/g, '')}`}>{t}</a>;

/** A quién escribir en un ayuntamiento: responsables de cultura, contacto de cultura y del ayuntamiento, con fuentes. */
export function Contacto({ c }: { c: ContactoMunicipio }) {
  const conCultura = c.personas.length > 0 || c.cultura.email || c.cultura.telefono;
  // El contacto de cultura solo se repite abajo si no es el de alguna de las personas.
  const culturaAparte = (c.cultura.email || c.cultura.telefono) && !c.personas.some((p) => p.email === c.cultura.email && p.telefono === c.cultura.telefono);
  return (
    <section className="bloque contacto">
      <h3>A quién contactar en {c.municipio}</h3>
      {c.personas.length > 0 ? (
        <ul className="personas">
          {c.personas.map((p) => (
            <li key={`${p.nombre}-${p.cargo}`}>
              <span>
                <strong>{p.nombre}</strong>
                {p.partido && <span className="partido"> · {p.partido}</span>}
              </span>
              <span className="fila-detalle">{[p.cargo, p.area].filter(Boolean).join(' · ')}</span>
              {(p.email || p.telefono) && (
                <span className="fila-detalle">
                  {p.email && correo(p.email)}
                  {p.email && p.telefono && ' · '}
                  {p.telefono && telefono(p.telefono)}
                </span>
              )}
              {p.direccion && <span className="fila-detalle">{p.direccion}</span>}
              {p.notas && <span className="fila-motivos">{p.notas}</span>}
              {p.contactoOmitido && <span className="fila-motivos">Hay un email o móvil personal publicado que aquí no se enseña: mejor el del ayuntamiento.</span>}
              <span className="fuente">
                Fuente: {p.enlace ? (
                  <a href={p.enlace} target="_blank" rel="noreferrer">
                    {p.fuente ?? 'enlace'} ↗
                  </a>
                ) : (
                  p.fuente ?? '—'
                )}
                {p.anio && ` (${p.anio})`}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ayuda">No se conoce el nombre del responsable de cultura: escribe al ayuntamiento y pide por la concejalía de cultura.</p>
      )}
      <dl className="datos">
        {culturaAparte && (
          <div>
            <dt>Cultura</dt>
            <dd>
              {c.cultura.email && correo(c.cultura.email)}
              {c.cultura.email && c.cultura.telefono && ' · '}
              {c.cultura.telefono && telefono(c.cultura.telefono)}
            </dd>
          </div>
        )}
        <div>
          <dt>Ayuntamiento</dt>
          <dd>
            {[
              c.ayuntamiento.email && correo(c.ayuntamiento.email),
              c.ayuntamiento.telefono && telefono(c.ayuntamiento.telefono),
              c.ayuntamiento.web && (
                <a href={c.ayuntamiento.web} target="_blank" rel="noreferrer">
                  web ↗
                </a>
              ),
            ]
              .filter(Boolean)
              .map((x, i) => (
                <span key={i}>
                  {i > 0 && ' · '}
                  {x}
                </span>
              ))}
            {c.ayuntamiento.direccion && <span className="fila-detalle">{c.ayuntamiento.direccion}</span>}
          </dd>
        </div>
        {c.alcaldia && (
          <div>
            <dt>Alcaldía</dt>
            <dd>
              {c.alcaldia.nombre}
              {c.alcaldia.partido && ` (${c.alcaldia.partido})`}
            </dd>
          </div>
        )}
      </dl>
      <p className="ayuda">
        {conCultura ? '' : 'Sin contacto directo de cultura. '}
        Datos públicos de {c.fuentes ?? 'fuentes oficiales'}. Los cargos cambian (elecciones municipales en mayo de 2027): compruébalo antes de
        escribir.
      </p>
    </section>
  );
}
