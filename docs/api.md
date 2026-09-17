# API del backend (Apps Script)

Una sola web app, desplegada como **ejecutar como propietario / acceso: cualquiera**.
La URL está en `docs/config.md`.

## Transporte

- Siempre `POST` con `Content-Type: text/plain` (evita el preflight CORS; Apps Script no
  responde a `OPTIONS`). El cuerpo es JSON.
- Apps Script responde con un `302` a `script.googleusercontent.com`; `fetch` lo sigue por
  defecto (`redirect: 'follow'`). No se pueden leer cabeceras de respuesta: todo va en el cuerpo.
- No se pueden enviar cabeceras propias: el **token va en el cuerpo**.
- `GET` sin parámetros devuelve el ping de salud.

```js
// cliente (core/core.js)
const res = await fetch(CT_CONFIG.apiUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain' },
  body: JSON.stringify({ token, action, ...payload })
});
const json = await res.json();
```

## Envoltorio de respuesta

```json
{ "ok": true,  "data": { ... }, "serverTime": "2026-09-17T18:04:00.000Z" }
{ "ok": false, "error": { "code": "conflict", "message": "…", "rows": ["id1"] }, "serverTime": "…" }
```

Códigos de error: `unauthorized` (token inválido o dominio distinto de `webuy.com`),
`pending` (usuario no aprobado), `forbidden` (rol o módulo no activo para la tienda),
`not_found`, `conflict` (409 de `v`), `bad_request`, `locked` (LockService agotó 10 s), `internal`.

## Autenticación en cada petición

1. `token` es el **idToken** de Google Identity Services. Se verifica con
   `UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + token)`.
2. Se comprueba `aud == Client ID`, `email_verified == "true"`, `hd == "webuy.com"` y `exp` futuro.
3. El resultado se cachea en `CacheService` con clave = hash del token hasta su `exp`
   (máx. 1 h), para no llamar a tokeninfo en cada polling.
4. Se resuelve el usuario en `usuarios`. Si no existe, se crea como `pendiente` sin tienda
   (solo en `auth.me`; en cualquier otra acción → `unauthorized`).
5. Cada handler comprueba, en este orden: usuario `activo` → tienda asignada → módulo activo
   para esa tienda (`activacion`) y `activoGlobal` (o rol `admin`).

## Acciones

Todas reciben `token` y `action`; abajo solo el payload adicional. "Quién" = requisito mínimo.

### Sesión y equipo

| action | quién | payload | devuelve |
|---|---|---|---|
| `auth.me` | token válido | — | `{ email, tienda, tiendaNombre, rol, estado }`. Crea pendientes. Actualiza `ultimoAcceso` (máx. 1/h). |
| `auth.pickStore` | pendiente sin tienda | `{ tienda }` | asigna tienda; estado sigue `pendiente`. Solo una vez. |
| `config.get` | activo | — | `{ tienda, modulos: [{ id, nombre, descripcion, url, icono, orden }] }` solo activos. Admin: además `catalogo` completo. |
| `team.list` | activo | — | usuarios de mi tienda con estado. |
| `team.approve` | activo de la misma tienda, o admin | `{ email }` | pasa a `activo`. Escribe `log`. |

### Datos (todas requieren módulo activo para la tienda)

| action | payload | devuelve |
|---|---|---|
| `data.list` | `{ modulo }` | `{ rows: [...] }` filas con `deleted = 0`. Carga inicial. |
| `data.changes` | `{ modulo, since }` | `{ rows: [...], serverTime }` filas con `updatedAt > since`, borradas incluidas. Polling. |
| `data.upsert` | `{ modulo, rows: [{ id, v, ...campos }] }` | `{ rows: [...] }` filas resultantes con nueva `v` y `updatedAt`. Si alguna `v` no coincide → `conflict` con la lista de ids; **no se escribe nada del lote**. Fila nueva: `v` ausente o 0. Máx. 200 filas por llamada. |
| `data.delete` | `{ modulo, ids: [...] }` | `{ rows }` marcadas `deleted = 1`. |
| `data.archive` | `{ modulo, ids: [...], archiveId }` | mueve las filas a `<modulo>_archivo` con `archiveId` y `archivadoEn`. |
| `data.listArchive` | `{ modulo, archiveId? }` | filas del archivo (todas o de un `archiveId`). |
| `meta.get` | `{ clave }` o `{ prefijo }` | valor(es) de `_meta`. |
| `meta.set` | `{ clave, valor }` | escribe `_meta`. |

### Admin (rol `admin`)

| action | payload | devuelve |
|---|---|---|
| `admin.stores` | — | tiendas con `activa`, `sheetId`, nº usuarios, último acceso, módulos activos. |
| `admin.activateStore` | `{ tienda }` | marca `activa = 1`, llama a `ensureStoreSheet()`, guarda `sheetId`. `log`. |
| `admin.setModule` | `{ tienda, modulo, activo }` | escribe/actualiza `activacion`, invalida cache. `log`. |
| `admin.setGlobal` | `{ modulo, activoGlobal }` | interruptor general. `log`. |
| `admin.users` | `{ tienda? }` | todos los usuarios (o los de una tienda). |
| `admin.setUser` | `{ email, rol?, estado?, tienda? }` | promover, bloquear, reasignar. `log`. |
| `admin.log` | `{ desde?, hasta?, accion? }` | filas de `log`. |
| `migrate.import` | `{ tienda, modulo, rows: [...] }` | upsert masivo que **ignora ids ya presentes**. Devuelve `{ insertadas, ignoradas }`. Escribe `log` y `_meta.migrado.<modulo>`. Máx. 200 filas. |

### Salud

| método | devuelve |
|---|---|
| `GET` sin parámetros | `{ ok: true, service: "capitool-backend", version, time }` |

## Implementación (notas para `Code.gs`)

- **Router**: `doPost(e)` → `JSON.parse(e.postData.contents)` → `auth()` → `HANDLERS[action]` →
  `respond()`. Un `try/catch` global convierte excepciones en `{ ok:false, error:{ code:'internal' } }`
  sin filtrar el stack.
- **Capa de filas** (`rows.gs`): `readSheet(ss, tab)` → `{ headers, rows }`; `writeRows(ss, tab, rows)`
  con `LockService.getScriptLock().waitLock(10000)`. Índice `id → nº de fila` construido en cada
  llamada (suficiente hasta ~10 k filas; después, índice en `CacheService`).
- **`ensureStoreSheet(tiendaId)`**: crea el Sheet en `CapiTool/tiendas/` si no existe (nombre =
  `nombre` de la tienda), y para cada módulo del catálogo crea la pestaña con las 5 columnas de
  control + las del módulo (`SCHEMAS` en `schema.gs`). Añade columnas que falten al final.
- **`updatedAt`** siempre = `new Date().toISOString()` en el servidor; ignorar el que mande el cliente.
- **Trigger** mensual `purgeDeleted()`: elimina físicamente filas con `deleted = 1` y
  `updatedAt` > 90 días en todos los Sheets de tienda.
- **Despliegue**: `clasp push -f && clasp deploy -i <DEPLOYMENT_ID> -d "..."` mantiene la URL.
- **Tests** (`tests.gs`): funciones `test_*` ejecutables desde el editor contra `Tienda de pruebas`
  con un token de prueba aceptado solo cuando `PropertiesService` tiene `TEST_MODE = 1`.
