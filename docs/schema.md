# Modelo de datos

Dos tipos de archivo en Drive: el **Sheet maestro** y **un Sheet por tienda**. En toda pestaña
la fila 1 es la cabecera y actúa como esquema: el backend lee `getDataRange().getValues()`
una vez y convierte cada fila en un objeto `{ columna: valor }`. Añadir una columna a un
módulo = añadirla a la cabecera (vía `ensureStoreSheet()`), sin tocar el router.

Reglas generales:

- **Sin fórmulas** en pestañas de datos. Todo lo calcula la app.
- **Fechas en ISO 8601** como texto (`2026-09-17T18:04:00.000Z`), para que Sheets no las
  reinterprete por configuración regional. Las columnas de fecha se formatean como texto plano.
- **Objetos anidados** (llamadas, historiales) en una columna como JSON.
- **Borrado lógico** con `deleted = 1`; purga mensual de borrados > 90 días.

---

## Sheet maestro: `CapiTool · Maestro`

### `tiendas`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | texto | slug estable, p. ej. `madrid-atocha`. Es el nombre de fichero del Sheet de tienda y la clave en `usuarios` y `activacion`. |
| `nombre` | texto | Nombre visible, p. ej. `Madrid Atocha`. Precargado con las 69 tiendas + `Tienda de pruebas`. |
| `activa` | 0/1 | 1 cuando un admin la activa. Al activar se crea su Sheet. |
| `sheetId` | texto | id del Sheet de tienda en Drive. Vacío hasta activar. |
| `creadaEn` | ISO | fecha de activación. |
| `creadaPor` | email | admin que la activó. |

### `usuarios`

| Columna | Tipo | Notas |
|---|---|---|
| `email` | texto | clave. Siempre `@webuy.com`. |
| `tienda` | texto | `id` de `tiendas`. Vacío hasta que el usuario elige tienda. |
| `rol` | `tienda` / `admin` | |
| `estado` | `pendiente` / `activo` / `bloqueado` | |
| `aprobadoPor` | email | quién lo aprobó. |
| `fecha` | ISO | alta. |
| `ultimoAcceso` | ISO | se actualiza en `auth.me` como máximo una vez por hora. |

### `modulos`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | texto | `checklist`, `entrenamientos`, `procurement`, `garantias`, `ajustes`, `xfer`. Es también el nombre de la pestaña en el Sheet de tienda y la carpeta en `modules/`. |
| `nombre` | texto | visible en el hub. |
| `descripcion` | texto | una línea para la card. |
| `url` | texto | ruta relativa desde el hub: `../modules/checklist/`. |
| `icono` | texto | nombre del icono SVG del core. |
| `orden` | número | orden en el menú. |
| `activoGlobal` | 0/1 | interruptor general. 0 = oculto para todas las tiendas aunque tengan activación. |

### `activacion`

| Columna | Tipo | Notas |
|---|---|---|
| `tienda` | texto | `id` de tienda. |
| `modulo` | texto | `id` de módulo. |
| `activo` | 0/1 | |
| `modificadoPor` | email | |
| `fecha` | ISO | |

Una fila por par tienda-módulo. Si no existe la fila, el módulo está inactivo. El backend
cachea esta pestaña 60 s en `CacheService` y la invalida en `admin.setModule`.

### `log`

| Columna | Tipo | Notas |
|---|---|---|
| `fecha` | ISO | |
| `email` | texto | quién. |
| `accion` | texto | `admin.setModule`, `team.approve`, `migrate.import`, `admin.activateStore`… |
| `detalle` | texto | JSON corto con los parámetros relevantes. |

Solo append. Lo escriben las acciones de admin, de equipo y la migración; no las de datos.

---

## Sheet de tienda: `tiendas/<id>`

Creado por `ensureStoreSheet(tiendaId)` en la carpeta `CapiTool/tiendas/`. Esa misma función
añade las pestañas que falten a un Sheet existente cuando aparece un módulo nuevo, así que
se puede llamar siempre antes de operar.

### `_meta`

| Columna | Notas |
|---|---|
| `clave` | p. ej. `schema.checklist`, `xfer.cycleDate`, `migrado.garantias` |
| `valor` | texto o JSON |

### Columnas de control (todas las pestañas de módulo, siempre las 5 primeras)

| Columna | Tipo | Notas |
|---|---|---|
| `id` | texto | generado por el cliente (`crypto.randomUUID()`), o el id de v1 al migrar. |
| `updatedAt` | ISO | lo escribe **siempre el backend** (hora del servidor). Base de `data.changes`. |
| `updatedBy` | email | |
| `deleted` | 0/1 | borrado lógico. |
| `v` | número | versión de la fila. Empieza en 1. Un `upsert` con `v` distinta a la almacenada → 409. |

### Columnas por módulo (borrador; se cierran al migrar cada módulo en la fase 5)

Se definen leyendo `v1-reference/js/<modulo>.js`. Lo de abajo es el punto de partida.

**`checklist`**: `lista`, `tarea`, `orden`, `hecho`, `hechoPor`, `hora`, `cycleDate`, `criticoDias`, `lastDoneDate`, `notas`
**`checklist_archivo`**: mismas + `archivadoEn`
**`equipo`** (compartida por Checklist y Entrenamientos): `nombre`, `activo`, `orden`

**`entrenamientos`**: `persona`, `tema`, `fecha`, `formador`, `estado`, `notas`

**`procurement`**: `ref`, `producto`, `cantidad`, `estado`, `statusHistory` (JSON), `pedidoEn`, `notas`

**`garantias`**: `ticket`, `producto`, `umid`, `cliente`, `telefono`, `estado`, `fechaPedido`, `tiendaOrigen`, `atencionEspecial`, `atencionNota`, `llamadas` (JSON), `notas`

**`ajustes`**: `hash`, `fecha`, `sku`, `producto`, `cantidad`, `coste`, `motivo`, `usuario`, `revisado`
> El `hash` se calcula **sin** `adjCostVal` (la fuente lo recalcula entre exportaciones y en v1 producía casi-duplicados).

**`xfer`**: `ref`, `boxId`, `origen`, `destino`, `estado`, `fechaEnvio`, `fechaRecepcion`, `checker`, `notas`
**`xfer_archivo`**: mismas + `archiveId`, `archivadoEn`
> `cycleDate` de Xfer Reg va en `_meta` (`xfer.cycleDate`), no en filas.

---

## Correspondencia v1 → v2 (para la migración)

| v1 (Firestore) | v2 |
|---|---|
| `stores/{tienda}` (password, lastAccess) | `tiendas` + `usuarios`. La contraseña desaparece. |
| `stores/{tienda}/modules/{modulo}` (un doc con arrays) | pestaña `{modulo}` del Sheet de tienda, una fila por elemento. Id estable: el de v1 si existe, si no un hash de los campos clave. |
| `.../modules/xfer_reg/archives/{id}` | `xfer_archivo` con `archiveId` = id de v1 |
| Timestamps de Firestore | ISO 8601 texto |
| Objetos anidados | JSON en columna |
