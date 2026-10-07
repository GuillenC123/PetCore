// ============================================================================
// AuthContext.tsx - Estado global de autenticación de MascotaCare
// ----------------------------------------------------------------------------
// Provee a toda la app el estado de sesión del usuario:
//   * usuario   -> datos del usuario logueado (o datos simulados).
//   * token     -> JWT para las llamadas autenticadas al servidor.
//   * login()   -> inicia sesión; si la API no responde, usa el modo demo.
//   * registro() -> registra una cuenta nueva.
//   * logout()  -> cierra la sesión.
//   * conectado -> indica si estamos funcionando con el servidor real o con
//                  los datos simulados (útil para mostrarlo en la interfaz).
//
// Además expone los datos de la app (mascotas, citas, recordatorios) y un
// método para cargarlos, delegando en la API cuando hay token y en los datos
// simulados únicamente en una sesión demo; los fallos de consulta permiten reintentar.
// ============================================================================

import * as React from 'react';
import { useCargaDatos } from '@/hooks/use-carga-datos';
import { esIdentificadorRemoto } from '@/utils/identificadores';
import { validarObservacion } from '@/utils/historial';
import { validarCarnet } from '@/utils/carnet';
import { interpretarFechaVisita } from '@/utils/citas';
import { aplicarRegistroPeso, crearRegistroPeso, fechaPesoHoy } from '@/utils/peso';
import { crearTratamiento, registrarToma, type NuevoTratamiento } from '@/utils/tratamientos';
import { validarFichaSalud, type DatosFichaSalud } from '@/utils/salud';
import { completarRecordatorio, fechaRecordatorio } from '@/utils/recordatorios';

import { MOCK_EMAIL, MOCK_PASSWORD, mockData } from '@/data/mockData';
import {
  esErrorDeRed,
  apiLogin,
  apiRegistro,
  apiTacharRecordatorio,
} from '@/services/api';
import type {
  AuthResponse,
  DatosApp,
  EstadoCargaDatos,
  Identificador,
  ObservacionSalud,
  AdjuntoSalud,
  RegistroCarnet,
  Tratamiento,
  EstadoToma,
  Cita,
  Mascota,
  Recordatorio,
  Usuario,
} from '@/types';

// ---------------------------------------------------------------------------
// Utilidades locales: detección de errores de red y mensajes profesionales.
// ---------------------------------------------------------------------------

/**
 * Mensaje profesional y seguro cuando el servidor no está disponible. NO revela
 * credenciales ni detalles internos por seguridad.
 */
function mensajeServidorNoDisponible(): string {
  return 'No se pudo conectar con el servidor. Asegúrate de haber iniciado la API local (server) e inténtalo de nuevo.';
}

// ---------------------------------------------------------------------------
// Forma del contexto (lo que consumen los hooks y las pantallas).
// ---------------------------------------------------------------------------

interface AuthContextValue {
  completarCita: (id: Identificador) => void;
  agregarObservacion: (mascotaId: Identificador, datos: Omit<ObservacionSalud, 'id'>) => void;
  adjuntarHistorial: (mascotaId: Identificador, clave: string, adjuntos: AdjuntoSalud[]) => void;
  guardarCarnet: (mascotaId: Identificador, datos: Omit<RegistroCarnet, 'id'>, id?: number) => void;
  tratamientos: Tratamiento[];
  agregarTratamiento: (datos: NuevoTratamiento) => void;
  marcarToma: (tratamientoId: number, fecha: string, estado: EstadoToma) => void;
  usuario: Usuario | null;
  token: string | null;
  conectado: boolean;
  modoDemo: boolean;
  estadoDatos: EstadoCargaDatos;
  mascotas: Mascota[];
  citas: Cita[];
  recordatorios: Recordatorio[];

  login: (correo: string, password: string) => Promise<void>;
  registro: (nombre: string, correo: string, password: string) => Promise<void>;
  logout: () => void;
  cargarDatos: () => Promise<void>;
  tacharRecordatorio: (id: Identificador, completado: boolean) => Promise<void>;
  guardarRecordatorio: (datos: Omit<Recordatorio, 'id' | 'completado'>, id?: Identificador) => void;
  posponerRecordatorio: (id: Identificador, fecha: string) => void;
  /** Añade una mascota al estado local (aporta el id automáticamente). */
  agregarMascota: (datos: Omit<Mascota, 'id'>) => Mascota;
  agregarCita: (datos: { mascota_id: Identificador; motivo: string; fecha_hora: string }) => void;
  actualizarPesoMascota: (id: Identificador, peso: number | null) => void;
  registrarPeso: (id: Identificador, peso: number, fecha: string) => void;
  actualizarFichaSalud: (id: Identificador, datos: DatosFichaSalud) => void;
  /** Actualiza el perfil en memoria durante la sesión, sin llamar a la API. */
  actualizarPerfil: (datos: Pick<Usuario, 'nombre' | 'correo'>) => void;
}

// Valor inicial por defecto del contexto (para TypeScript).
const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

// ============================================================================
// Proveedor del contexto. Envuelve la raíz de la aplicación.
// ============================================================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = React.useState<Usuario | null>(null);
  const [token, setToken] = React.useState<string | null>(null);
  const [conectado, setConectado] = React.useState<boolean>(false);

  // Datos de la app (vacíos hasta que se carguen).
  const [mascotas, setMascotas] = React.useState<Mascota[]>([]);
  const [citas, setCitas] = React.useState<Cita[]>([]);
  const [recordatorios, setRecordatorios] = React.useState<Recordatorio[]>([]);
  const [tratamientos, setTratamientos] = React.useState<Tratamiento[]>([]);

  const aplicarDatos = React.useCallback((datos: DatosApp) => {
    setMascotas(datos.mascotas);
    setCitas(datos.citas);
    setRecordatorios(datos.recordatorios);
  }, []);
  const { estadoDatos, cargarDatos, iniciarCarga, reiniciarCarga } = useCargaDatos(aplicarDatos);
  const siguienteTratamiento = React.useRef(1);
  const agregarTratamiento = React.useCallback((datos: NuevoTratamiento) => {
    if (!mascotas.some((m) => m.id === datos.mascota_id)) throw new Error('Selecciona una mascota registrada.');
    const tratamiento = crearTratamiento(datos, siguienteTratamiento.current);
    siguienteTratamiento.current++;
    setTratamientos((prev) => [...prev, tratamiento]);
  }, [mascotas]);
  const marcarToma = React.useCallback((id: number, fecha: string, estado: EstadoToma) => {
    const tratamiento = tratamientos.find((t) => t.id === id);
    if (!tratamiento) throw new Error('Tratamiento no encontrado.');
    const ahora = Date.now();
    registrarToma(tratamiento, fecha, estado, ahora);
    setTratamientos((prev) => prev.map((t) => t.id === id ? registrarToma(t, fecha, estado, ahora) : t));
  }, [tratamientos]);

  // IDs negativos para que las mascotas locales no colisionen con PostgreSQL.
  const proximoId = React.useRef(-1);
  const proximaVisitaId = React.useRef(-1);
  const siguienteObservacion = React.useRef(1);
  const agregarObservacion = React.useCallback((mascotaId: Identificador, datos: Omit<ObservacionSalud, 'id'>) => {
    validarObservacion(datos);
    if (!mascotas.some((m) => m.id === mascotaId)) throw new Error('Mascota no encontrada.');
    const observacion = { ...datos, titulo: datos.titulo.trim(), descripcion: datos.descripcion.trim(), id: siguienteObservacion.current++ };
    setMascotas((prev) => prev.map((m) => m.id === mascotaId ? { ...m, observaciones: [...(m.observaciones ?? []), observacion] } : m));
  }, [mascotas]);
  const adjuntarHistorial = React.useCallback((mascotaId: Identificador, clave: string, adjuntos: AdjuntoSalud[]) => {
    setMascotas((prev) => prev.map((m) => m.id === mascotaId ? { ...m, adjuntos_historial: {
      ...m.adjuntos_historial, [clave]: [...(m.adjuntos_historial?.[clave] ?? []), ...adjuntos],
    } } : m));
  }, []);
  const completarCita = React.useCallback((id: Identificador) => {
    const cita = citas.find((c) => c.id === id);
    if (!cita || cita.estado === 'cancelado' || Date.parse(cita.fecha_hora) > Date.now()) throw new Error('La visita aún no puede marcarse como realizada.');
    setCitas((prev) => prev.map((c) => c.id === id ? { ...c, estado: 'completado' } : c));
    setRecordatorios((prev) => prev.map((r) => r.cita_id === id ? { ...r, completado: true } : r));
  }, [citas]);
  const siguienteCarnet = React.useRef(1);
  const guardarCarnet = React.useCallback((mascotaId: Identificador, datos: Omit<RegistroCarnet, 'id'>, id?: number) => {
    const error = validarCarnet(datos);
    if (error) throw new Error(error);
    const mascota = mascotas.find((m) => m.id === mascotaId);
    if (!mascota) throw new Error('Mascota no encontrada.');
    if (id !== undefined && !mascota.carnet?.some((r) => r.id === id)) throw new Error('Registro no encontrado.');
    if (datos.anterior_id !== undefined && !mascota.carnet?.some((r) => r.id === datos.anterior_id)) throw new Error('Aplicación anterior no encontrada.');
    if (datos.anterior_id !== undefined) {
      const anterior = mascota.carnet!.find((r) => r.id === datos.anterior_id)!;
      if (!datos.fecha_aplicacion || !anterior.fecha_aplicacion || datos.anterior_id === id ||
          interpretarFechaVisita(datos.fecha_aplicacion, '00:00')! <= interpretarFechaVisita(anterior.fecha_aplicacion, '00:00')!) {
        throw new Error('La nueva aplicación debe ser posterior a la anterior.');
      }
      if (mascota.carnet!.some((r) => r.id !== id && r.anterior_id === datos.anterior_id)) throw new Error('La siguiente aplicación ya está registrada.');
    }
    const siguiente = mascota.carnet?.find((r) => id !== undefined && r.anterior_id === id);
    if (siguiente && (!datos.fecha_aplicacion || interpretarFechaVisita(datos.fecha_aplicacion, '00:00')! >= interpretarFechaVisita(siguiente.fecha_aplicacion!, '00:00')!)) {
      throw new Error('Conserva una fecha anterior a la siguiente aplicación registrada.');
    }
    const registro = { ...datos, nombre: datos.nombre.trim(), id: id ?? siguienteCarnet.current++ };
    setMascotas((prev) => prev.map((m) => m.id === mascotaId ? { ...m, carnet: id === undefined
      ? [...(m.carnet ?? []), registro] : (m.carnet ?? []).map((r) => r.id === id ? registro : r) } : m));
  }, [mascotas]);
  const registrarPeso = React.useCallback((id: Identificador, peso: number, fecha: string) => {
    if (!mascotas.some((m) => m.id === id)) throw new Error('Mascota no encontrada.');
    const registro = crearRegistroPeso(peso, fecha);
    setMascotas((prev) => prev.map((m) => m.id === id ? aplicarRegistroPeso(m, registro) : m));
  }, [mascotas]);
  const actualizarFichaSalud = React.useCallback((id: Identificador, datos: DatosFichaSalud) => {
    const error = validarFichaSalud(datos);
    if (error) throw new Error(error);
    if (!mascotas.some((m) => m.id === id)) throw new Error('Mascota no encontrada.');
    setMascotas((prev) => prev.map((m) => m.id === id ? { ...m, ...datos,
      edad: datos.edad.trim(), alergias: datos.alergias.trim(), condiciones: datos.condiciones.trim(),
    } : m));
  }, [mascotas]);
  const recordatoriosLocales = React.useRef(new Set<Identificador>());
  const guardandoRecordatorios = React.useRef(new Set<Identificador>());
  const versionSesion = React.useRef(0);
  const autenticacionActual = React.useRef<AbortController | null>(null);

  React.useEffect(() => () => {
    versionSesion.current++;
    autenticacionActual.current?.abort();
  }, []);

  const guardarRecordatorio = React.useCallback((datos: Omit<Recordatorio, 'id' | 'completado'>, id?: Identificador) => {
    if (!datos.titulo.trim() || datos.titulo.trim().length > 120) throw new Error('Escribe un título de hasta 120 caracteres.');
    const fecha = fechaRecordatorio(datos.vence_en);
    if (!fecha || fecha.getTime() <= Date.now()) throw new Error('Elige una fecha y hora futuras.');
    const mascota = mascotas.find((m) => m.id === datos.mascota_id);
    if (datos.mascota_id !== null && !mascota) throw new Error('Selecciona una mascota registrada.');
    const clave = id ?? proximaVisitaId.current--;
    const cambios = { ...datos, titulo: datos.titulo.trim(), mascota_nombre: mascota?.nombre, vence_en: fecha.toISOString(), dia_repeticion: fecha.getDate() };
    recordatoriosLocales.current.add(clave);
    setRecordatorios((prev) => id === undefined
      ? [...prev, { ...cambios, id: clave, completado: false }]
      : prev.map((r) => r.id === id ? { ...r, ...cambios } : r));
  }, [mascotas]);

  const posponerRecordatorio = React.useCallback((id: Identificador, fecha: string) => {
    const nuevaFecha = fechaRecordatorio(fecha);
    if (!nuevaFecha || nuevaFecha.getTime() <= Date.now()) throw new Error('Elige una fecha y hora futuras.');
    recordatoriosLocales.current.add(id);
    setRecordatorios((prev) => prev.map((r) => r.id === id && !r.completado ? { ...r, vence_en: nuevaFecha.toISOString(), dia_repeticion: nuevaFecha.getDate() } : r));
  }, []);

  // Las visitas creadas en este avance se conservan durante la sesión.
  const agregarCita = React.useCallback((datos: { mascota_id: Identificador; motivo: string; fecha_hora: string }) => {
    const mascota = mascotas.find((m) => m.id === datos.mascota_id);
    if (!mascota) throw new Error('Selecciona una mascota registrada.');
    const fecha = new Date(datos.fecha_hora);
    const motivo = datos.motivo.trim();
    if (!motivo || motivo.length > 1000) throw new Error('Escribe un motivo de hasta 1000 caracteres.');
    if (!Number.isFinite(fecha.getTime()) || fecha.getTime() <= Date.now()) {
      throw new Error('Selecciona una fecha y hora futuras.');
    }
    const id = proximaVisitaId.current--;
    setMascotas((prev) => prev.map((m) => m.id === mascota.id ? { ...m, estado: 'malestar', estado_salud: 'malestar',
      cuidados_registrados: m.estado === 'en_tratamiento' || m.estado === 'vacuna_pendiente'
        ? [...new Set([...(m.cuidados_registrados ?? []), m.estado])] : m.cuidados_registrados,
    } : m));
    setCitas((prev) => [...prev, {
      id, mascota_id: mascota.id, mascota_nombre: mascota.nombre,
      titulo: motivo, fecha_hora: fecha.toISOString(),
      doctor: null, clinica: null, estado: 'programado',
    }]);
    setRecordatorios((prev) => [...prev, {
      id, mascota_id: mascota.id, mascota_nombre: mascota.nombre,
      titulo: 'Visita veterinaria', descripcion: motivo, tipo: 'cita',
      cita_id: id,
      vence_en: fecha.toISOString(), completado: false,
    }]);
  }, [mascotas]);

  const actualizarPesoMascota = React.useCallback((id: Identificador, peso: number | null) => {
    if (peso !== null && (!Number.isFinite(peso) || peso <= 0)) {
      throw new Error('El peso debe ser mayor que cero.');
    }
    const registro = peso !== null ? crearRegistroPeso(peso, fechaPesoHoy()) : null;
    setMascotas((prev) => prev.map((m) => m.id === id ? registro ? aplicarRegistroPeso(m, registro) : { ...m, peso: m.registros_peso?.length ? m.peso : null } : m));
  }, []);

  const actualizarPerfil = React.useCallback((datos: Pick<Usuario, 'nombre' | 'correo'>) => {
    setUsuario((actual) => actual ? {
      ...actual,
      nombre: datos.nombre.normalize('NFC').trim(),
      correo: datos.correo.trim().toLowerCase(),
    } : actual);
  }, []);

  /**
   * Añade una mascota al estado local de la app. La nueva mascota recibe un id
   * autoincrementado y se inserta al inicio de la lista. En el Avance 1 (sin
   * persistencia) el registro sólo vive en memoria; en un avance posterior se
   * sincronizará con la API.
   */
  const agregarMascota = React.useCallback((datos: Omit<Mascota, 'id'>): Mascota => {
    const base: Mascota = { ...datos, id: proximoId.current-- };
    const nueva = datos.peso != null ? aplicarRegistroPeso(base, crearRegistroPeso(datos.peso, fechaPesoHoy())) : base;
    setMascotas((prev) => [nueva, ...prev]);
    return nueva;
  }, []);

  /** La autenticación habilita la sesión; la consulta tiene sus propios estados. */
  const aplicarSesion = React.useCallback((respuesta: AuthResponse, datosDemo?: DatosApp) => {
    setUsuario(respuesta.usuario);
    setToken(respuesta.token);
    setConectado(!datosDemo);
    setMascotas([]);
    setCitas([]);
    setRecordatorios([]);
    setTratamientos([]);
    recordatoriosLocales.current.clear();
    guardandoRecordatorios.current.clear();
    void iniciarCarga(respuesta.token, datosDemo);
  }, [iniciarCarga]);

  const autenticar = React.useCallback(async (
    solicitar: (signal: AbortSignal) => Promise<AuthResponse>,
    permitirDemo = false,
  ) => {
    const version = ++versionSesion.current;
    autenticacionActual.current?.abort();
    const controller = new AbortController();
    autenticacionActual.current = controller;

    try {
      const respuesta = await solicitar(controller.signal);
      if (version !== versionSesion.current || controller.signal.aborted) return;
      aplicarSesion(respuesta);
    } catch (error) {
      if (version !== versionSesion.current || controller.signal.aborted) return;
      if (esErrorDeRed(error)) {
        if (permitirDemo) {
          aplicarSesion({ usuario: mockData.usuario, token: 'token-demo' }, mockData);
          return;
        }
        throw new Error(mensajeServidorNoDisponible());
      }
      throw error;
    } finally {
      if (version === versionSesion.current) autenticacionActual.current = null;
    }
  }, [aplicarSesion]);

  const login = React.useCallback((correo: string, password: string) =>
    autenticar((signal) => apiLogin(correo, password, signal),
      correo.trim().toLowerCase() === MOCK_EMAIL && password === MOCK_PASSWORD),
  [autenticar]);

  const registro = React.useCallback((nombre: string, correo: string, password: string) =>
    autenticar((signal) => apiRegistro(nombre, correo, password, signal)),
  [autenticar]);

  // -------------------------------------------------------------------------
  // TACHAR recordatorio (checkbox) - sincroniza con la API o con estado local.
  // -------------------------------------------------------------------------
  const tacharRecordatorio = React.useCallback(
    async (id: Identificador, completado: boolean) => {
      if (guardandoRecordatorios.current.has(id)) throw new Error('Este recordatorio se está guardando.');
      guardandoRecordatorios.current.add(id);
      const sesion = versionSesion.current;
      try {
        if (token && conectado && esIdentificadorRemoto(id) && !recordatoriosLocales.current.has(id)) {
          await apiTacharRecordatorio(token, id, completado);
        }
        if (sesion !== versionSesion.current) return;
        const ahora = Date.now();
        setRecordatorios((prev) => prev.map((r) => r.id === id ? completarRecordatorio(r, completado, ahora) : r));
      } catch {
        throw new Error('No se pudo guardar el recordatorio. Conservamos su estado anterior. Vuelve a intentarlo.');
      } finally {
        if (sesion === versionSesion.current) guardandoRecordatorios.current.delete(id);
      }
    },
    [token, conectado]
  );

  // Cierra la sesión y limpia todos los datos de la app.
  const logout = React.useCallback(() => {
    versionSesion.current++;
    autenticacionActual.current?.abort();
    autenticacionActual.current = null;
    reiniciarCarga();
    guardandoRecordatorios.current.clear();
    setTratamientos([]);
    setUsuario(null);
    setToken(null);
    setConectado(false);
    setMascotas([]);
    setCitas([]);
    setRecordatorios([]);
    recordatoriosLocales.current.clear();
  }, [reiniciarCarga]);

  // ==========================================================================
  // Valor expuesto por el contexto.
  // ==========================================================================
  const value: AuthContextValue = {
    completarCita,
    agregarObservacion,
    adjuntarHistorial,
    guardarCarnet,
    tratamientos,
    agregarTratamiento,
    marcarToma,
    usuario,
    token,
    conectado,
    modoDemo: token === 'token-demo',
    estadoDatos,
    mascotas,
    citas,
    recordatorios,
    login,
    registro,
    logout,
    cargarDatos,
    tacharRecordatorio,
    guardarRecordatorio,
    posponerRecordatorio,
    agregarMascota,
    agregarCita,
    actualizarPesoMascota,
    registrarPeso,
    actualizarFichaSalud,
    actualizarPerfil,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================================================
// Hook para consumir el contexto desde cualquier componente.
// ============================================================================

export function useAuth(): AuthContextValue {
  const contexto = React.useContext(AuthContext);
  if (!contexto) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  }
  return contexto;
}
