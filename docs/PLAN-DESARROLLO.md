# Plan de desarrollo del avance 2

Objetivo: completar API con estados, AsyncStorage, el flujo integrado y evidencias. Los hooks ya tienen funciones reales y el consumo y procesamiento de API están implementados en código.

Las etapas 1, 2 y 3 se implementaron en `api-estados`, `storage` y `flujo`. Las dos últimas corresponden a `feat/asyncstorage` y `feat/flujo-integrado` del plan. La etapa 4 sigue pendiente. `dev` ya reúne `funciones` y `visual`. Cada rama se crea desde `dev` después de integrar la anterior.

## Alcance mínimo

Guardar, recuperar y actualizar una caché de respuestas de API por usuario. Esto permite demostrar el requisito sin prometer sincronización automática de nuevas mascotas, visitas o registros de salud. Esas escrituras serán una ampliación posterior.

## Orden de ramas

| Orden | Rama | Entrega | Requisitos |
| --- | --- | --- | --- |
| 1 | `api-estados` | Carga reutilizable, estados y errores de consulta. | API y estados; conserva hooks existentes. |
| 2 | `storage` | Servicio de caché por usuario y pruebas. | Base técnica de almacenamiento. |
| 3 | `flujo` | Recuperación, consulta, interfaz y guardado conectados. | AsyncStorage e integración dentro de la app. |
| 4 | `docs/evidencias-avance2` | Demostración, capturas/video y README final. | Evidencias y documentación. |

La rama 3 utiliza el servicio de la rama 2 en el funcionamiento real de la app; la integración está comprobada mediante pruebas automatizadas. La demostración con PostgreSQL y capturas se completa en la etapa 4.

## 1. api-estados

**Estado:** implementado con pruebas automatizadas de cliente HTTP, hook de carga, contexto y presentación de estados. La comprobación contra PostgreSQL real y las capturas quedan en la etapa de evidencias.

**Dónde:** `MascotaCare/src/services/api.ts`, `src/hooks/use-carga-datos.ts`, `src/context/AuthContext.tsx`, `src/components/DataLoadState.tsx`, `src/utils/identificadores.ts`, `src/types.ts`, `src/app/_layout.tsx` y `scripts/test-api-estados.cjs`. Las rutas abreviadas son relativas a `MascotaCare/`.

**Trabajo:**

1. Configurar URL con `EXPO_PUBLIC_API_URL`, conservando alternativa local, y añadir un archivo de ejemplo del frontend.
2. Unificar carga de mascotas, citas y recordatorios; evitar duplicarla entre login y una carga posterior.
3. Exponer estado inicial, cargando, listo o error, mensaje y acción de reintento.
4. Separar autenticación de consulta: una sesión válida puede mostrar un fallo al cargar datos.
5. Separar demo y cuentas reales; un error de consulta real no debe cargar los mocks de Ana García.
6. Revisar IDs de PostgreSQL y comparaciones al seleccionar mascotas, sin perder precisión al convertir BIGINT.
7. Ignorar respuestas de sesiones anteriores después de salir o cambiar de usuario.

**Aceptación:** éxito, red fallida, error HTTP y vacío son distinguibles; reintentar vuelve a consultar; no se mezclan usuarios; funciona seleccionar mascotas reales; pasan comprobaciones y pruebas de éxito/error/vacío/respuesta tardía.

## 2. storage

**Estado:** servicio implementado y probado. AsyncStorage 2.2.0 está instalado; la integración con el flujo de la app se implementó en la etapa 3.

**Dónde:** `package.json`, `package-lock.json`, `src/services/storage.ts`, `src/utils/cache.ts`, `src/types.ts` y `scripts/test-storage.cjs`.

**Trabajo:**

1. Desde `MascotaCare/`, instalar la dependencia compatible:

   ```bash
   npx expo install @react-native-async-storage/async-storage
   ```

   Comando de la [referencia de AsyncStorage para Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/async-storage/).

2. Definir caché con versión, propietario, fecha de actualización, mascotas, citas y recordatorios.
3. Usar una clave por usuario, por ejemplo `petcore:cache:v1:<origen>:usuario:<id>`, y un espacio independiente para demo.
4. Implementar lectura, escritura y eliminación con JSON y validación del contenido.
5. Diferenciar ausencia, corrupción, versión incompatible y fallo del almacenamiento.
6. Ordenar escrituras para evitar que una antigua sobrescriba datos nuevos.
7. La caché guardará datos de aplicación; contraseñas y tokens quedan fuera de ese contenido.

**Aceptación verificada:** guardar/leer recupera el contenido; usuarios y demo aislados; ausencia, corrupción, versión incompatible y error distinguibles; los errores no bloquean operaciones posteriores; prevalece la escritura reciente; eliminar afecta solo a la clave indicada y respeta las escrituras pendientes. La validación incluye campos, fechas, IDs y referencias entre listas.

**Contrato para la etapa 3:** usar `guardarCache`, `leerCache` y `eliminarCache` con `{ usuarioId, origen }`. Leer entrega un resultado discriminado; escribir/eliminar rechazan con `ErrorStorage` ante errores. La caché contiene campos de las respuestas actuales, sin sesión ni registros locales avanzados de salud. El hook y la interfaz ya lo utilizan desde la etapa 3.

## 3. flujo

**Estado:** implementado en `flujo`, equivalente a `feat/flujo-integrado`. Pasan TypeScript, lint, diez scripts del frontend, 44 pruebas del servidor y exportación web. Estas comprobaciones no sustituyen la demostración con PostgreSQL real o dispositivo.

**Dónde:** `src/hooks/use-carga-datos.ts`, `src/context/AuthContext.tsx`, `src/utils/datos-locales.ts`, `src/types.ts`, `src/components/DataLoadState.tsx`, `src/app/_layout.tsx`, `scripts/test-flujo.cjs` y auxiliares de pruebas. El aviso y los datos compartidos cubren Inicio, Ficha de salud, Agenda y Recordatorios sin duplicar consultas por pantalla.

**Flujo implementado:**

1. Iniciar sesión; la sesión sigue siendo temporal en este alcance.
2. Un `useEffect` recupera la caché del usuario. `useState` controla datos, recuperación, consulta y error.
3. Mostrar caché válida y fecha de actualización mientras se consulta la API.
4. Respuesta correcta: actualizar datos, procesamiento e interfaz y guardar en AsyncStorage.
5. Error: conservar caché y ofrecer Reintentar; sin caché, mostrar error de consulta.
6. Respuesta vacía correcta: mostrar vacío y actualizar caché para quitar datos obsoletos.
7. Tras reiniciar, iniciar sesión de nuevo y reutilizar la caché antes de actualizarla.

Recuperar caché no concede acceso. Una cuenta real todavía necesita autenticarse con la API. Para demostrar recuperación tras reiniciar, iniciar sesión nuevamente; para demostrar error con caché, apagar la API después del acceso.

**Trabajo adicional:**

- Esperar la recuperación antes de escribir; no sobrescribir caché con las listas iniciales vacías.
- Mostrar carga inicial, actualización, datos guardados, error con reintento y vacío.
- Actualizar caché tras operaciones confirmadas por el servidor, como completar un recordatorio existente.
- Proteger e informar sobre cambios que siguen siendo locales antes de reemplazar listas al recargar. Caché de API no equivale a persistencia de esas ediciones.
- Al salir, limpiar datos visibles e ignorar operaciones pendientes; conservar caché por usuario para el siguiente acceso.
- Adaptar scripts que simulan hooks si cambia el proveedor.

Estas tareas están implementadas. El guardado puede reintentarse sin consultar API. Las pruebas incluyen reinicio simulado con el mismo dispositivo, lectura y escritura tardías, separación de usuarios/demo y confirmación de un recordatorio mientras hay un GET pendiente.

**Aceptación comprobada en código y pruebas:** los cuatro elementos participan en el mismo flujo; reiniciar y entrar reutiliza datos; no aparece vacío durante carga; un error conserva caché y muestra procedencia/reintento; no se mezclan sesiones ni demo; no hay sobrescritura inicial; una consulta vacía elimina datos obsoletos; pasan TypeScript, lint, pruebas existentes y del flujo.

## 4. docs/evidencias-avance2

**Dónde:** `README.md`, `MascotaCare/README.md`, este plan y nueva carpeta `docs/evidencias/` en la raíz.

**Trabajo:**

1. Probar contra PostgreSQL real.
2. Registrar plataforma, configuración, pasos y resultados.
3. Capturar API real/datos procesados, carga, error/reintento, vacío, recuperación tras reinicio y actualización de caché.
4. Identificar qué evidencia usa API, caché o demo.
5. Actualizar arquitectura, ejecución y persistencia con lo implementado.
6. Enlazar archivos reales y marcar requisitos cumplidos después de verificar.

**Aceptación:** ejecución reproducible desde un clon; capturas/video existentes y enlaces válidos; demostración de API → interfaz → almacenamiento → reutilización; resultados de comprobación y limitaciones documentados.

## Integración en dev

Guardar primero los cambios locales en su rama correspondiente. Las ramas `api-estados`, `storage` y `flujo` ya existen. Tras verificar e integrar `flujo`, crear la rama de evidencias desde `dev` actualizado:

```bash
git switch dev
git pull --ff-only origin dev
git switch -c docs/evidencias-avance2
```

Al terminar, abrir un PR hacia `dev` con resultado y verificación. Integrar y crear la siguiente rama desde el nuevo `dev`. El orden evita cambios independientes simultáneos sobre el contexto.

No hace falta volver a combinar `funciones` y `visual`. Conservar la adaptación a tablets al integrar las siguientes ramas. `main` puede recibir la entrega cuando se verifique el avance completo.

## Ampliaciones posteriores

- Conectar creación y edición de mascotas y citas con API.
- Persistir tratamientos, tomas, peso, carnet, observaciones y adjuntos en el servidor.
- Alinear `malestar`, horas de vencimiento y recurrencia entre cliente, API y PostgreSQL.
- Incorporar notificaciones al dispositivo.

Pueden tener ramas posteriores; no son necesarias para los requisitos mínimos del TXT.
