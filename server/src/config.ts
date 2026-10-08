import { fileURLToPath } from 'node:url';

const raizServidor = fileURLToPath(new URL('..', import.meta.url));
const raizRepositorio = fileURLToPath(new URL('../..', import.meta.url));

export const config = {
  puerto: Number(process.env.PORT ?? 3001),
  rutaDb: process.env.SUBV_DB ?? `${raizServidor}.data/subvencionados.db`,
  /** Carpeta con lo descargado de la BDNS (se versiona en git). */
  rutaDatosBdns: process.env.SUBV_DATOS ?? `${raizRepositorio}datos/bdns`,
  /** Lista separada por comas; por defecto se prueban los dos dominios oficiales. */
  urlsBdns: process.env.BDNS_URLS?.split(',').map((x) => x.trim()).filter(Boolean),
};
