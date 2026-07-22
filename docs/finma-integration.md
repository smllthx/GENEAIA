# Integración del patrón FINMA en Wallet

Este documento registra cómo se tradujo el análisis visual de 46 capturas de FINMA a la arquitectura existente de Wallet. La implementación reutiliza las capacidades reales de la aplicación; no sustituye Supabase, la banca read-only, la automatización de correo/PDF ni el asistente financiero.

## Navegación principal

La barra inferior queda reservada para cinco dominios de uso frecuente:

1. **Inicio**: saldo, disponible, alertas, gráficos y movimientos recientes.
2. **Movimientos**: búsqueda, filtros, revisión y edición.
3. **Suscripciones**: calendario, próximos cobros, detección de recurrencia y CRUD.
4. **Presupuestos**: límites semanales/mensuales por categoría, planes y deudas.
5. **Cuentas**: bancos, tarjetas, efectivo, conexión read-only y sincronización.

Correo/PDF e IA siguen disponibles como herramientas globales en el encabezado, evitando ocupar una pestaña principal.

## Reutilización de capacidades existentes

| Patrón observado | Implementación Wallet |
|---|---|
| Sincronización bancaria | SimpleFIN, Fintoc y banco sandbox read-only |
| Importación de estados de cuenta | Parser PDF/CSV y reconciliación existente |
| Alertas de transacciones por correo | Alias verificados, webhook de Resend y clasificación |
| Biometría | Passkeys/WebAuthn con Face ID, huella o PIN del dispositivo |
| Modo privacidad | Ocultamiento de montos y preferencias sincronizadas |
| IA financiera | Chat con contexto, clasificación e insights basados en datos reales |
| Accesibilidad | Perfiles TEA/TDAH, contraste, texto, densidad y reducción de movimiento |

## Suscripciones

- Usa la tabla `public.subscriptions` y sus políticas RLS existentes.
- Permite crear, editar, pausar, reactivar y eliminar una suscripción.
- Presenta total activo, próximo cobro y calendario de 14 días.
- Sugiere recurrencias únicamente cuando un comercio se repite o el movimiento está marcado como recurrente.
- Toda sugerencia requiere confirmación humana antes de guardar.

## Presupuestos

- Usa la tabla `public.budgets` y sus políticas RLS existentes.
- Permite crear, editar y eliminar límites semanales o mensuales.
- Calcula el gasto desde `transactions`; no confía en una cifra inventada ni en datos de demostración.
- Muestra progreso, aviso al exceder el límite y recomendaciones explicables.
- Conserva `DebtBudgetPlanner` para planes por período, eventos, deudas y deudores.

## Cuentas y seguridad

- Centraliza las cuentas conectadas, manuales y de efectivo.
- Conserva los flujos SimpleFIN/Fintoc, sincronización y diagnóstico de configuración.
- Archivar una cuenta la oculta y la excluye del saldo, pero preserva sus movimientos. Esta decisión evita la eliminación en cascada de historial financiero.
- Las conexiones bancarias son de solo lectura; la aplicación no puede transferir dinero.

## Decisiones deliberadas

- No se copian marcas, textos ni ilustraciones propietarias de la app de referencia.
- No se muestran datos falsos en producción.
- No se solicitan contraseñas bancarias directas.
- No se ejecutan acciones financieras autónomas por IA.
- Montos y recomendaciones sensibles continúan sujetos a autenticación y RLS.

## Verificación mínima

- `npx tsc --noEmit`
- `npm test`
- `npm run build`

Los tres comandos deben pasar antes de publicar a Vercel.
