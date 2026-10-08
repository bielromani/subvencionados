import { describe, expect, it } from 'vitest';
import { clasificar } from '../src/clasificacion/musica.js';

const c = (texto: string, tiposBeneficiario?: string[]) => clasificar({ texto, tiposBeneficiario });

describe('detección de música', () => {
  it('reconoce títulos en mayúsculas y sin tildes, como los de la BDNS', () => {
    const r = c('AYUDAS A LA MUSICA Y A LA LIRICA 2026');
    expect(r.musical).toBe(true);
    expect(r.estilosExplicitos).toEqual(['opera']);
    // "A la música y a la lírica" cubre cualquier música, no solo la lírica.
    expect(r.generica).toBe(true);
    expect(r.estilosCompatibles).toEqual(['jazz', 'clasica', 'opera']);
  });

  it('no confunde "banda ancha" ni el "concierto económico" con música', () => {
    expect(c('Subvenciones para el despliegue de banda ancha en zonas rurales').musical).toBe(false);
    expect(c('Ayudas en el marco del concierto económico con el País Vasco').musical).toBe(false);
    expect(c('Plazas en centros con concierto educativo').musical).toBe(false);
  });

  it('distingue "ópera" del verbo "opera"', () => {
    expect(c('Ayudas a producciones de ópera').estilosExplicitos).toContain('opera');
    expect(c('Ayudas a la empresa que opera en el municipio').musical).toBe(false);
    expect(c('TEMPORADA DE OPERA DE OVIEDO').estilosExplicitos).toContain('opera');
  });
});

describe('estilos', () => {
  it('detecta jazz y clásica explícitos', () => {
    const r = c('Ciclo de conciertos de jazz y música de cámara');
    expect(r.estilosExplicitos).toEqual(['jazz', 'clasica']);
    expect(r.generica).toBe(false);
    expect(r.estilosCompatibles).toEqual(['jazz', 'clasica']);
  });

  it('una ayuda de música genérica es compatible con los tres estilos', () => {
    const r = c('Ayudas a la programación de música en vivo');
    expect(r.generica).toBe(true);
    expect(r.estilosCompatibles).toEqual(['jazz', 'clasica', 'opera']);
  });

  it('una ayuda dirigida a otros géneros no es compatible', () => {
    const r = c('Ayudas a festivales de flamenco y música tradicional');
    expect(r.musical).toBe(true);
    expect(r.otrosGeneros).toEqual(['flamenco', 'música tradicional']);
    expect(r.estilosCompatibles).toEqual([]);
  });
});

describe('líneas', () => {
  it('detecta qué actividades financia', () => {
    const r = c('Ayudas a giras de música y grabación discográfica');
    expect(r.lineas).toEqual(expect.arrayContaining(['giras', 'grabacion']));
    expect(r.lineas).not.toContain('equipamiento');
  });
});

describe('beneficiarios', () => {
  it('usa los tipos de beneficiario de la BDNS', () => {
    const r = c('Ayudas a la música', ['PYME Y PERSONAS FÍSICAS QUE DESARROLLAN ACTIVIDAD ECONÓMICA']);
    expect(r.beneficiarios).toEqual({ empresas: true, sinAnimoLucro: false, entidadesLocales: false });
    expect(r.encajePromotor).toBe('si');
  });

  it('las ayudas a ayuntamientos son oportunidad indirecta aunque figuren como personas jurídicas', () => {
    const r = c('Subvenciones a los ayuntamientos para la programación de conciertos', [
      'PERSONAS JURÍDICAS QUE NO DESARROLLAN ACTIVIDAD ECONÓMICA',
    ]);
    expect(r.beneficiarios.entidadesLocales).toBe(true);
    expect(r.beneficiarios.sinAnimoLucro).toBe(false);
    expect(r.encajePromotor).toBe('indirecto');
  });

  it('sin tipos de beneficiario, deduce del texto o queda desconocido', () => {
    expect(c('Ayudas a empresas promotoras de conciertos').beneficiarios.empresas).toBe(true);
    expect(c('Ayudas a la música en vivo').encajePromotor).toBe('desconocido');
  });
});
