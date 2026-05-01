# Preguntas y Respuestas sobre el Sistema

## PREGUNTA 1 - DESPLIEGUE Y USUARIOS

### Despliegue en Vercel y PWA
- **¿Los usuarios ven los cambios automáticamente?** No necesariamente de forma inmediata. Debido a que el `sw.js` actual tiene una estrategia de cache simple que cachea el `index.html`, los usuarios de iPhone (PWA) podrían seguir viendo la versión antigua hasta que el Service Worker se actualice. En iOS, a veces es necesario cerrar la app completamente de la multitarea y volver a abrirla, o esperar a que el navegador decida buscar una nueva versión del SW.
- **Service Worker (`sw.js`):** El archivo actual es muy básico. Para que los usuarios reciban actualizaciones instantáneas, se debería implementar una lógica de "skip waiting" o usar una librería como `Workbox`. Actualmente, al cachear `/index.html`, estamos bloqueando la actualización automática hasta que el cache expire o se invalide.
- **Privacidad de datos en Supabase:** Los datos están técnicamente separados por la columna `user_id` en todas las tablas (`transactions`, `monthly_budgets`, `savings_goals`, `categories`). En el código frontend, todas las consultas incluyen `.eq('user_id', user.id)`.
    > [!IMPORTANT]
    > Para garantizar que un usuario NO pueda ver los datos de otro incluso si intenta manipular el tráfico de red, es imperativo que las **RLS (Row Level Security)** estén activadas en Supabase con políticas de `auth.uid() = user_id`.

## PREGUNTA 2 - LÓGICA DE LÍMITES

### Diferenciación Semanal vs Mensual
El sistema no "decide" a qué límite sumar el gasto de forma exclusiva. En su lugar, el sistema calcula el gasto acumulado dinámicamente según el rango de fechas de la vista actual.

- **¿Cómo sabe a cuál sumar?** Si estás viendo la pestaña "Mensual", el sistema busca todas las transacciones del mes. Si estás en "Semanal", busca las de la semana. Un gasto de "Alimentación" hoy contará para ambos límites simultáneamente.
- **Límite Mensual Y Semanal:** Si existen ambos, aparecerán en sus respectivas pestañas. El usuario puede ver que le quedan $50.000 para la semana pero $500.000 para el mes. Son medidores independientes de la misma "bolsa" de transacciones.
- **Rango de fechas "Semanal":** Se calcula desde el lunes de la semana actual hasta el día de hoy (en horario de Colombia).

### Código exacto del cálculo (`Budget.tsx`):
```typescript
// Determinación del rango de fechas según el tab activo
let startStr, endStr;
if (activeTab === 'weekly') {
  startStr = getWeekStartMonday(); // Lunes actual
  endStr = getTodayColombia();    // Hoy
} else {
  const { firstDay, lastDay } = getMonthRange(currentMonthStr);
  startStr = firstDay;
  endStr = lastDay;
}

// Cálculo de gasto por categoría
const { data: txData } = await supabase
  .from('transactions')
  .select('category, amount')
  .eq('user_id', user.id)
  .eq('type', 'expense')
  .gte('date', startStr)
  .lte('date', endStr);

// Agregación en un mapa
const spentMap: Record<string, number> = {};
if (txData) {
  txData.forEach(tx => {
    spentMap[tx.category] = (spentMap[tx.category] || 0) + Number(tx.amount);
  });
}
```

---

# Plan de Mejoras de UX

| Mejora | Estado Actual | Propuesta de Implementación |
| :--- | :--- | :--- |
| **Feedback (Toasts)** | ❌ No existe (usa `alert`) | Crear componente `Toast` con Zustand para notificaciones de éxito/error. |
| **Loading States** | ⚠️ Pulse simple | Implementar `Skeleton Loaders` específicos que imiten la forma de las cards. |
| **Botón Loading** | ⚠️ Texto estático | Añadir spinner al componente `Button` y deshabilitar durante `isSubmitting`. |
| **Confirmación de Borrado** | ⚠️ `window.confirm` | Crear un modal de confirmación estilizado con `ConfirmModal`. |
| **Pull to Refresh** | ❌ No existe | Añadir lógica de detección de scroll en dispositivos móviles para recargar datos. |
| **Conteo en Tabs** | ❌ Solo texto | Mostrar el número de transacciones en los badges de las pestañas. |
| **Empty States** | ⚠️ Texto simple | Añadir ilustraciones SVG y botones de acción clara ("Call to Action"). |
| **Animación de Barras** | ❌ Estáticas | Usar `transition-all` y un pequeño delay al cargar para ver el crecimiento. |
| **Cerrar Modales** | ❌ Solo botón cerrar | Escuchar evento `KeyDown` (Escape) y añadir listener al `backdrop`. |
