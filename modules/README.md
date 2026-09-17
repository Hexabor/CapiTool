# Módulos

Cada módulo vive en su carpeta con `index.html`, `module.js` y `module.css`, y carga el core
por ruta relativa (`../../core/core.js`, `../../core/core.css`). El `id` de la carpeta es el
mismo que en la pestaña `modulos` del Sheet maestro y que la pestaña de datos en el Sheet
de tienda.

| Carpeta v2 | Módulo v1 (`v1-reference/js/`) | Líneas v1 | Orden de migración |
|---|---|---|---|
| `checklist/` | `checklist.js` + `checklist.html` + `css/checklist.css` | 1 792 | 1 (fase 4, junto con `_template/`) |
| `entrenamientos/` | `entrenamiento.js` + `entrenamiento.html` | 393 | 2 |
| `procurement/` | `procurement.js` + `procurement.html` | 713 | 3 |
| `garantias/` | `warranty.js` + `warranty.html` + `css/warranty.css` | 1 508 | 4 |
| `ajustes/` | `adjustments.js` + `adjustments.html` + `css/adjustments.css` | 814 | 5 |
| `xfer/` | `xfer-reg.js` + `xfer-reg.html` + `css/xfer-reg.css` | 1 984 | 6 |

`_template/` se crea en la fase 4 a partir de lo aprendido con Checklist.
