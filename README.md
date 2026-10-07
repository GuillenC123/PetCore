# PetCore

Aplicación para que los dueños organicen la salud y los cuidados de sus mascotas: fichas de salud, visitas, tratamientos, peso, vacunas, historial y recordatorios.

La interfaz usa la marca **PetCore**; el proyecto y la configuración de Expo conservan el nombre `MascotaCare`. El frontend contempla Android, iOS y web.

## Funcionalidades actuales

| Área | Funciones |
| --- | --- |
| Inicio | Cuidados de hoy y vencidos, mascotas y accesos rápidos. |
| Ficha de salud | Nacimiento o edad, sexo, alergias y condiciones. |
| Peso | Una medición por día, correcciones, historial y gráfica. |
| Carnet | Vacunas, desparasitación, próximas aplicaciones y comprobantes. |
| Tratamientos | Indicaciones, duración, horarios y registro de tomas. |
| Agenda | Visitas, medicamentos y recordatorios; filtros por mascota y fecha. |
| Historial | Eventos de salud, consultas, observaciones y adjuntos PDF o fotografías. |
| Recordatorios | Crear, editar, completar, posponer y repetir tareas. |
| Perfil y acceso | Login, registro, edición de perfil, ayuda y cierre de sesión. |

Agendar visitas desde el frontend ya funciona durante la sesión: crea una cita y un recordatorio y cambia la mascota a `malestar`. Los avisos se consultan dentro de la app; todavía no hay notificaciones al teléfono.

## Arquitectura y tecnologías

El frontend usa **React Native 0.86.3, React 19.2.3, Expo SDK 57, Expo Router y TypeScript 6**. React Context comparte sesión y datos; `useCargaDatos` coordina las consultas, las utilidades procesan las respuestas y `fetch` consulta la API.

La API propia usa **Node.js, Express 4, PostgreSQL y pg**, con validaciones, consultas SQL parametrizadas, bcrypt y JWT.

```text
PetCore/
├── MascotaCare/
│   ├── src/app/          Pantallas y navegación
│   ├── src/components/   Interfaz y módulos de salud
│   ├── src/context/      Sesión y datos compartidos
│   ├── src/services/     Cliente HTTP y servicio de caché
│   ├── src/utils/        Reglas y transformación de datos
│   ├── src/hooks/        Tiempo, guardado y apariencia
│   ├── server/src/       API Express
│   ├── server/db/        Esquema y datos iniciales
│   └── scripts/          Pruebas del frontend
└── docs/                 Plan de desarrollo
```

Flujo actual: **pantallas → contexto y utilidades → cliente HTTP → API Express → PostgreSQL**. El contexto también permite usar datos de demostración.

## Estado del avance 2

| Requisito | Estado |
| --- | --- |
| `useState` y `useEffect` con funciones reales | Cumplido: formularios, estado compartido y vencimientos. |
| Obtener, procesar y mostrar datos de API | Implementado en código mediante la API propia. |
| Carga, error y vacío | Implementado: consulta atómica, indicador de carga, error con reintento y vacío tras una respuesta correcta. |
| AsyncStorage: guardar, recuperar y reutilizar | Parcial: dependencia y servicio de caché implementados y probados; reutilización en la interfaz pendiente. |
| Flujo integrado | Parcial; falta incorporar almacenamiento con API, hooks y estados. |
| README y evidencias | Documentación actualizada; capturas o video del flujo completo pendientes. |

Crear mascotas o visitas, editar el perfil y registrar datos de salud modifica el estado en memoria. Crear, editar y posponer recordatorios también es local. Completar un recordatorio existente de API sí intenta guardar su estado en el servidor. La sesión y los cambios locales se pierden al reiniciar o salir.

El servicio de caché usa AsyncStorage 2.2.0 y dispone de lectura, escritura y eliminación por usuario y origen API/demo. Todavía no está conectado a las pantallas; su uso dentro de la app corresponde a la siguiente etapa.

## Ejecución

Necesitas Node.js y npm; PostgreSQL para la API real. La [referencia de Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/) indica Node.js 22.13.x como mínimo para ese SDK.

Desde la raíz:

```bash
cd MascotaCare
npm install
npm start
```

Pulsa `w` para web. La [guía completa](MascotaCare/README.md#ejecutar-el-proyecto) documenta PostgreSQL, configuración e inicio del servidor, conexión desde dispositivos y comprobaciones.

Sin servidor, puedes entrar con `ana.garcia@email.com` y contraseña `123456`. Este modo usa mocks y no demuestra consumo real de API ni persistencia local.

## Documentación y desarrollo

- [Guía de la aplicación y uso en tablet](MascotaCare/README.md).
- [Plan del avance 2 por ramas](docs/PLAN-DESARROLLO.md).
- [Evidencias pendientes](MascotaCare/README.md#evidencias-del-funcionamiento).

`dev` ya reúne `funciones` y `visual`. Las etapas de API y servicio de caché están implementadas en `api-estados` y `storage`. La integración del flujo y las evidencias siguen pendientes.
