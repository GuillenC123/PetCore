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
// simulados cuando el servidor no está accesible.
// ============================================================================

import * as React from 'react';

import { MOCK_EMAIL, MOCK_PASSWORD, mockData } from '@/data/mockData';
import {
  apiGetCitas,
  apiGetMascotas,
  apiGetRecordatorios,
  apiLogin,
  apiRegistro,
  apiTacharRecordatorio,
} from '@/services/api';
import type {
  AuthResponse,
  Cita,
  Mascota,
  Recordatorio,
  Usuario,
} from '@/types';

// ---------------------------------------------------------------------------
// Utilidades locales: detección de errores de red y mensajes profesionales.
// ---------------------------------------------------------------------------

/**
 * Detecta si un error proviene de la red (servidor apagado o sin conexión) y no
 * de una respuesta HTTP real. Los "fetch" fallan así cuando no hay servidor.
 */
function esErrorDeRed(err: unknown): boolean {
  const msg = String(err instanceof Error ? err.message : err).toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('network request failed') ||
    msg.includes('typeerror') ||
    msg.includes('fetch')
  );
}

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
  usuario: Usuario | null;
  token: string | null;
  conectado: boolean;
  mascotas: Mascota[];
  citas: Cita[];
  recordatorios: Recordatorio[];

  login: (correo: string, password: string) => Promise<void>;
  registro: (nombre: string, correo: string, password: string) => Promise<void>;
  logout: () => void;
  cargarDatos: () => Promise<void>;
  tacharRecordatorio: (id: number, completado: boolean) => Promise<void>;
  /** Añade una mascota al estado local (aporta el id automáticamente). */
  agregarMascota: (datos: Omit<Mascota, 'id'>) => Mascota;
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

  // Contador para generar ids de mascotas creadas localmente (evita colisiones
  // con los ids reales de la BD, que son bajos; usamos un arranque alto).
  const proximoId = React.useRef(1000);

  /**
   * Añade una mascota al estado local de la app. La nueva mascota recibe un id
   * autoincrementado y se inserta al inicio de la lista. En el Avance 1 (sin
   * persistencia) el registro sólo vive en memoria; en un avance posterior se
   * sincronizará con la API.
   */
  const agregarMascota = React.useCallback((datos: Omit<Mascota, 'id'>): Mascota => {
    const nueva: Mascota = { ...datos, id: proximoId.current++ };
    setMascotas((prev) => [nueva, ...prev]);
    return nueva;
  }, []);

  /**
   * Carga las mascotas, citas y recordatorios. Si hay token usamos la API;
   * si la API falla (servidor apagado) cargamos los datos simulados para que
   * la demo siga funcionando de forma autónoma.
   */
  const cargarDatos = React.useCallback(async () => {
    // Sin usuario, no hay nada que cargar.
    if (!token) return;

    try {
      // Se piden los tres recursos en paralelo para minimizar latencia.
      const [m, c, r] = await Promise.all([
        apiGetMascotas(token),
        apiGetCitas(token),
        apiGetRecordatorios(token),
      ]);

      setMascotas(m);
      setCitas(c);
      setRecordatorios(r);
      setConectado(true); // La API respondió correctamente.
    } catch {
      // Servidor no disponible: usamos los datos simulados.
      setMascotas(mockData.mascotas);
      setCitas(mockData.citas);
      setRecordatorios(mockData.recordatorios);
      setConectado(false);
    }
  }, [token]);

  /**
   * Procesa el resultado de una autenticación: guarda usuario y token, luego
   * carga los datos asociados.
   */
  const aplicarSesion = React.useCallback(
    async (respuesta: AuthResponse) => {
      setUsuario(respuesta.usuario);
      setToken(respuesta.token);
      // Aún no registramos el token en el estado para la carga; usamos el valor.
    },
    []
  );

  // -------------------------------------------------------------------------
  // LOGIN: intenta contra el servidor; si no hay conexión, usa el usuario demo.
  // -------------------------------------------------------------------------
  const login = React.useCallback(
    async (correo: string, password: string) => {
      try {
        const respuesta = await apiLogin(correo, password);
        await aplicarSesion(respuesta);
        setConectado(true);
        // Carga los datos del usuario real desde el servidor.
        setMascotas(await apiGetMascotas(respuesta.token));
        setCitas(await apiGetCitas(respuesta.token));
        setRecordatorios(await apiGetRecordatorios(respuesta.token));
      } catch (err) {
        // Si el fallo es de red (servidor apagado), permitimos la demostración
        // con el usuario simulado para que la app siga siendo usable sin API.
        if (esErrorDeRed(err)) {
          const esDemo =
            correo.trim().toLowerCase() === MOCK_EMAIL &&
            password === MOCK_PASSWORD;

          if (esDemo) {
            setUsuario(mockData.usuario);
            setToken('token-demo');
            setConectado(false);
            setMascotas(mockData.mascotas);
            setCitas(mockData.citas);
            setRecordatorios(mockData.recordatorios);
            return;
          }
          // Sin conexión y credenciales no-demo: avisamos sin revelar datos.
          throw new Error(mensajeServidorNoDisponible());
        }

        // El servidor respondió (p. ej. 401): propagamos su mensaje genérico
        // "Correo o contraseña incorrectos." sin detallar cuál falló.
        throw err;
      }
    },
    [aplicarSesion]
  );

  // -------------------------------------------------------------------------
  // REGISTRO: crea una cuenta (requiere el servidor activo).
  // -------------------------------------------------------------------------
  const registro = React.useCallback(
    async (nombre: string, correo: string, password: string) => {
      try {
        const respuesta = await apiRegistro(nombre, correo, password);
        await aplicarSesion(respuesta);
        setConectado(true);
        // Un usuario nuevo no tiene datos aún; comenzamos con listas vacías.
        setMascotas([]);
        setCitas([]);
        setRecordatorios([]);
      } catch (err) {
        // Si no hay conexión con el servidor, mostramos un mensaje claro en
        // lugar del genérico "Failed to fetch" del navegador/dispositivo.
        if (esErrorDeRed(err)) {
          throw new Error(
            mensajeServidorNoDisponible() +
              ' Cada usuario se crea en la base de datos local.'
          );
        }
        throw err;
      }
    },
    [aplicarSesion]
  );

  // -------------------------------------------------------------------------
  // TACHAR recordatorio (checkbox) - sincroniza con la API o con estado local.
  // -------------------------------------------------------------------------
  const tacharRecordatorio = React.useCallback(
    async (id: number, completado: boolean) => {
      // Actualizamos el estado local inmediatamente (optimismo en la UI).
      setRecordatorios((prev) =>
        prev.map((r) => (r.id === id ? { ...r, completado } : r))
      );

      if (token && conectado) {
        try {
          await apiTacharRecordatorio(token, id, completado);
        } catch {
          // Si falla la API, el cambio local queda; al recargar se re-sincroniza.
        }
      }
    },
    [token, conectado]
  );

  // Cierra la sesión y limpia todos los datos de la app.
  const logout = React.useCallback(() => {
    setUsuario(null);
    setToken(null);
    setConectado(false);
    setMascotas([]);
    setCitas([]);
    setRecordatorios([]);
  }, []);

  // ==========================================================================
  // Valor expuesto por el contexto.
  // ==========================================================================
  const value: AuthContextValue = {
    usuario,
    token,
    conectado,
    mascotas,
    citas,
    recordatorios,
    login,
    registro,
    logout,
    cargarDatos,
    tacharRecordatorio,
    agregarMascota,
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