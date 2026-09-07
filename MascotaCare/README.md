# MascotaCare

Aplicación para organizar la información y el cuidado de mascotas. El frontend está desarrollado con React Native, Expo y TypeScript. El proyecto también incluye una API con Express y una base de datos PostgreSQL.

## ¿Qué contiene?

- **Inicio:** resumen de mascotas, citas y recordatorios pendientes.
- **Mascotas:** listado, detalle y formulario para añadir mascotas.
- **Citas:** consulta de citas y sus estados. Agendar desde el frontend todavía está pendiente.
- **Recordatorios:** lista con casillas para marcar tareas como completadas, accesible desde la campana y desde Notificaciones.
- **Perfil:** datos del usuario, estadísticas, edición de nombre y correo, y cierre de sesión.
- **Ayuda:** guía sobre cómo utilizar la aplicación.
- **Acceso:** inicio de sesión y registro con validaciones y mensajes de error.

## Estructura del proyecto

```text
MascotaCare/
├── assets/                 # Imágenes e iconos
├── src/
│   ├── app/                # Pantallas y navegación con Expo Router
│   │   ├── (auth)/         # Login y registro
│   │   ├── (tabs)/         # Inicio, mascotas, citas y perfil
│   │   ├── ayuda.tsx
│   │   ├── editar-perfil.tsx
│   │   ├── mascota-detalle.tsx
│   │   ├── nueva-mascota.tsx
│   │   ├── recordatorios.tsx
│   │   └── _layout.tsx     # Navegación principal
│   ├── components/         # Tarjetas, botones, campos y cabeceras reutilizables
│   ├── constants/          # Colores y estilos del tema
│   ├── context/            # Sesión del usuario y datos compartidos
│   ├── data/               # Datos de demostración
│   ├── hooks/              # Hooks de tema y apariencia
│   ├── services/           # Comunicación con la API
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

## Ejecutar el frontend

Desde la raíz del repositorio, con Node.js y npm instalados:

```bash
cd MascotaCare
npm install
npm start
```

Pulsa `w` para abrir la versión web. También puedes ejecutar `npm run web`.

Para presentar el frontend sin iniciar el backend, usa la cuenta de demostración:

- **Correo:** `ana.garcia@email.com`
- **Contraseña:** `123456`

Si la API no está disponible, estas credenciales permiten entrar con datos simulados. Las validaciones, la edición de perfil, el registro local de mascotas y las casillas de recordatorios funcionan sin backend. Los cambios locales se mantienen durante la sesión; no se conservan al reiniciar la app. Crear una cuenta nueva sí requiere la API.

## Comprobar el código

Desde `MascotaCare/`:

```bash
npm run lint
npx tsc --noEmit
```

Para las pruebas del servidor, instala primero sus dependencias con `npm install --prefix server` y ejecuta `npm test --prefix server`. Estas pruebas usan PostgreSQL simulado.
