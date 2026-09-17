# CapiTool 2.0

Hub de módulos para tiendas CeX. Sucesor de OmniTool/CapiTool v1 (Firestore), reconstruido
con login de Google y datos en Google Sheets dentro de Drive, accedidos a través de un
Apps Script. Los módulos se activan o desactivan por tienda desde un panel de admin.

**Toda la comunicación con el usuario va en castellano.** UI, commits y changelog también.

## Estado actual

Proyecto recién creado (17 sept 2026). Nada implementado todavía. El primer trabajo es
completar la **fase 0** siguiendo `docs/ARRANQUE.md` y rellenar `docs/config.md` con los
valores que salgan (URL del Apps Script, client ID, ids de Sheets).

Orden de trabajo: `docs/ARRANQUE.md` → fase 1 (backend) → fase 2 (core) → fase 3 (hub) →
fase 4 (plantilla + Checklist) → fase 5 (resto de módulos) → fase 6 (migración) → fase 7 (corte).
El plan completo, con pasos y criterios de "hecho" por fase, está en `docs/plan.html`.

## Estructura del repo (monorepo)

```
CapiTool2/               ← este repo. Se publica en https://hexabor.github.io/CapiTool/
├── CLAUDE.md
├── index.html           ← redirige a hub/
├── hub/                 ← entrada, login, menú de módulos, panel admin, migración v1
├── core/                ← código común: core.js (global CT), core.css, stores.js
├── modules/
│   ├── _template/       ← plantilla de módulo (fase 4)
│   ├── checklist/
│   ├── entrenamientos/
│   ├── procurement/
│   ├── garantias/
│   ├── ajustes/
│   └── xfer/
├── backend/             ← código del Apps Script (se sube con clasp). Incluye setup.gs y tests.gs
├── assets/              ← logo, favicon
├── docs/                ← plan.html, ARRANQUE.md, config.md, api.md, schema.md
└── v1-reference/        ← copia de OmniTool v1 SIN .git, ignorada por git. Solo lectura.
```

El core se importa por **ruta relativa** (`../../core/core.js`), no por URL versionada.
Nombre del repo en GitHub: `Hexabor/CapiTool` (la carpeta local se llama CapiTool2; no importa).

## Decisiones de arquitectura (no reabrir sin hablarlo con el usuario)

| Tema | Decisión |
|---|---|
| Backend | Google Sheets en el Drive de `abeatrice@webuy.com`, accedido solo vía Apps Script web app (ejecutar como propietario, acceso "cualquiera"). Sin Firebase. |
| Datos | Un Sheet **maestro** (`tiendas`, `usuarios`, `modulos`, `activacion`, `log`) + **un Sheet por tienda** con una pestaña por módulo. Fila 1 = cabecera = esquema. Detalle en `docs/schema.md`. |
| Login | Google Identity Services. Todas las cuentas son `@webuy.com` (Workspace) → OAuth **interno**. El backend verifica el idToken y exige `hd == webuy.com`. |
| Roles | `tienda` y `admin`. Primer admin: `abeatrice@webuy.com`. La primera cuenta de cada tienda la aprueba un admin; después, cualquier miembro activo de esa tienda aprueba a los nuevos. |
| Activación | Pestaña `activacion` del maestro (tienda × módulo). El hub solo pinta los activos; el backend rechaza peticiones de módulos desactivados. Panel admin en el hub. |
| Tiempo real | Polling de `data.changes` cada 20 s con pestaña visible, 60 s tras 5 min sin cambios, refresco al volver a la pestaña. Sin websockets. |
| Concurrencia | Columna `v` por fila + LockService. Upsert con `v` antigua → 409 → el cliente recarga la fila. |
| Borrado | Lógico (`deleted = 1`). Purga mensual por trigger. |
| Migración v1 | Herramienta en el hub (solo admin), por tienda y módulo, idempotente. Se ejecuta cuando el usuario decida. |
| Stack | HTML/CSS/JS vanilla. Sin frameworks, sin build. flatpickr como única dependencia de UI (CDN). |

## Convenciones

- **Estilo visual** (KPI Tool 2026): modo claro, azul primario `#2563eb`, fuente de sistema,
  cards 10 px radio + borde 1 px, hover borde azul + sombra + `translateY(-1px)`, topbar 48 px
  fija, sidebar 52 px solo iconos SVG monocromos (nunca emojis). Grid 3 · 1 · 2 columnas.
- **Monitores verticales**: la mayoría de tiendas usa monitores en vertical. Diseñar estrecho
  primero (600–900 px útiles), paneles anclados abajo como alternativa al lateral, sin scroll
  horizontal. Preferencia de layout en `localStorage` (por PC), no en el Sheet (por tienda).
- **Impresión**: B/N, apaisado, compacto (7 pt), grupos enmarcados y sin partir, sin topbar/sidebar.
- **Fechas**: en módulos con "iniciar nuevo día" manual, los cálculos de antigüedad se hacen
  contra el `cycleDate` del ciclo, nunca contra la hora del reloj.
- **Mockup primero**: cualquier feature de UI nueva se enseña antes como Artifact interactivo
  con el look real de la app y se implementa solo tras aprobación.
- **Changelog**: `hub/changelog.js` alimenta el panel "Novedades". Una versión por día como
  máximo, siempre `v0.X`, prefijo de módulo en cada entrada, solo el último bloque lleva
  `tag: 'ÚLTIMA'`, sin reversiones intradía.
- **Commits**: solo cuando el usuario lo pida. No proponer commit al terminar una implementación.
  Cuando lo pida, el orden es: changelog → stage → commit → push.
- **Si una petición no encaja** con nada del proyecto, preguntar; el usuario lleva varios
  proyectos en paralelo y puede estar en el equivocado.

## Dónde mirar

- `docs/ARRANQUE.md`: fase 0 paso a paso (repo, Pages, Drive, OAuth, Apps Script, clasp).
- `docs/config.md`: valores de entorno rellenados durante el arranque.
- `docs/api.md`: acciones del backend y su contrato.
- `docs/schema.md`: pestañas y columnas del maestro y de los Sheets de tienda.
- `docs/plan.html`: plan completo por fases (abrir en navegador).
- `v1-reference/js/<modulo>.js`: reglas de negocio de cada módulo de v1, para migrarlas.
  Módulos v1 → carpeta v2: `checklist.js`→checklist, `entrenamiento.js`→entrenamientos,
  `procurement.js`→procurement, `warranty.js`→garantias, `adjustments.js`→ajustes,
  `xfer-reg.js`→xfer. La config de Firebase de v1 está en `v1-reference/js/firebase.js`
  y solo se usa en la herramienta de migración.
