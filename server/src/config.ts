import { fileURLToPath } from 'node:url';

const raizServidor = fileURLToPath(new URL('..', import.meta.url));
const raizRepositorio = fileURLToPath(new URL('../..', import.meta.url));

export const config = {
  puerto: Number(process.env.PORT ?? 3001),
  rutaDb: process.env.SUBV_DB ?? `${raizServidor}.data/subvencionados.db`,
  /** Carpeta de datos versionados en git (bdns/, referencia/...). */
  rutaDatos: process.env.SUBV_DATOS ?? `${raizRepositorio}datos`,
  get rutaDatosBdns() {
    return `${this.rutaDatos}/bdns`;
  },
  /** Lista separada por comas; por defecto se prueban los dos dominios oficiales. */
  urlsBdns: process.env.BDNS_URLS?.split(',').map((x) => x.trim()).filter(Boolean),
};
