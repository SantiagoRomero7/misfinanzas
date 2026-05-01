# MisFinanzas 💰

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)

> Aplicación web progresiva (PWA) de finanzas personales, construida para ser tu principal herramienta en el seguimiento de tus gatos, límites y metas de ahorro. Operando 100% en la nube y adaptada a la perfección para tu móvil.

---

## 📱 Descripción General

**MisFinanzas** es una PWA moderna enfocada en la facilidad de uso y la estética impecable, ofreciendo a los usuarios una forma intuitiva de administrar su dinero. Su principal fortaleza reside en que:
- **Es una PWA instalable:** En dispositivos como el iPhone o Android, la experiencia se equipara a una aplicación nativa, ocupando la pantalla completa.
- **Datos permanentes e individuales en Supabase:** Tu dinero siempre seguro gracias al acceso universal mediante tus propias credenciales vinculadas en Supabase PostgreSQL. 

---

## ✨ Features Completas

- 🔒 **Autenticación Nativa:** Registro e inicio de sesión seguros vía Supabase Auth (email/password).
- 📊 **Dashboard Integral:** Vista central con tarjeta de tu Balance global, además de un resumen de ingresos y gastos dinámico del mes en curso.
- 💸 **Módulo de Transacciones:** Registra ingresos y gastos. Cuenta con filtrado amigable por mes, tarjetas identificadoras según la categoría, íconos y tabs ágiles. Posibilidad de eliminación.
- 🎯 **Módulo de Presupuesto:** Configura montos mensuales por categorías y visualiza las barras de progresión. Integra un espectro visual para alertas (riesgo intermedio y sobregiro).
- 🐷 **Metas de Ahorro:** Guarda dinero con un progreso circular interactivo (SVGs). Configura metas con deadline (fecha límite) e inyecta aportes a discreción.
- 📈 **Reportes y Analíticas:** Visualización inteligente que combina un BarChart moderno y un reporte PieChart con Recharts, midiendo exactamente cómo inviertes el dinero por grupo.
- 🇨🇴 **Zona Horaria de Colombia (America/Bogota):** Toda hora es manejada en UTC-5 para evitar incongruencias geográficas.
- 🔢 **Formato Inteligente COP:** Separador manual de miles visual en tiempo real mientras typeas, para una agilidad inigualable.
- 🍏 **Safe Areas para iOS:** Compatibilidad nativa sin que el notch o la *Home Bar* de tu teléfono interfieran con tu interface limpia.
- 👤 **Bottom Navigation Inteligente:** Tabuladores ergonómicos (con nueva sección de **Perfil**) para cierres de sesión controlados. Modal inicial programada siempre en el switch `Ingreso` para mayor velocidad.

---

## 🔐 Seguridad y Ciberseguridad

- **Rate Limiting en Login:** Máximo 5 intentos fallidos, bloqueo de 30 segundos con contador visible.
- **Sanitización de Inputs:** Todos los campos de texto son limpiados de caracteres peligrosos (`<>{}`) antes de enviarse a Supabase.
- **Timeout de Sesión:** Cierre automático por inactividad de 30 minutos con aviso previo de 1 minuto.
- **Headers de Seguridad HTTP:** Configurados en Vercel: X-Frame-Options, X-XSS-Protection, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
- **Row Level Security:** Cada query a Supabase es validada a nivel de base de datos con auth.uid().
- **Variables de Entorno:** Credenciales nunca hardcodeadas, siempre desde import.meta.env.

---

## 🛠️ Tech Stack

El núcleo tecnológico del sistema descansa en:
- **React 19 + Vite** y **TypeScript** (estricto) para el core fundamental.
- **Tailwind CSS v3** en lo absoluto y componentes encapsulados para los estilos.
- **React Router v6** para su navegación ágil de tipo Client-Side.
- **Zustand** como manejador ligero del estado de sesión en toda el app.
- **Supabase** proveyendo PostgreSQL + Auth + RLS activo por defecto.
- **Recharts** brindando gráficos limpios y responsivos.
- **Lucide React** entregando todas las iconografías dinámicas.
- **date-fns** administrando cruces de zona horaria y cálculo temporal.
- **vite-plugin-pwa** empaquetando la PWA y configurando su *Service Worker*.

---

## 📁 Arquitectura y Estructura de Carpetas

```text
src/
├── assets/          # Íconos e imágenes de base y marca personal.
├── components/      # Bloques de interface (UI) y Maquetado base (Layout).
│   ├── layout/      # AuthGuard (matriz safe area) y el BottomNav o navegación móvil.
│   └── ui/          # Elementos modulares: Inputs reusables, Botones, Modales, Badges y Tarjetas.
├── lib/             # Funciones utilitarias globales.
│   ├── constants.ts # Íconos categorizados, mapeo de colores, variables.
│   ├── formatters.ts# Formateador global de COP, y forzado horario a UTC-5 (Bogota).
│   └── supabase.ts  # Script creador e inicializador del Cliente Supabase.
├── pages/           # Vistas renderizadas por React Router (Dashboard, Savings, Budget, Trans., login).
├── store/           # Reductores Zustand (useAuthStore).
└── types/           # Tipados robustos exportables (Typescript Interfaces globales).
```

---

## 🗄️ Base de Datos en Supabase (PostgreSQL)

La base de datos se despliega en Supabase incluyendo 4 tablas nativas vinculadas por Foreign Key al motor auth.users de Supabase. Poseen la directriz RLS (Row Level Security) donde validan automáticamente: `auth.uid() = user_id`.

| Tabla | Columnas Clave | Finalidad |
|---------|---------|---------|
| `transactions` | id, user_id, amount, type, category, date, description | Registra cada ingreso y gasto único con su fecha asignada y el tipo (`income/expense`). |
| `categories` | id, name, type, color, icon | Listado escalable de nuevas categorías. |
| `savings_goals` | id, user_id, name, target_amount, current_amount, deadline, color | Alberga los datos de cada nueva meta planteada y permite los empujones acumulativos de saldo. |
| `monthly_budgets` | id, user_id, month, category, limit_amount, spent_amount | Configuración del usuario para el top de gastos según mes y el estado del sobrante. |

**🔐 Row Level Security (RLS)**:
Las reglas forzan una política donde cada inserción, edición, búsqueda y borrado son autorizados exclusivamente si el token JWT actual le pertenece al UID de dichas filas en Supabase. Si alguien intercepta tu API temporalmente, no podrá ver, pedir o corromper datos de otros. 

---

## 📅 Lógica de Límites de Presupuesto

Explica cómo el sistema diferencia límites mensuales y semanales:

- **Mensual:** Suma todas las transacciones de tipo `expense` entre el primer y último día del mes actual.
- **Semanal:** Suma transacciones desde el lunes de la semana actual hasta hoy (zona horaria Colombia).
- Si una categoría tiene límite mensual Y semanal, cada uno se calcula y muestra por separado en su tab.
- Los gastos se asocian al límite por nombre exacto de categoría (match directo).

---

## 🚀 Instalación y Setup Local

1. Clona el Repositorio de GitHub:
```bash
git clone https://github.com/tu-usuario/misfinanzas.git
cd misfinanzas
```

2. Instala dependencias con NPM:
```bash
npm install
```

3. Crea el entorno local (duplica el `.env.example` en caso de existir o crea un archivo `.env.local`) y añade las variables de acceso limitadas:
```env
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

4. Dispara el servidor en tu Local host:
```bash
npm run dev
```

---

## 🌐 Despliegue en Vercel

Dada su naturaleza nativa orientada al SPA de web, Vercel es tu mejor opción:
1. Conecta tu repositorio de GitHub directamente a un nuevo proyecto en **Vercel**.
2. Al momento de las configuraciones de lanzamiento, añade como parámetros seguros tus variables `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. ¡Despliega y Vercel se encargará del CI/CD de manera automática en cada Push de branch *main*!

---

## 📲 Cómo instalar como PWA en iPhone (iOS)

Dado que la PWA implementa el *Web App Manifest* al 100%, su instalación permite saltarse el App Store y mantener las notificaciones y cache local. 

Para instalar:
1. Abrir la **URL brindada en Safari**.
2. Tocar el **ícono de Compartir** en la tira inferior (un cuadrado con una flecha saliendo).
3. Seleccionar del listado temporal: **"Añadir a pantalla de inicio"** *(Add to Home Screen)*.
4. Dar a 'Agregar' — *automáticamente la App se fijará en tu pantalla como cualquier aplicación descargada del App Store regular sin bordes.*

---

## ⚙️ Variables de Entorno

| Variable | Descripción | Required |
|---------|---------|---------|
| `VITE_SUPABASE_URL` | Tu URI individual del cluster Supabase. | ✅ Sí |
| `VITE_SUPABASE_ANON_KEY`| Token JWT habilitador temporal. | ✅ Sí |

---

## 📦 Historial de Cambios Principales

### v1.0.0 - MVP Base
- Setup inicial React + Vite + Supabase + PWA
- Autenticación con email/password
- Dashboard con datos reales de Supabase
- Zona horaria Colombia

### v1.1.0 - Módulos Completos  
- Transacciones con filtro por mes y categorías
- Presupuesto mensual y semanal con barras de progreso
- Metas de ahorro con progreso circular SVG
- Reportes con gráficas Recharts

### v1.2.0 - UX y Categorías
- Categorías personalizadas como ciudadanos de primera clase
- Formato automático COP con puntos de miles en inputs
- Toast notifications en todas las acciones
- Skeleton loaders y empty states mejorados
- Confirmación antes de eliminar

### v1.3.0 - Seguridad y Pulido
- Rate limiting en login (5 intentos, bloqueo 30s)
- Timeout de sesión por inactividad (30 min)
- Sanitización de inputs en toda la app
- Headers de seguridad HTTP en Vercel
- Editar y eliminar límites de presupuesto
- Logo PWA generado (192x192, 512x512, 180x180)
- README completo con documentación total

---

## 🤝 Contribución y Licencia

**MisFinanzas** opera bajo la [Licencia MIT](https://choosealicense.com/licenses/mit/). Tienes permisos completos de replicarlo y crear versiones iteradas.

**Para contribuir:** 
- Por favor realiza el Fork del proyecto primero.
- Crea un `feature-branch` especifico o un `bug-fix`.
- Mantén el flujo de ESLint y las normativas modulares.
- Levanta un `Pull Request` refiriéndose y explicando tu proposición de cambio para someterse a análisis activo. 

---
*Hecho para una economía sana. 💡*
