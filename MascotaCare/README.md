# PetCore / MascotaCare

Aplicación para que los dueños organicen la salud y los cuidados de sus mascotas. La interfaz utiliza PetCore; el proyecto y la configuración de Expo conservan el nombre MascotaCare. El frontend está desarrollado con React Native, Expo y TypeScript. El proyecto también incluye una API con Express y una base de datos PostgreSQL.

## ¿Qué contiene?

- **Inicio:** resumen de mascotas, citas y recordatorios pendientes.
- **Mascotas y ficha de salud:** registro, detalle, nacimiento o edad aproximada, sexo, alergias y condiciones.
- **Agenda:** visitas, tomas de medicamentos y recordatorios, con filtros por mascota y fecha. Crear visitas desde el frontend ya funciona durante la sesión.
- **Recordatorios:** crear, editar, completar, posponer y repetir tareas diarias, semanales o mensuales, desde la campana o Notificaciones.
- **Peso:** mediciones, correcciones, historial y gráfica; una medición por fecha.
- **Carnet:** vacunas, desparasitación, próximas aplicaciones y fotografías de comprobantes.
- **Tratamientos:** indicaciones, duración, horarios y tomas administradas u omitidas.
- **Historial:** consultas realizadas, aplicaciones, tratamientos iniciados, observaciones y adjuntos PDF o fotografías.
- **Perfil:** datos del usuario, estadísticas, edición de nombre y correo, y cierre de sesión.
- **Ayuda:** guía sobre cómo utilizar la aplicación.
- **Acceso:** inicio de sesión y registro con validaciones y mensajes de error.

Agendar una visita exige mascota, motivo y fecha futura. Se crean una cita y su recordatorio, y la mascota pasa a `malestar`. Posponer el aviso conserva la fecha de la visita. Todavía no se envían notificaciones al teléfono.

## Arquitectura y tecnologías

Las pantallas consumen `useAuth()`. `AuthContext` administra sesión y operaciones de datos. `useCargaDatos` coordina las consultas, sus estados y la cancelación al salir; las utilidades calculan agenda, historial, peso y estados. `services/api.ts` realiza llamadas HTTP con `fetch`.

Express verifica JWT, valida solicitudes y consulta PostgreSQL mediante `pg` y SQL parametrizado. Las rutas de datos filtran por el usuario autenticado.

| Capa | Tecnologías declaradas |
| --- | --- |
| Frontend | React 19.2.3, React Native 0.86.3, Expo SDK 57, TypeScript 6. |
| Navegación y estado | Expo Router, React Context y hooks. |
| Interfaz y dispositivo | StyleSheet, Ionicons, Expo Image, selectores de fecha, imágenes, documentos y compartir. |
| Servidor | Node.js, Express 4, CORS, dotenv. |
| Datos y autenticación | PostgreSQL, pg, bcryptjs, jsonwebtoken. |
| Almacenamiento local | AsyncStorage 2.2.0; servicio de caché preparado para la integración. |
| Comprobaciones | ESLint, TypeScript, node:test y assertions. |

AsyncStorage 2.2.0 está instalado. `services/storage.ts` ofrece guardar, recuperar y eliminar caché por usuario. Su conexión con el hook y las pantallas se implementará en `feat/flujo-integrado`.

## Estructura del proyecto

```text
MascotaCare/
├── assets/                 # Imágenes e iconos
├── src/
│   ├── app/                # Pantallas y navegación con Expo Router
│   │   ├── (auth)/         # Login y registro
│   │   ├── (tabs)/         # Inicio, ficha de salud, agenda y perfil
│   │   ├── ayuda.tsx
│   │   ├── editar-perfil.tsx
│   │   ├── mascota-detalle.tsx
│   │   ├── nueva-cita.tsx
│   │   ├── nueva-mascota.tsx
│   │   ├── recordatorios.tsx
│   │   └── _layout.tsx     # Navegación principal
│   ├── components/         # Tarjetas, botones, campos y cabeceras reutilizables
│   ├── constants/          # Colores y estilos del tema
│   ├── context/            # Sesión del usuario y datos compartidos
│   ├── data/               # Datos de demostración
│   ├── hooks/              # Tiempo, guardado, tema y adaptación de interfaz
│   ├── services/           # Cliente HTTP y caché local
│   ├── utils/              # Validaciones y formato de estados y fechas
│   └── types.ts            # Tipos de usuario, mascota, cita y recordatorio
├── server/
│   ├── src/
│   │   ├── routes/         # Rutas de autenticación, mascotas, citas y recordatorios
│   │   ├── middleware/     # Autenticación y validación de solicitudes
│   │   ├── validation/     # Reglas y esquemas de validación
│   │   ├── db.js           # Conexión a PostgreSQL
│   │   └── index.js        # Inicio de la API
│   ├── db/schema.sql       # Tablas y datos iniciales
│   └── test/               # Pruebas de validación de la API
├── app.json                # Configuración de Expo
├── package.json            # Dependencias y comandos del frontend
└── tsconfig.json           # Configuración de TypeScript
```

## Persistencia actual

| Operación desde la interfaz | Almacenamiento |
| --- | --- |
| Registro de cuenta | PostgreSQL mediante API. |
| Consulta de mascotas, citas y recordatorios | API, o mocks en demostración. |
| Completar un recordatorio existente de API | Intenta actualizar el servidor; conserva su estado anterior si falla y permite reintentar. |
| Crear mascotas o visitas; editar perfil | Memoria de la sesión. |
| Ficha de salud, peso, carnet, tratamientos, observaciones y adjuntos | Memoria de la sesión. |
| Crear, editar o posponer recordatorios | Memoria de la sesión. |

La sesión tampoco se recupera automáticamente. Los cambios locales se pierden al reiniciar o salir. Aunque la API tiene creación y edición de mascotas y citas, el frontend aún no las utiliza para esas acciones.

PostgreSQL contiene `Usuario`, `Mascota`, `CitaMedica` y `Recordatorio`. El seguimiento de salud avanzado no tiene persistencia equivalente. El servidor no admite `malestar` y guarda vencimientos como fechas sin hora ni repetición.

## Ejecutar el proyecto

### 1. Requisitos y dependencias

Necesitas Node.js, npm, PostgreSQL y acceso a `psql` o pgAdmin para la API real. La [referencia de Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/) establece Node.js 22.13.x como mínimo para ese SDK.

Los pasos parten de `MascotaCare/`. Desde la raíz, ejecuta primero `cd MascotaCare`.

```bash
npm install
npm install --prefix server
```

### 2. PostgreSQL

En `psql` o pgAdmin, con permiso para crear bases de datos y fuera de una transacción:

```sql
CREATE DATABASE "MascotaCare";
```

Si ya existe, omite la creación. Desde `MascotaCare/`, aplica el esquema:

```bash
psql -h localhost -p 5432 -U postgres -d MascotaCare -v ON_ERROR_STOP=1 -f server/db/schema.sql
```

Ajusta host, puerto y usuario a tu instalación. También puedes ejecutar `server/db/schema.sql` desde pgAdmin conectado a esa base de datos.

El script crea las tablas. Solo inserta a Ana García y sus datos de prueba si `Usuario` está vacía; una base de datos con usuarios existentes no recibe automáticamente la cuenta demo.

### 3. Servidor

Entra en `server/` y copia `.env.example` a `.env`:

```bash
cd server
```

PowerShell:

```powershell
Copy-Item -LiteralPath .env.example -Destination .env
```

Bash:

```bash
cp .env.example .env
```

Configura `.env`:

- `PORT`: puerto HTTP, por defecto `4000`.
- `DATABASE_URL`: conexión a tu PostgreSQL con usuario, contraseña, host, puerto y base de datos.
- `JWT_SECRET`: valor propio para firmar tokens.
- `JWT_EXPIRES_IN`: duración del token; el ejemplo utiliza `7d`.

Desde `MascotaCare/server/`, inicia la API para que dotenv lea ese `.env`:

```bash
npm run dev
```

También puedes usar `npm start`. Abre `http://localhost:4000/api/estado`: debe responder con `estado: "ok"`. Este endpoint solo verifica que la API está encendida. Para comprobar PostgreSQL, registra una cuenta o inicia sesión y consulta sus datos.

### 4. Frontend y dispositivos

En otra terminal, desde `MascotaCare/`:

```bash
npm start
```

Pulsa `w` para web. También existen `npm run web`, `npm run android` y `npm run ios`; los destinos móviles requieren el entorno correspondiente.

La URL se puede configurar con `EXPO_PUBLIC_API_URL`, siguiendo las [variables de entorno de Expo](https://docs.expo.dev/guides/environment-variables/). Desde `MascotaCare/`, copia `.env.example` a `.env.local`, descomenta la variable y escribe la URL completa, incluyendo `/api`:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.20:4000/api
```

Cambia la IP por la del equipo de tu API y usa su puerto. Reinicia Expo después del cambio. Si omites la variable, `src/services/api.ts` utiliza estos valores:

| Destino | Host |
| --- | --- |
| Web en el mismo equipo | `localhost`. |
| Emulador Android estándar | `10.0.2.2`. |
| Simulador iOS en el equipo de la API | `localhost`. |
| Teléfono o tablet físicos | IP LAN del equipo de la API, por ejemplo `192.168.1.20`. |

En dispositivos físicos, define la IP y el puerto mediante `EXPO_PUBLIC_API_URL`. Equipo y dispositivo deben comunicarse en la red y el puerto debe ser accesible. Si cambias `PORT` en el servidor, utiliza el mismo puerto en la URL del frontend.

## Modo demostración

- **Correo:** `ana.garcia@email.com`.
- **Contraseña:** `123456`.

Si falla la conexión durante el acceso con estas credenciales, la app puede cargar mocks. Un rechazo de credenciales del servidor no habilita ese acceso alternativo. Crear cuentas requiere API activa.

Las fechas de los mocks están fijadas en septiembre de 2026 y pueden aparecer vencidas. El seed SQL utiliza fechas relativas a su inserción. El modo demo no acredita consumo real de API ni persistencia local.

## Uso en tablet

La app permite orientación vertical y horizontal. Con al menos 1000 unidades de ancho disponible y escala de fuente de hasta 1,5, la navegación pasa al lateral izquierdo. En ventanas más estrechas o con texto mayor vuelve a la barra inferior.

Inicio, agenda, ficha de salud, perfil y recordatorios distribuyen el contenido en dos columnas cuando hay espacio. Los formularios de mascota y visita también se ajustan al ancho disponible. Con texto ampliado se prioriza una sola columna para mantener la legibilidad. Girar la pantalla no borra los campos que estás editando.

Para probar un cambio de orientación en Expo Go, cierra y vuelve a abrir el proyecto después de cambiar `app.json`, y activa el giro automático en la tablet. En una aplicación instalada mediante APK es necesario generar una nueva compilación para aplicar cambios en la orientación nativa.

## Comprobar el código

Desde `MascotaCare/`:

```bash
npm run lint
npx tsc --noEmit
npm test --prefix server
```

Las pruebas del servidor recorren rutas HTTP y sustituyen PostgreSQL; no verifican una base de datos real. El lint de Expo tiene como alcance predeterminado el frontend.

Para los nueve scripts de lógica del frontend en PowerShell:

```powershell
$falloPruebas = $false
Get-ChildItem -LiteralPath scripts -Filter 'test-*.cjs' | ForEach-Object {
    node $_.FullName
    if ($LASTEXITCODE -ne 0) { $falloPruebas = $true }
}
if ($falloPruebas) { throw 'Fallaron pruebas del frontend.' }
```

Cubren agenda, historial, carnet, estados, guardado y reintento, peso, recordatorios, selectores y tratamientos. `test-api-estados.cjs` añade URL configurable, BIGINT, carga atómica, errores, reintento, sesiones y demo, con respuestas simuladas y una comprobación HTTP local. `test-storage.cjs` cubre recuperación, aislamiento, formato, errores, concurrencia y borrado; también utiliza la implementación web real de AsyncStorage con un localStorage de prueba. En una instalación nueva, Expo debe generar `expo-env.d.ts`; si TypeScript no reconoce la importación CSS, inicia Expo antes de repetir la comprobación.

## Carga y errores de datos

Después de autenticar, las consultas de mascotas, citas y recordatorios se ejecutan en paralelo y se publican juntas. Durante la primera carga, las pantallas de datos permanecen ocultas para no presentar listas vacías prematuramente. Un error muestra Reintentar y Cerrar sesión. Una respuesta correcta sin elementos habilita los mensajes de vacío existentes.

El cliente distingue error de conexión, HTTP, respuesta inválida, cancelación y tiempo de espera de 15 segundos por solicitud. Los IDs BIGINT conservan su precisión. Cambiar o cerrar sesión invalida las respuestas pendientes. Los errores al consultar datos de una cuenta real no cargan mocks; el modo demo solo se activa por un fallo de conexión durante el acceso con sus credenciales y se identifica en la interfaz.

## Servicio de caché local

El servicio `src/services/storage.ts` está disponible para la siguiente etapa. La interfaz actual todavía no lo invoca, por lo que su comportamiento de sesión no ha cambiado.

- `guardarCache(destino, datos)` devuelve la instantánea guardada o rechaza con `ErrorStorage`.
- `leerCache(destino)` devuelve `disponible`, `ausente`, `corrupta`, `incompatible` o `error`. Solo `disponible` incluye datos utilizables.
- `eliminarCache(destino)` elimina únicamente esa clave; un fallo rechaza con `ErrorStorage`.
- El destino contiene `usuarioId` y `origen` (`api` o `demo`). Un destino inválido rechaza sin acceder al almacenamiento.
- La clave es `petcore:cache:v1:<origen>:usuario:<id>`. IDs seguros numéricos y sus equivalentes en texto comparten la misma clave; BIGINT grandes conservan su precisión.
- La instantánea contiene versión, propietario, origen, fecha de actualización y las tres listas. Se valida antes de guardar y después de leer.
- Se guardan los campos de las respuestas actuales de mascotas y citas, y los campos de recordatorios, incluidas las opciones de repetición cuando existen. No incluye sesión, tokens, contraseñas ni los registros locales avanzados de salud.
- Las operaciones de una clave se ejecutan en orden; usuarios u orígenes distintos pueden operar simultáneamente. Una escritura captura sus datos al solicitarla.
- Una lectura corrupta o incompatible no borra automáticamente el contenido. Un fallo de almacenamiento no actualiza el estado de la app; el consumidor decidirá cómo informarlo.

Ejemplo para usar el servicio en la futura integración:

```typescript
import { guardarCache, leerCache } from '@/services/storage';

const destino = { usuarioId: usuario.id, origen: 'api' } as const;
await guardarCache(destino, datosObtenidosDeLaApi);
const resultado = await leerCache(destino);
if (resultado.estado === 'disponible') {
  aplicarDatos(resultado.cache.datos);
}
```

Las operaciones de escritura y eliminación deben manejarse con `try/catch`. La próxima rama coordinará esa información con los estados visibles y protegerá los cambios que siguen siendo locales.

Desde `MascotaCare/`, puedes probar este servicio por separado:

```bash
node scripts/test-storage.cjs
```

## Estado del avance 2

| Requisito | Estado |
| --- | --- |
| Hooks con utilidad real | Cumplido: `useState` en formularios/datos y `useEffect` en vencimientos. |
| API: obtener, procesar y mostrar | Implementado en código: cliente HTTP, contexto y agenda. |
| Carga, error y vacío | Implementado: consulta atómica, indicador de carga, error con reintento y vacío después de una respuesta correcta. |
| AsyncStorage | Parcial: servicio implementado y probado; reutilización desde la interfaz pendiente. |
| Flujo integrado | Parcial: falta conectar almacenamiento, API, hooks y estados. |
| README y evidencias | Documentación actualizada; evidencias del flujo completo pendientes. |

## Evidencias del funcionamiento

Todavía no se han incorporado capturas o video del avance 2. Las pruebas automatizadas acompañan la verificación, pero no sustituyen la demostración con API real y recuperación local.

La rama de evidencias añadirá archivos en `docs/evidencias/` en la raíz y los enlazará aquí. Debe mostrar:

1. Obtención de datos de API con PostgreSQL activo.
2. Datos procesados en Inicio o Agenda.
3. Indicador de carga.
4. Error de consulta y reintento.
5. Vacío de un usuario sin datos.
6. Recuperación de AsyncStorage tras cerrar y abrir la app.
7. Actualización de los datos guardados tras otra consulta de API.

Cada evidencia debe indicar plataforma, pasos, resultado y si utiliza API, caché o demo. Consulta el [plan por ramas](../docs/PLAN-DESARROLLO.md).
