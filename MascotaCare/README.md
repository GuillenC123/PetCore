# 🐾 MascotaCare

Aplicación móvil en **React Native (Expo)** para organizar la información de tus
mascotas, sus actividades, citas veterinarias y recordatorios de cuidado.

> ⚠️ **Disclaimer:** esta app es una herramienta de organización y **no sustituye**
> la asesoría veterinaria profesional.

---

## 📌 Estado del proyecto — Avance 1 (APF1)

Primer entregable: una **aplicación ejecutable** con un flujo inicial funcional,
basada en **datos estáticos / estado local** (sin integraciones reales de API,
base de datos ni hardware nativo; eso llega en avances posteriores).

### ✅ Requerimientos cubiertos

| Requerimiento | Implementación |
|---------------|----------------|
| **Estructura y navegación** | `src/app/` (pantallas), `src/components/` (reusables), navegación con React Navigation (expo-router): Stack raíz + Bottom Tabs |
| **Pantallas base** | Mis Mascotas, Detalle de Mascota, Añadir Mascota, Inicio, Citas, Perfil, Recordatorios, Login, Registro |
| **Diseño responsivo** | Flexbox + `SafeAreaView` en todas las pantallas |
| **Componentes reutilizables** | `PetCard`, `AppointmentCard`, `QuickActionCard`, `Badge`, `StatCard`, `MenuRow`, `ReminderCard`, `FAB`, `FormInput`, `AppHeader`, `PetImage` |
| **Interacciones y estado** | `useState` para formularios, selección de especie, checklist de recordatorios |
| **Formulario validado** | “Añadir nueva mascota” y “Registro” con validación lógica y mensajes de error visibles |

### 🧭 Pantallas

- **Inicio** — saludo, acciones rápidas, mascotas y próximas citas.
- **Mis Mascotas** — lista de mascotas con estado de salud (`PetCard`).
- **Detalle de Mascota** — ficha completa (toca una tarjeta).
- **Añadir Mascota** — formulario validado (botón ➕ o acción rápida).
- **Citas** — lista de citas con color por estado.
- **Perfil** — datos del usuario, estadísticas y menú.
- **Recordatorios** — modal (campana 🔔) con checklist.

### 🔗 Navegación

- **Stack raíz** (`src/app/_layout.tsx`): grupos `(tabs)` (protegido por sesión),
  `(auth)` (público) y modales.
- **Bottom Tabs** (`src/app/(tabs)/_layout.tsx`): barra personalizada con píldora
  azul en la pestaña activa (expo-router / React Navigation).

---

## 🚀 Cómo ejecutar localmente

### Requisitos

- **Node.js** >= 20 (recomendado 24)
- **npm** >= 10
- **Expo Go** (en el teléfono) **o** un emulador (Android/iOS)
- **(Solo para usar la BD/API)** **PostgreSQL** 17 instalado y corriendo

### 1) Instalar dependencias

```bash
cd MascotaCare
npm install
```

### 2) Arrancar la app (Expo)

```bash
npx expo start
```

Luego:
- Escanea el **código QR** con Expo Go (Android/iOS), o
- Pulsa `a` para abrir el emulador Android, `i` para iOS, `w` para web.

### 3) Credenciales demo

Inicia sesión con:

```
Correo:    ana.garcia@email.com
Contraseña: 123456
```

> La app **funciona sin servidor**: si la API no responde, usa automáticamente
> los datos simulados (`src/data/mockData.ts`).

### (BD local) Cómo trabajar cada quien con su base de datos

Cada miembro del equipo configura **su propia base de datos** en su máquina.
`npm install` **no** crea tablas: el esquema se aplica manualmente una sola vez.
Sigue estos pasos en orden.

**Paso 1 — Crear la base de datos (una vez)**
Abre psql y crea la base:
```bash
psql -U <tu_usuario_postgres>
CREATE DATABASE "MascotaCare";
\q
```

**Paso 2 — Configurar credenciales (una vez)**
Copia la plantilla a tu propio archivo y edítala con **tu** contraseña:
```bash
cd server
copy .env.example .env     # Windows
# o:  cp .env.example .env  # Mac/Linux
```
Abre `server/.env` y reemplaza los valores por los tuyos (usa `localhost`,
puerto `5432`, tu usuario y tu contraseña real). Tu `.env` **no se sube al repo**
(está en `.gitignore`); el `.env.example` comparte la estructura con valores de
ejemplo como `tucontrasena`.

**Paso 3 — Aplicar el esquema y los datos de ejemplo (una vez)**
Desde la carpeta del proyecto, ejecuta el archivo SQL:
```bash
psql -U <tu_usuario_postgres> -d "MascotaCare" -f server/db/schema.sql
```
Esto crea las tablas (`Usuario`, `Mascota`, `CitaMedica`, `Recordatorio`) y
rellena los datos demo (Ana García, Luna, Milo).

> ⚠️ La schema es **idempotente** (se puede volver a ejecutar sin romper datos).

**Paso 4 — Instalar dependencias del servidor (una vez)**
```bash
cd server
npm install
```

**Paso 5 — Levantar la API (cada vez que quieras usar la BD)**
```bash
npm start          # escucha en http://localhost:4000
```
Comprueba que responda abriendo `http://localhost:4000/api/estado`:
debería devolver `{"estado":"ok","nombre":"MascotaCare API"}`. Cualquier otra
ruta (como la raíz `http://localhost:4000`) devuelve `{"error":"Ruta no encontrada."}`
— es normal, el servidor no tiene página inicial.

**Paso 6 — Arrancar la app (en otra terminal)**
```bash
cd MascotaCare
npx expo start
```

Si la API está **encendida**, la app usa la BD real. Si está **apagada**, usa
los datos simulados automáticamente (modo demo). El login y el registro solo
guardan en la BD real cuando el servidor está levantado.

> 📱 **Dispositivo físico:** en el emulador Android la app apunta a
> `10.0.2.2:4000` (tu PC). En un teléfono físico cambia `HOST` en
> `src/services/api.ts` por la IP LAN de tu PC.

---

## 📁 Estructura del proyecto

```
MascotaCare/
├─ app.json / package.json / tsconfig.json
├─ src/
│  ├─ app/                 # Pantallas + navegación (expo-router)
│  │  ├─ _layout.tsx       # Stack raíz (tabs protegidos, auth, modales)
│  │  ├─ (tabs)/           # Index, Mascotas, Citas, Perfil + tab bar
│  │  ├─ (auth)/           # Login, Registro
│  │  ├─ mascota-detalle.tsx
│  │  ├─ nueva-mascota.tsx
│  │  └─ recordatorios.tsx
│  ├─ components/          # Componentes reutilizables
│  ├─ context/             # AuthContext (sesión + datos, con fallback mock)
│  ├─ data/                # mockData.ts (datos simulados)
│  ├─ services/            # api.ts (cliente HTTP)
│  ├─ utils/               # Helpers de estados y fechas
│  ├─ constants/           # theme.ts (paleta AppColors)
│  └─ types.ts
└─ server/                 # API Express (avances futuros)
   ├─ src/                 # entrada + rutas (auth, mascotas, citas, recordatorios)
   └─ db/schema.sql        # esquema PostgreSQL + seed
```

---

## 🧪 Verificaciones

```bash
npx tsc --noEmit    # TypeScript sin errores
npm run lint        # ESLint sin errores
```

---

## 🗺️ Próximos avances (pendientes)

- Conectar la app de forma persistente con la API + PostgreSQL.
- Subir fotos reales de mascotas.
- Agendar actividades/citas y guardarlas en la BD.
- Notificaciones de recordatorios.

---

## 📄 Información de licencia

Trabajo académico. Los datos de ejemplo son ficticios.