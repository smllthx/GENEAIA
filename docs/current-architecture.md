# Arquitectura actual

Wallet es una PWA financiera construida con Next.js 15, React 19 y TypeScript. La interfaz usa Tailwind CSS, componentes Radix/shadcn parciales, Framer Motion, Recharts y Lucide.

## Capas existentes

- `app/`: App Router, pantalla principal y endpoints HTTP.
- `components/`: autenticacion, dashboard, banca, IA y formularios.
- `lib/`: tipos, clientes Supabase, cifrado, proveedores y sincronizacion bancaria.
- `supabase/`: esquema, migraciones y plantilla OTP.
- `public/`: manifiesto e iconos PWA.

Supabase entrega Auth, PostgreSQL, RLS y realtime. SimpleFIN y Fintoc disponen de implementaciones read-only; los proveedores restantes son adaptadores pendientes. La IA combina OpenAI con calculos locales.

## Deuda tecnica relevante

- `app/page.tsx` concentra navegacion, presentacion y calculos.
- La autenticacion visual depende de un gate cliente y no existe middleware global.
- El endpoint de IA debe obtener el contexto desde servidor y validar la sesion.
- Los montos del frontend web usan `number`.
- Los esquemas SQL manuales y las migraciones no estan completamente alineados.
- No existen pruebas automatizadas, cola de trabajos, procesamiento documental ni correo entrante.
- La PWA no incluye aun service worker u operacion offline.

La aplicacion Apple se incorpora de forma paralela. No reemplaza ni elimina la PWA.
