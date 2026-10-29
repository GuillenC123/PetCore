# APF3: cámara, permisos y avisos locales

## Alcance

La rama integra captura de fotografías, gestión de permisos y notificaciones
locales con la agenda de PetCore. No utiliza un servicio push externo.

| Criterio | Implementación | Evidencia que debe capturarse |
| --- | --- | --- |
| Hardware | Cámara en perfil, mascotas y comprobantes | Tomar una foto y mostrar el resultado guardado |
| Permisos | Solicitud contextual, rechazo, bloqueo y Ajustes | Aceptar y rechazar; regresar desde Ajustes |
| Notificaciones | Agenda futura, cambios y apertura del cuidado | Recibir un aviso con la app en segundo plano y tocarlo |
| Errores y rendimiento | Compresión, límites, bloqueo de acciones y sincronización incremental | Error recuperable y ausencia de avisos duplicados |
| Integración | Preferencias por cuenta, navegación y cancelación | Completar/editar un cuidado y mostrar su efecto |

## Arquitectura

- `services/fotos.ts`: cámara/galería, compresión y liberación de recursos. Las
  imágenes de perfil son cuadradas; los comprobantes mantienen su proporción.
- `services/permisos.ts`: normalización de estados, canal Android y Ajustes.
  No solicita permisos durante el arranque de la aplicación.
- `utils/avisos-locales.ts`: transforma la agenda en avisos futuros y valida el
  destino al tocar una notificación. IDs de cuenta grandes conservan precisión.
- `services/sincronizar-avisos.ts`: reconcilia avisos existentes y deseados en
  una cola; invalida operaciones antiguas y conserva notificaciones ajenas.
- `services/avisos-dispositivo.ts`: adaptador Expo Notifications, cargado solo
  cuando se necesitan operaciones nativas.
- `LocalNotificationsContext`: preferencias por cuenta/dispositivo, ciclo de
  vida, actualización de datos y respuesta a notificaciones.
- `cuidado.tsx`: muestra el cuidado actual con las acciones de la agenda, o un
  mensaje si ya no está pendiente. No acepta rutas externas desde el aviso.

## Configuración

1. Instalar las dependencias con `npm install` en `MascotaCare`.
2. Iniciar la API si se va a demostrar persistencia real y configurar su URL LAN.
3. Iniciar Expo y abrir la aplicación en un teléfono Android/iOS compatible.
4. En Perfil, activar Avisos de cuidados y aceptar el permiso del sistema.

`app.json` declara el mensaje de cámara y el plugin `expo-notifications`.
Una aplicación instalada debe recompilarse para incorporar estos cambios.
Expo Go utiliza sus propios permisos y ajustes. Las notificaciones locales
están disponibles en Expo Go; las remotas en Android necesitan un development
build, pero no forman parte de esta entrega. No se solicita acceso al micrófono.

## Protocolo de pruebas en teléfono

Registrar modelo, versión del sistema, fecha, tipo de compilación y si se usó
API o demo. Estos pasos están pendientes de ejecución real en un dispositivo;
las pruebas con adaptadores no sustituyen esa evidencia.

1. Desde Añadir mascota o Editar perfil, pulsar Tomar foto, permitir cámara y
   guardar. Volver a acceder con API para comprobar recuperación de la foto.
2. Cancelar la cámara y comprobar que conserva la foto anterior.
3. Rechazar el permiso de cámara y verificar que la galería sigue utilizable.
   Con el permiso bloqueado, abrir Ajustes y regresar a PetCore.
4. Fotografiar un comprobante vertical y comprobar que no se recorta al centro.
5. En Perfil → Configuración, activar avisos. Rechazar el permiso y comprobar la explicación.
   Después permitirlo desde el sistema y volver a la app.
6. Pulsar Probar aviso en 5 segundos; comprobar entrega en primer plano y luego
   repetir con la app en segundo plano. Revisar volumen, No molestar y batería.
7. Crear una visita para dentro de unos minutos, comprobar que su recordatorio
   vinculado no produce un segundo aviso, recibirlo y abrir el cuidado.
8. Repetir con una dosis y un recordatorio. Editar su hora y comprobar que solo
   permanece la nueva programación; completar o eliminar cancela el aviso.
9. Cerrar sesión antes de la entrega: no deben quedar avisos de esa cuenta.
   Entrar con otra cuenta y comprobar aislamiento, también entre API y demo.
10. Desactivar los avisos y comprobar su cancelación. Reiniciar, volver a acceder
    y comprobar que se conserva la preferencia.
11. Tocar un aviso antiguo de un cuidado completado y comprobar el estado vacío.

## Límites y decisiones

- Se programan los próximos 50 avisos; se repone la cola al abrir/regresar,
  cambiar los datos o cada minuto en primer plano. El sistema entrega los
  programados aunque la app esté cerrada, pero no genera nuevos a partir de
  cambios del servidor sin volver a abrir la aplicación.
- Las fechas sin hora avisan a las 09:00 locales. Las dosis y citas respetan su
  fecha/hora. Los cuidados vencidos no disparan una ráfaga de avisos atrasados.
- Las tareas repetidas avanzan al completarlas, igual que el flujo existente.
- La entrega usa `bestEffort`; el sistema puede retrasarla por batería o ajustes.
  No se pide permiso de alarmas exactas ni se garantiza puntualidad clínica.
- La web conserva agenda/galería y explica las funciones exclusivas del móvil.
- El logging de errores nativos usa mensajes genéricos sin fotos, tokens ni
  contenido de tratamientos.

## Verificación automatizada

En `MascotaCare`, ejecutar los scripts `test-*.cjs`, `npx tsc --noEmit`,
`npm run lint` y `npx expo export --platform all --max-workers 2`.
`test-permisos.cjs` verifica aceptación, rechazo, bloqueo y alternativa web.
`test-avisos-locales.cjs` verifica fechas, duplicados, límite, actualizaciones,
cancelación, reintentos, concurrencia en logout, cuentas, preferencias y rutas.

Referencias: [Expo ImagePicker SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/imagepicker/)
y [Expo Notifications SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/notifications/).

## Incidencia en Redmi Pad 2 / Expo Go

El 28/10/2026 se reprodujo en el dispositivo una excepción nativa
`ERR_UNEXPECTED / NullPointerException` tanto al crear como al consultar un canal
con Expo Go. El permiso de cámara sí funciona. La configuración mínima y la
configuración completa del canal no resolvieron esta excepción. No se ha
confirmado la entrega de notificaciones en esa instalación y las pruebas con
adaptadores no verifican el binario de Expo Go.

Se preparó un perfil de APK independiente para compilar los módulos nativos de
las dependencias del proyecto y comprobarlo fuera de Expo Go:

```powershell
cd MascotaCare
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile preview-local
```

El APK usa `com.petcore.mascotacare`. El perfil `preview-local` apunta a la API
LAN `http://192.168.1.54:4000/api`; modificarla si cambia la IP del equipo.
`app.config.ts` habilita HTTP solamente para ese perfil de prueba. La API y
PostgreSQL deben seguir activos y la tablet debe estar en la misma Wi-Fi.
El perfil no publica en Google Play. El archivo `.easignore` excluye variables
locales, servidor, claves y adjuntos del archivo que se enviaría a EAS.

La configuración está preparada; el APK todavía debe generarse, instalarse y
validarse. Hay una sesión Expo disponible en este equipo. Antes de iniciar EAS se requiere
autorización para enviar el código del frontend al servicio y vincular el proyecto. No se debe dar el fallo por resuelto hasta comprobar un aviso real.
