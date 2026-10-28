import type { AvisoLocal } from '@/utils/avisos-locales';

export interface AvisoProgramado { identifier: string; content: { data?: Record<string, unknown> } }
export interface AdaptadorAvisos {
  listar: () => Promise<AvisoProgramado[]>;
  cancelar: (id: string) => Promise<void>;
  programar: (aviso: AvisoLocal) => Promise<void>;
  limpiarEntregados: (owner: string | null, activos: Set<string> | null) => Promise<void>;
}
export const esAvisoPropio = (aviso: AvisoProgramado) => aviso.content.data?.petcore === true && aviso.identifier.startsWith('petcore:');

/** Cola única: una respuesta antigua nunca restaura avisos tras logout o un cambio de cuenta. */
export function crearSincronizadorAvisos(adapter: AdaptadorAvisos) {
  let revision = 0;
  let cola: Promise<unknown> = Promise.resolve();
  return (owner: string | null, avisos: AvisoLocal[] | null, activosEntregados?: Set<string>, conservarPruebas = false) => {
    const solicitud = ++revision;
    const vigente = () => solicitud === revision;
    const ejecutar = async () => {
      if (!vigente()) return 0;
      const existentes = (await adapter.listar()).filter(esAvisoPropio);
      if (!vigente()) return 0;
      const deseados = new Map((avisos ?? []).map((aviso) => [aviso.identifier, aviso]));
      const conservar = new Set<string>();
      for (const aviso of existentes) {
        if (!vigente()) return 0;
        const deseado = deseados.get(aviso.identifier);
        const mismaCuenta = aviso.content.data?.owner === owner && owner !== null;
        const pruebaVigente = conservarPruebas && typeof aviso.content.data?.pruebaHasta === 'number' && aviso.content.data.pruebaHasta > Date.now();
        if (mismaCuenta && (avisos === null || pruebaVigente || (deseado !== undefined && deseado.data.firma === aviso.content.data?.firma))) conservar.add(aviso.identifier);
        else await adapter.cancelar(aviso.identifier);
      }
      for (const aviso of avisos ?? []) {
        if (!vigente()) return 0;
        if (!conservar.has(aviso.identifier) && aviso.fecha > Date.now()) {
          await adapter.programar(aviso);
          if (!vigente()) { await adapter.cancelar(aviso.identifier); return 0; }
        }
      }
      if (!vigente()) return 0;
      await adapter.limpiarEntregados(owner, avisos === null ? null : activosEntregados ?? new Set(deseados.keys()));
      return avisos === null ? conservar.size : avisos.length;
    };
    const resultado = cola.then(ejecutar, ejecutar);
    cola = resultado.catch(() => {});
    return resultado;
  };
}
