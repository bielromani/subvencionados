import { describe, expect, it } from 'vitest';
import { detectarRespuestas, type CorreoRecibido } from '../src/crm/respuestas.js';

const desde = new Date('2026-11-01T09:00:00Z');
const activos = [
  { entidad: 'olot', destinatario: 'cultura@olot.cat', desde },
  { entidad: 'gmail', destinatario: 'festival.x@gmail.com', desde },
];
const correo = (c: Partial<CorreoRecibido>): CorreoRecibido => ({ de: 'cultura@olot.cat', asunto: 'Re: Propuesta', fecha: new Date('2026-11-04T10:00:00Z'), texto: 'Gracias, hablamos.', automatica: false, ...c });

describe('respuestas en el buzón', () => {
  it('reconoce la dirección exacta y el mismo dominio (no en correos gratuitos)', () => {
    expect(detectarRespuestas([correo({ de: 'alcaldia@olot.cat' })], activos).map((r) => [r.entidad, r.tipo])).toEqual([['olot', 'respuesta']]);
    expect(detectarRespuestas([correo({ de: 'otra.persona@gmail.com' })], activos)).toEqual([]);
    expect(detectarRespuestas([correo({ de: 'Festival.X@gmail.com' })], activos).map((r) => r.entidad)).toEqual(['gmail']);
  });
  it('no cuentan las automáticas, los rebotes ni lo anterior al primer envío', () => {
    expect(detectarRespuestas([correo({ automatica: true })], activos)).toEqual([]);
    expect(detectarRespuestas([correo({ asunto: 'Fuera de la oficina: Propuesta' })], activos)).toEqual([]);
    expect(detectarRespuestas([correo({ de: 'MAILER-DAEMON@olot.cat' })], activos)).toEqual([]);
    expect(detectarRespuestas([correo({ fecha: new Date('2026-10-20T10:00:00Z') })], activos)).toEqual([]);
  });
  it('si piden la baja, es «no contactar»', () => {
    const [r] = detectarRespuestas([correo({ texto: 'Por favor, no deseamos recibir más correos.' })], activos);
    expect(r!.tipo).toBe('optout');
    expect(detectarRespuestas([correo({ texto: 'Si us plau, doneu-nos de baixa' }), correo({ texto: 'Gracias' })], activos)[0]!.tipo).toBe('optout');
  });
});
