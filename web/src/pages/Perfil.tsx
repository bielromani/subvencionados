import { useEffect, useState } from 'react';
import { api, ErrorApi } from '../api';
import { AvisoCuenta } from '../components/AvisoCuenta';
import { NOMBRE_ESTILO, NOMBRE_FORMA, NOMBRE_LINEA, type Estilo, type Grupo, type Meta, type Perfil as TPerfil } from '../tipos';

export function Perfil({ meta, alGuardar }: { meta: Meta; alGuardar: () => void }) {
  const [perfil, setPerfil] = useState<TPerfil | null>(null);
  const [errores, setErrores] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api.perfil().then(setPerfil, (e: Error) => setErrores([e.message]));
  }, []);

  if (!perfil) return <p className="ayuda">Cargando…</p>;

  const cambiar = <K extends keyof TPerfil>(clave: K, valor: TPerfil[K]) => setPerfil({ ...perfil, [clave]: valor });
  const alternar = <T,>(lista: T[], valor: T) => (lista.includes(valor) ? lista.filter((x) => x !== valor) : [...lista, valor]);
  const cambiarGrupo = (i: number, cambios: Partial<Grupo>) =>
    cambiar('grupos', perfil.grupos.map((g, j) => (j === i ? { ...g, ...cambios } : g)));

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setErrores([]);
    try {
      setPerfil(await api.guardarPerfil(perfil!));
      alGuardar();
    } catch (err) {
      setErrores(err instanceof ErrorApi ? err.errores : [(err as Error).message]);
    } finally {
      setGuardando(false);
    }
  }

  const ESTILO_CORTO: Record<string, string> = { jazz: 'JZ', clasica: 'CL', opera: 'OP' };
  return (
    <>
      <AvisoCuenta />
      <form className="ajustes perfil-nuevo" onSubmit={guardar}>
        <section className="grupo-ajustes" aria-labelledby="p-actividad">
          <h2 id="p-actividad">Tu actividad</h2>
          <div className="campos-rejilla">
            <label>
              Nombre o marca
              <input value={perfil.nombre} onChange={(e) => cambiar('nombre', e.target.value)} placeholder="Ej. Producciones Ejemplo" />
            </label>
            <label>
              Forma jurídica
              <select value={perfil.formaJuridica} onChange={(e) => cambiar('formaJuridica', e.target.value as TPerfil['formaJuridica'])}>
                {Object.entries(NOMBRE_FORMA).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Comunidad de tu domicilio fiscal
              <select value={perfil.ccaaSede ?? ''} onChange={(e) => cambiar('ccaaSede', e.target.value || null)}>
                <option value="">Elige…</option>
                {meta.ccaa.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="grupo-ajustes" aria-labelledby="p-donde">
          <h2 id="p-donde">Dónde programas conciertos</h2>
          <p className="ayuda">Además de tu comunidad. Toca para marcar o desmarcar.</p>
          <div className="fichas-seleccion" role="group" aria-labelledby="p-donde">
            {meta.ccaa.map((c) => {
              const activa = perfil.ccaaActuacion.includes(c) || perfil.ccaaSede === c;
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={activa}
                  className={`ficha-seleccion${activa ? ' activa' : ''}`}
                  disabled={perfil.ccaaSede === c}
                  title={perfil.ccaaSede === c ? 'Tu comunidad: siempre incluida' : undefined}
                  onClick={() => cambiar('ccaaActuacion', alternar(perfil.ccaaActuacion, c))}
                >
                  {activa && (
                    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12l5 5 9-10" />
                    </svg>
                  )}
                  {c}
                </button>
              );
            })}
          </div>
        </section>

        <section className="grupo-ajustes" aria-labelledby="p-grupos">
          <h2 id="p-grupos">Tus grupos</h2>
          <p className="ayuda">
            Con tus grupos y comunidades, la portada y Clientes muestran solo lo tuyo. <a href="#/grupos">Ver lo que encaja con cada grupo →</a>
          </p>
          {perfil.grupos.length === 0 && <p className="vacio-suave">Añade al menos un grupo para recibir recomendaciones.</p>}
          <ul className="lista-grupos">
            {perfil.grupos.map((g, i) => (
              <li key={i}>
                <span className="sigla tono-azul" aria-hidden="true">
                  {ESTILO_CORTO[g.estilo] ?? '♪'}
                </span>
                <input aria-label="Nombre del grupo" placeholder="Nombre del grupo" value={g.nombre} onChange={(e) => cambiarGrupo(i, { nombre: e.target.value })} />
                <select aria-label="Estilo" value={g.estilo} onChange={(e) => cambiarGrupo(i, { estilo: e.target.value as Estilo })}>
                  {meta.estilos.map((e) => (
                    <option key={e} value={e}>
                      {NOMBRE_ESTILO[e]}
                    </option>
                  ))}
                </select>
                <input
                  aria-label="Músicos"
                  type="number"
                  min={1}
                  placeholder="Músicos"
                  value={g.componentes ?? ''}
                  onChange={(e) => cambiarGrupo(i, { componentes: e.target.value ? Number(e.target.value) : undefined })}
                />
                <button type="button" className="boton-icono" aria-label={`Quitar ${g.nombre || 'grupo'}`} title="Quitar" onClick={() => cambiar('grupos', perfil.grupos.filter((_, j) => j !== i))}>
                  ×
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="accion" onClick={() => cambiar('grupos', [...perfil.grupos, { nombre: '', estilo: 'jazz' }])}>
            + Añadir grupo
          </button>
        </section>

        {errores.length > 0 && (
          <ul className="error">
            {errores.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
        <div className="barra-guardar barra-guardar-fija">
          <span>Los cambios se aplican al guardar.</span>
          <button className="boton" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar perfil'}
          </button>
        </div>
      </form>
    </>
  );
}
