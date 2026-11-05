import { useState } from 'react';

/**
 * Copiar el correo por partes, para pegarlo en Gmail, Outlook web o donde sea. «Abrir en mi correo» depende del
 * programa de correo del ordenador, y algunos (Outlook de escritorio) cortan o no abren los correos largos.
 */
export function CopiarCorreo({ para, asunto, cuerpo }: { para: string; asunto: string; cuerpo: string }) {
  const [copiado, setCopiado] = useState<string | null>(null);
  const copiar = (que: string, texto: string) =>
    void navigator.clipboard?.writeText(texto).then(
      () => {
        setCopiado(que);
        setTimeout(() => setCopiado(null), 2000);
      },
      () => window.prompt('Copia este texto:', texto),
    );
  const boton = (que: string, etiqueta: string, texto: string) => (
    <button type="button" className="accion accion-pequena" onClick={() => copiar(que, texto)}>
      {copiado === que ? '✓ Copiado' : etiqueta}
    </button>
  );
  return (
    <div className="copiar-correo">
      <span>¿No se abre tu correo o sale cortado? Cópialo y pégalo:</span>
      <span className="botones-fila">
        {boton('para', 'Copiar dirección', para)}
        {boton('asunto', 'Copiar asunto', asunto)}
        {boton('cuerpo', 'Copiar texto', cuerpo)}
      </span>
    </div>
  );
}

/** «Ya lo he enviado» registra el envío; la web no envía nada. Se pregunta para que nadie lo pulse antes de enviarlo. */
export const confirmarEnviado = () =>
  window.confirm('¿Ya ha salido este correo desde tu programa de correo (Gmail, Outlook…)?\n\nEsta web no envía correos: solo prepara el texto. Pulsa «Aceptar» cuando lo hayas enviado tú; desde ese momento cuentan los días para el seguimiento.');
