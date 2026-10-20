import { describe, expect, it } from 'vitest';
import { clasificar } from '../src/clasificacion/musica.js';
import { esDeMusica } from '../src/contratos/placsp.js';
import { tituloCorto } from '../src/titulo.js';

const destino = (titulo: string) => clasificar({ texto: titulo, titulo }).destino;

describe('para quién le sirve al mánager (títulos reales)', () => {
  it('descarta lo que no sirve para colocar grupos', () => {
    for (const t of [
      'Convocatoria pública para la concesión de subvenciones a peñas y asociaciones con motivo de las Fiestas Patronales de San Roque 2026',
      'Convocatoria que rige la concesión de subvenciones a las asociaciones culturales de Mislata, para contribuir a la financiación del funcionamiento de sus sedes sociales',
      'BASES REGULADORAS DE LA CONVOCATORIA PÚBLICA DE SUBVENCIONES PARA ACTIVIDADES CULTURALES PROMOVIDAS POR LAS ASOCIACIONES DE BAZTAN PARA EL AÑO 2026',
      'Convocatoria de subvenciones al sector cultural para el servicio de acompañamiento y asesoramiento en la gestión de casos de violencias machistas',
      'PREMIO MEJOR EXPEDIENTE ACADÉMICO CURSO 2025-2026 CONSERVATORIO MUNICIPAL JOSÉ ITURBI',
      'BASES REGULADORAS Y CONVOCATORIA ANTICIPADA DE SUBVENCIONES PARA LA PROMOCIÓN Y FOMENTO DE LA ACTIVIDAD CULTURAL DE LAS BANDAS DE MÚSICA',
      'Vigésimo tercer concurso de música festera "Francesc Cerdà". Modalidad Marcha Mora.',
      'Convocatoria del II Concurso de cante flamenco El Coronil 2025',
    ]) {
      expect(destino(t), t).toBeNull();
    }
  });

  it('lo que pueden pedir los grupos', () => {
    expect(destino('Ayudas 2026 a las agrupaciones profesionales de teatro, música y danza de Extremadura para la realización de actuaciones o giras fuera de la Comunidad')).toBe('grupos');
    expect(destino('Resolución de 25 de mayo de 2026. Línea 3a) Ayudas para proyectos de gira y asistencia a festivales de música')).toBe('grupos');
    expect(destino('XIV CONCURSO INTERNACIONAL DE MÚSICA DE CÁMARA ANTÓN GARCÍA ABRIL 2026')).toBe('grupos');
  });

  it('el dinero de quien contrata', () => {
    expect(destino('Convocatoria de subvenciones en especie para la contratación de espectáculos profesionales incluidos en el catálogo de espectáculos Programa.cat')).toBe('programadores');
    expect(destino('SUBVENCIONES A ENTIDADES ORGANIZADORAS DE FESTIVALES MUSICALES PARA EL AÑO 2026')).toBe('programadores');
    expect(destino('Subvenciones a los ayuntamientos de la comarca para la realización de actividades culturales 2026')).toBe('programadores');
  });
});

describe('contratos que no son conciertos', () => {
  it('fuera talleres, gestión de centros y premios escolares', () => {
    for (const titulo of [
      'Servio del Taller de Música en Casares-Pueblo.',
      'Contracte és la gestió de centres de creació amb especialitat de Música per al Teatre Principal de Palma (FTPP)',
      'premios buenas prácticas bilingües, flamenco y bibliotecas escolares 25/26',
    ]) {
      expect(esDeMusica({ titulo, cpv: ['92312100'] }), titulo).toBe(false);
    }
  });
});

describe('títulos legibles', () => {
  it('sin la fórmula administrativa ni mayúsculas continuas', () => {
    expect(tituloCorto('Resolución por la que se abre la convocatoria 2026 para la concesión de subvenciones para la movilidad de artistas')).toBe(
      'Subvenciones para la movilidad de artistas',
    );
    expect(tituloCorto('CONVOCATORIA DE SUBVENCIONES PARA LA REALIZACIÓN DE FESTIVALES 2026')).toBe('Subvenciones para la realización de festivales 2026');
    expect(tituloCorto('XIV CONCURSO INTERNACIONAL DE MÚSICA DE CÁMARA 2026')).toBe('XIV concurso internacional de música de cámara 2026');
  });
});

describe('orquestas de verbena', () => {
  it('una orquesta de fiestas no es música clásica', () => {
    const c = clasificar({ texto: 'Orquesta La Huella para el 28 de junio de 2026, con motivo de las Ferias y Fiestas de San Pedro' });
    expect(c.estilosExplicitos).not.toContain('clasica');
    expect(clasificar({ texto: 'Concierto de la Orquesta Sinfónica en el auditorio' }).estilosExplicitos).toContain('clasica');
  });
});
