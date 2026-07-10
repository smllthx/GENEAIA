# Arquitectura objetivo

La arquitectura objetivo mantiene un unico backend y dos clientes: la PWA Next.js y una aplicacion SwiftUI para iPhone, iPad y macOS.

## Limites

1. Presentacion: web y SwiftUI consumen contratos tipados.
2. Aplicacion: casos de uso para clasificar, dividir, importar y conciliar.
3. Dominio: dinero decimal, transacciones, fuentes, reglas y estados.
4. Infraestructura: Supabase, almacenamiento, proveedores de correo, PDF/OCR y OpenAI.
5. Procesamiento: trabajos idempotentes y reintentables fuera de las peticiones largas de Vercel.

## Fuente de verdad

PostgreSQL sera la fuente de verdad remota. SwiftData se reservara para cache local y estado pendiente de sincronizacion. Un contrato OpenAPI versionado generara clientes para TypeScript y Swift.

## Seguridad

Las operaciones de documentos, correo, IA y conciliacion se ejecutaran en endpoints autenticados. Los webhooks externos verificaran firma e idempotencia antes de acceder a servicios internos. Ningun cliente recibe claves de proveedores ni service-role keys.
