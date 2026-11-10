import { useEffect, useState } from 'react';

/** Gmail y Outlook admiten unos 500 destinatarios por correo: se copian por tandas. */
const TANDA = 400;

/** Cuántos clientes del filtro tienen email y botones para copiarlos (para pegarlos en copia oculta). */
export function CopiarEmails({ consulta, cargar }: { consulta: string; cargar: (q: string) => Promise<{ emails: string[]; deCultura: number }> }) {
  const [d, setD] = useState<{ emails: string[]; deCultura: number } | null>(null);
  const [copiado, setCopiado] = useState<number | null>(null);
  useEffect(() => {
    setD(null);
    setCopiado(null);
    const q = new URLSearchParams(consulta);
    q.delete('pagina');
    q.delete('orden');
    const t = setTimeout(() => cargar(q.toString()).then(setD, () => setD(null)), 250);
    return () => clearTimeout(t);
  }, [consulta]);
  if (!d) return null;
  const tandas = Array.from({ length: Math.ceil(d.emails.length / TANDA) }, (_, i) => d.emails.slice(i * TANDA, (i + 1) * TANDA));
  const copiar = async (i: number) => {
    const texto = tandas[i]!.join(', ');
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      window.prompt('Copia los emails:', texto);
    }
    setCopiado(i);
  };
  return (
    <div className="copiar-emails" role="status">
      <span>
        <strong>{d.emails.length.toLocaleString('es-ES')}</strong> con email
        {d.emails.length > 0 && ` (${d.deCultura.toLocaleString('es-ES')} de cultura; el resto, el general del ayuntamiento)`}
      </span>
      {tandas.map((t, i) => (
        <button key={i} type="button" className="accion" onClick={() => void copiar(i)}>
          {copiado === i ? '✓ Copiados' : tandas.length === 1 ? `Copiar los ${t.length} emails` : `Copiar ${i * TANDA + 1}–${i * TANDA + t.length}`}
        </button>
      ))}
      {d.emails.length > 0 && <span className="ayuda">Pégalos en «CCO» (copia oculta), no en «Para».{tandas.length > 1 ? ' Un correo por tanda: más de 500 destinatarios no se admiten.' : ''}</span>}
    </div>
  );
}
