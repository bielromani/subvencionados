// Códigos NUTS de España. La BDNS expresa el ámbito de cada convocatoria con
// descripciones del tipo "ES511 - Barcelona", así que derivamos CCAA y provincia
// del prefijo del código en lugar de depender del texto.

export const CCAA_POR_NUTS2: Record<string, string> = {
  ES11: 'Galicia',
  ES12: 'Principado de Asturias',
  ES13: 'Cantabria',
  ES21: 'País Vasco',
  ES22: 'Comunidad Foral de Navarra',
  ES23: 'La Rioja',
  ES24: 'Aragón',
  ES30: 'Comunidad de Madrid',
  ES41: 'Castilla y León',
  ES42: 'Castilla-La Mancha',
  ES43: 'Extremadura',
  ES51: 'Cataluña',
  ES52: 'Comunitat Valenciana',
  ES53: 'Illes Balears',
  ES61: 'Andalucía',
  ES62: 'Región de Murcia',
  ES63: 'Ceuta',
  ES64: 'Melilla',
  ES70: 'Canarias',
};

export const CCAA = Object.values(CCAA_POR_NUTS2);

export const PROVINCIA_POR_NUTS3: Record<string, string> = {
  ES111: 'A Coruña', ES112: 'Lugo', ES113: 'Ourense', ES114: 'Pontevedra',
  ES120: 'Asturias', ES130: 'Cantabria',
  ES211: 'Araba/Álava', ES212: 'Gipuzkoa', ES213: 'Bizkaia',
  ES220: 'Navarra', ES230: 'La Rioja',
  ES241: 'Huesca', ES242: 'Teruel', ES243: 'Zaragoza',
  ES300: 'Madrid',
  ES411: 'Ávila', ES412: 'Burgos', ES413: 'León', ES414: 'Palencia', ES415: 'Salamanca',
  ES416: 'Segovia', ES417: 'Soria', ES418: 'Valladolid', ES419: 'Zamora',
  ES421: 'Albacete', ES422: 'Ciudad Real', ES423: 'Cuenca', ES424: 'Guadalajara', ES425: 'Toledo',
  ES431: 'Badajoz', ES432: 'Cáceres',
  ES511: 'Barcelona', ES512: 'Girona', ES513: 'Lleida', ES514: 'Tarragona',
  ES521: 'Alicante/Alacant', ES522: 'Castellón/Castelló', ES523: 'Valencia/València',
  ES531: 'Eivissa y Formentera', ES532: 'Mallorca', ES533: 'Menorca',
  ES611: 'Almería', ES612: 'Cádiz', ES613: 'Córdoba', ES614: 'Granada', ES615: 'Huelva',
  ES616: 'Jaén', ES617: 'Málaga', ES618: 'Sevilla',
  ES620: 'Murcia', ES630: 'Ceuta', ES640: 'Melilla',
  ES703: 'El Hierro', ES704: 'Fuerteventura', ES705: 'Gran Canaria', ES706: 'La Gomera',
  ES707: 'La Palma', ES708: 'Lanzarote', ES709: 'Tenerife',
};

export interface AmbitoTerritorial {
  /** Todo el territorio nacional (o sin restricción territorial). */
  nacional: boolean;
  ccaa: string[];
  provincias: string[];
}

/** Interpreta las descripciones de región de la BDNS ("ES511 - Barcelona", "ES - ESPAÑA"...). */
export function ambitoDesdeRegiones(regiones: string[]): AmbitoTerritorial {
  const ccaa = new Set<string>();
  const provincias = new Set<string>();
  let nacional = regiones.length === 0;

  for (const region of regiones) {
    const codigo = /^\s*(ES\d*)/i.exec(region)?.[1]?.toUpperCase();
    if (!codigo || codigo === 'ES') {
      // Sin código reconocible o ámbito "ES - ESPAÑA": no restringe el territorio.
      nacional = true;
      continue;
    }
    if (codigo.length === 3) {
      // NUTS1 (p. ej. "ES5 - ESTE"): agrupa varias comunidades.
      for (const [nuts2, comunidad] of Object.entries(CCAA_POR_NUTS2)) {
        if (nuts2.startsWith(codigo)) ccaa.add(comunidad);
      }
      continue;
    }
    const comunidad = CCAA_POR_NUTS2[codigo.slice(0, 4)];
    if (comunidad) ccaa.add(comunidad);
    const provincia = PROVINCIA_POR_NUTS3[codigo.slice(0, 5)];
    if (codigo.length >= 5 && provincia) provincias.add(provincia);
  }

  return { nacional, ccaa: [...ccaa], provincias: [...provincias] };
}
