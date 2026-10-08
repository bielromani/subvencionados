import { useEffect, useState } from 'react';
import { api, ErrorApi } from '../api';
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

  return (
    <form className="perfil" onSubmit={guardar}>
      <fieldset>
        <legend>Tu actividad</legend>
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
      </fieldset>

      <fieldset>
        <legend>Dónde programas conciertos (además de tu comunidad)</legend>
        <div className="rejilla-casillas">
          {meta.ccaa.map((c) => (
            <label key={c} className="casilla">
              <input
                type="checkbox"
                checked={perfil.ccaaActuacion.includes(c)}
                onChange={() => cambiar('ccaaActuacion', alternar(perfil.ccaaActuacion, c))}
              />
              {c}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Tus grupos</legend>
        {perfil.grupos.length === 0 && <p className="ayuda">Añade al menos un grupo para recibir recomendaciones.</p>}
        {perfil.grupos.map((g, i) => (
          <div key={i} className="fila-grupo">
            <input aria-label="Nombre del grupo" placeholder="Nombre del grupo" value={g.nombre} onChange={(e) => cambiarGrupo(i, { nombre: e.target.value })} />
            <select aria-label="Estilo" value={g.estilo} onChange={(e) => cambiarGrupo(i, { estilo: e.target.value as Estilo })}>
              {meta.estilos.map((e) => (
                <option key={e} value={e}>
                  {NOMBRE_ESTILO[e]}
                </option>
              ))}
            </select>
            <input
              aria-label="Componentes"
              type="number"
              min={1}
              placeholder="Músicos"
              value={g.componentes ?? ''}
              onChange={(e) => cambiarGrupo(i, { componentes: e.target.value ? Number(e.target.value) : undefined })}
            />
            <button type="button" className="boton-secundario" onClick={() => cambiar('grupos', perfil.grupos.filter((_, j) => j !== i))}>
              Quitar
            </button>
          </div>
        ))}
        <button type="button" className="boton-secundario" onClick={() => cambiar('grupos', [...perfil.grupos, { nombre: '', estilo: 'jazz' }])}>
          + Añadir grupo
        </button>
      </fieldset>

      <fieldset>
        <legend>Qué necesitas financiar</legend>
        <div className="rejilla-casillas">
          {meta.lineas.map((l) => (
            <label key={l} className="casilla">
              <input type="checkbox" checked={perfil.actividades.includes(l)} onChange={() => cambiar('actividades', alternar(perfil.actividades, l))} />
              {NOMBRE_LINEA[l]}
            </label>
          ))}
        </div>
        <label className="casilla">
          <input type="checkbox" checked={perfil.incluirIndirectas} onChange={(e) => cambiar('incluirIndirectas', e.target.checked)} />
          Mostrar también ayudas para ayuntamientos (clientes potenciales)
        </label>
      </fieldset>

      {errores.length > 0 && (
        <ul className="error">
          {errores.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      <button className="boton-principal" disabled={guardando}>
        {guardando ? 'Guardando…' : 'Guardar y ver recomendaciones'}
      </button>
    </form>
  );
}
