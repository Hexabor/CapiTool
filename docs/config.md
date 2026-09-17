# Configuración del entorno

Valores obtenidos durante `ARRANQUE.md`. Ninguno es secreto (el Client ID y la URL de la
web app van en el código del cliente de todas formas), pero el script ID y los ids de Sheets
no hace falta publicarlos en la UI.

Sustituir cada `<...>` al completar el paso indicado.

## Cuentas y GitHub

| Clave | Valor | Paso |
|---|---|---|
| Cuenta propietaria (Drive, Apps Script, Cloud) | `abeatrice@webuy.com` | — |
| Primer admin de CapiTool | `abeatrice@webuy.com` | — |
| Dominio Workspace | `webuy.com` | — |
| Usuario GitHub | `Hexabor` | — |
| Repo | `https://github.com/Hexabor/CapiTool` | 1 |
| GitHub Pages | `https://hexabor.github.io/CapiTool/` | 1 |

## Google Cloud / OAuth

| Clave | Valor | Paso |
|---|---|---|
| ID del proyecto de Cloud | `<capitool-xxxxxx>` | 2 |
| OAuth Client ID (web) | `<xxxxxxxx.apps.googleusercontent.com>` | 2 |
| Orígenes autorizados | `https://hexabor.github.io`, `http://localhost:8080` | 2 |

## Drive / Sheets

| Clave | Valor | Paso |
|---|---|---|
| Carpeta `CapiTool/` (id) | `<id>` | 3 |
| Carpeta `CapiTool/tiendas/` (id) | `<id>` | 3 |
| Sheet maestro `CapiTool · Maestro` (id) | `<id>` | 3 |

## Apps Script

| Clave | Valor | Paso |
|---|---|---|
| Script ID | `<id>` | 3 |
| URL de la web app (`/exec`) | `<https://script.google.com/macros/s/.../exec>` | 7 |
| Deployment ID | `<id>` | 7 |

## Dónde se usa cada valor en el código

- `core/config.js` (fase 2): `CT_CONFIG = { clientId, apiUrl, hostedDomain: 'webuy.com' }`.
- `backend/Code.gs`: `MASTER_ID`, `STORES_FOLDER_ID`, `ALLOWED_AUDIENCE` (= Client ID),
  `HOSTED_DOMAIN`. Hasta que existan se leen de `PropertiesService` (`setupMaster` los pide).
- `backend/.clasp.json`: `scriptId`.

## Referencia v1 (solo para la herramienta de migración)

- Proyecto Firebase: `omnitool-c1ed2` (config en `v1-reference/js/firebase.js`).
- Estructura: `stores/{tienda}/modules/{modulo}` + `.../archives/{id}`.
- Tiendas piloto en v1: Madrid Atocha, Madrid Islazul, Madrid Las Rosas, Madrid Usera, Talavera Trinidad.
