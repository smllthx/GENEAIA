# Conciliacion y duplicados

Una transaccion canonica puede tener fuentes de correo, cartola, carga manual o proveedor bancario. `transaction_sources` conserva la evidencia sin duplicar el gasto.

## Puntuacion inicial

- Referencia exacta: 60.
- Monto exacto: 30.
- Misma cuenta o tarjeta: 20.
- Misma moneda: 10.
- Fecha dentro de un dia: 15.
- Fecha dentro de tres dias: 8.
- Comercio similar: 10.
- Mismo tipo: 5.

Con 90 puntos se confirma automaticamente; entre 70 y 89 se solicita revision; bajo 70 se mantienen elementos separados. Cada decision registra campos coincidentes, conflictos, actor y fecha.

Los montos se representan con Decimal en Swift y `numeric` en PostgreSQL. Las huellas aproximadas ayudan a encontrar candidatos, pero no sustituyen la puntuacion.
