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
    expect(r.beneficiarios).toEqual({ empresas: true, sinAnimoLucro: false, entidadesLocales: false, personasFisicas: false });
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

  it('premios y concursos para personas físicas son para los músicos', () => {
    const r = c('PREMIOS DE INTERPRETACIÓN MUSICAL VICENT GALBIS (XXVI)', [
      'PERSONAS FÍSICAS QUE NO DESARROLLAN ACTIVIDAD ECONÓMICA',
    ]);
    expect(r.beneficiarios.personasFisicas).toBe(true);
    expect(r.encajePromotor).toBe('artistas');
  });

  it('sin tipos de beneficiario, deduce del texto o queda desconocido', () => {
    expect(c('Ayudas a empresas promotoras de conciertos').beneficiarios.empresas).toBe(true);
    expect(c('Ayudas a la música en vivo').encajePromotor).toBe('desconocido');
  });
});

describe('títulos reales de la BDNS', () => {
  it('clasifica bien una muestra', () => {
    expect(c('Sunset jazz club 2026').estilosExplicitos).toEqual(['jazz']);
    expect(c('SUBVENCIÓN NOMINATIVA CAPILLA DE MÚSICA BURÉS 2026').generica).toBe(true);
    expect(c('SUBVENCION NOMINATIVA 2026. JOVEN ORQUESTA CUENCA').estilosExplicitos).toEqual(['clasica']);
    expect(c('CONV. ASOC. CULTURAL TAURINA EGATAURO').musical).toBe(false);
    expect(c('CONVOCATORIA INSTRUMENTAL SUBVENCIÓN DE COOPERACIÓN INTERNACIONAL. Bolivia 2026').musical).toBe(false);
    expect(
      c('Concurso para la selección de proyectos fotográficos a exhibir en el marco de la XIII EDICIÓN DEL FESTIVAL INTERNACIONAL DE JAZZ').musical,
    ).toBe(false);
    expect(c("Conveni per a l'organització del Festival de Jazz de Figueres").estilosExplicitos).toEqual(['jazz']);
    expect(c('Ajuts a la temporada d’òpera').estilosExplicitos).toEqual(['opera']);
    expect(c('Organización Festival Nowa Reggae 2024').otrosGeneros).toEqual(['reggae']);
  });
});

describe('errores encontrados en la muestra de evaluación (títulos reales)', () => {
  it('reconoce coros, cantaires, ensembles y palabras compuestas', () => {
    expect(c('Subvención nominativa a la Coral Sant Nicasi. año 2024').estilosExplicitos).toEqual(['clasica']);
    expect(c('Convenio de promoción entre el Ayuntamiento de la Palma de Cervelló y el Grup de Cantaires la Palma').musical).toBe(true);
    expect(c('Convenio de subvención nominativa a la Asociación DeMúsica Ensemble (MOMUA), 2024').musical).toBe(true);
    expect(c('SUBVENCIÓN DIRECTA AL AYUNTAMIENTO DE VILLAFRANCA DE LOS BARROS. XVII FESTIVAL GRASTROMÚSICA.').musical).toBe(true);
  });

  it('reconoce otros géneros como música no compatible', () => {
    for (const titulo of [
      'Subvención nominativa a la ASOCIACIÓN BANDA DE CORNETAS Y TAMBORES DE LA PARROQUIA DE SAN JUAN BAUTISTA, 2023',
      'SUBVENCIÓN NOMINATIVA AGRUPACIÓ SARDANISTA DE RODA DE TER',
      'Subvención nominativa a la entidad GRUPO DE LA ESCUELA DE FOLKLORE DE ADEJE para el desarrollo del proyecto cultural 2024',
      'ASOCIACIÓN CULTURAL EXTREMASOUND SUBEROCK',
      'CONVENIO DE COLABORACIÓN ENTRE LA BANDA DE LA ESCUELA MUNICIPAL DE MÚSICA DE ASCÓ Y EL AYUNTAMIENTO DE ASCÓ',
      'XXIII CONCURSO DE COMPOSICIÓN DE MÚSICA FESTERA "VILLA DE BENIDORM" 2024 MODALIDAD: MARCHA MORA',
      'Concesión subvención de la IV edición del concurso de composición para Banda Sinfónica Arturo Balaguer',
      'SUBVENCIÓN NOMINATIVA 2024: LEIOAKO MUSIKA BANDA 97',
    ]) {
      const r = c(titulo);
      expect(r.musical, titulo).toBe(true);
      expect(r.estilosCompatibles, titulo).toEqual([]);
    }
  });

  it('un conservatorio de danza no es de música', () => {
    expect(
      c('Premios a la excelencia en la danza clásica del alumnado del conservatorio profesional de danza de la Diputación Provincial de A Coruña').musical,
    ).toBe(false);
  });
});
