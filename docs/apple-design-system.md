# Design System Apple

La aplicacion nativa vive en `apple/Wallet` y usa SwiftUI con superficies semanticas, SF Symbols y tipografia del sistema.

## Tokens

- Espaciado: 4, 8, 12, 16, 20, 24, 32 y 40.
- Radios: 10, 16, 22 y 28.
- Colores: fondos, etiquetas y separadores semanticos del sistema.
- Acento: acciones primarias, progreso, seleccion e iconos activos.
- Movimiento: transiciones breves y spring moderado, anulables con Reduce Motion.
- Vidrio: material solo en navegacion y superficies destacadas.

## Accesibilidad

Los componentes admiten Dynamic Type, VoiceOver, Increase Contrast, Reduce Motion, Reduce Transparency y Differentiate Without Color. Cada estado combina texto, color e icono. El tamano tactil minimo es 44 puntos.

Cuando Reduce Transparency esta activo, las tarjetas reemplazan materiales por fondos solidos del sistema.
