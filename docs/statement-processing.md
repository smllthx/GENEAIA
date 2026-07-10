# Procesamiento de cartolas

Las cartolas se almacenaran en un bucket privado y se procesaran mediante trabajos persistentes.

## Pipeline

1. Validar tamano y MIME real.
2. Analizar malware y calcular SHA-256.
3. Rechazar duplicados o PDF protegido sin clave.
4. Detectar banco, cuenta y periodo.
5. Extraer texto y tablas; OCR solo como respaldo.
6. Normalizar filas sin destruir valores originales.
7. Validar saldos inicial y final.
8. Conciliar y crear elementos por revisar.

Cada fila conservara pagina y ubicacion de origen. Los estados del trabajo se persistiran para que la aplicacion pueda cerrarse y retomar el progreso.

Vercel coordinara la carga y consulta, pero OCR y procesamiento pesado deben ejecutarse en un worker con limites adecuados.
