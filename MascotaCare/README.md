#  MascotaCare

Aplicación móvil en **React Native (Expo)** para organizar la información de tus
mascotas, sus actividades, citas veterinarias y recordatorios de cuidado.

## Validaciones

- `src/utils/validaciones.ts`: reglas reutilizables para login, registro y nueva
  mascota, con mensajes por campo mediante `FormInput`.
- `server/src/validation/`: reglas de tipos, longitudes acordes con PostgreSQL,
  estados, IDs BIGINT positivos, fechas y booleanos; normaliza textos y correos.
- `server/src/middleware/validar.js`: aplica los esquemas antes de ejecutar las
  rutas. Devuelve HTTP 400 con `{ error, errores }` cuando un campo es inválido.
  Los campos desconocidos se ignoran y las actualizaciones requieren al menos
  un campo editable con valor. Los campos omitidos se conservan; los textos
  opcionales admiten cadena vacía. `null` no borra campos en los UPDATE actuales.
- La edad conserva su formato textual (`3 años`, `6 meses`). Las citas requieren
  fecha/hora ISO con zona (`2026-09-06T10:30:00-05:00`) y los recordatorios usan
  fechas reales `AAAA-MM-DD`. Las contraseñas requieren al menos 6 caracteres y
  como máximo 72 bytes UTF-8, el límite de bcrypt.
- La API impide reabrir citas canceladas/completadas mediante una condición
  atómica en el UPDATE y responde HTTP 409. Este control no cubre escrituras SQL
  realizadas directamente fuera de la API.

Ejecuta `npm test --prefix server` para probar las rutas HTTP con PostgreSQL
simulado (no requiere una base de datos ni modifica datos reales). Ejecuta
`npx tsc --noEmit` y `npm run lint` para comprobar el código de la aplicación.


---

##  Estado del proyecto — Avance 1 (APF1)

Primer entregable: una **aplicación ejecutable** con un flujo inicial funcional,
basada en **datos estáticos / estado local** (sin integraciones reales de API,
base de datos ni hardware nativo; eso llega en avances posteriores).

###  Requerimientos cubiertos

| Requerimiento | Implementación |
|---------------|----------------|
| **Estructura y navegación** | `src/app/` (pantallas), `src/components/` (reusables), navegación con React Navigation (expo-router): Stack raíz + Bottom Tabs |
| **Pantallas base** | Mis Mascotas, Detalle de Mascota, Añadir Mascota, Inicio, Citas, Perfil, Recordatorios, Login, Registro |
| **Diseño responsivo** | Flexbox + `SafeAreaView` en todas las pantallas |
| **Componentes reutilizables** | `PetCard`, `AppointmentCard`, `QuickActionCard`, `Badge`, `StatCard`, `MenuRow`, `ReminderCard`, `FAB`, `FormInput`, `AppHeader`, `PetImage` |
| **Interacciones y estado** | `useState` para formularios, selección de especie, checklist de recordatorios |
| **Formulario validado** | “Añadir nueva mascota” y “Registro” con validación lógica y mensajes de error visibles |

###  Pantallas

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
