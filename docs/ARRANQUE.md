# Arranque de CapiTool 2.0 (fase 0)

Guía paso a paso para dejar montada la infraestructura antes de escribir el backend.
Los pasos marcados **[chat]** los ejecuta Claude Code con comandos; los marcados **[tú]**
requieren hacer clics en el navegador con la cuenta `abeatrice@webuy.com`. Al terminar
cada bloque, apunta los valores que salgan en `docs/config.md`.

Criterio de "hecho" de la fase 0: `https://hexabor.github.io/CapiTool/` sirve el `index.html`
y la URL del Apps Script responde `{"ok":true,"service":"capitool-backend"}`.

---

## 0. Comprobaciones previas [chat]

Ya verificado el 17/09/2026 en esta máquina:

- `git 2.52`, `gh 2.92` autenticado como **Hexabor** con scope `repo` y `workflow`.
- `node v24`, `npm 11`. `clasp` no está instalado (se instala en el paso 5).

Comando de comprobación rápida:

```bash
git --version && gh auth status && node --version
```

---

## 1. Repositorio y GitHub Pages [chat]

La carpeta `D:\1. Proyectos\CapiTool2` ya tiene `git init` (rama `main`), `.gitignore`,
`README.md` e `index.html` de redirección. Falta el primer commit, el remoto y Pages.

```bash
cd "/d/1. Proyectos/CapiTool2"
git add -A
git commit -m "chore: esqueleto del monorepo CapiTool 2.0"
gh repo create Hexabor/CapiTool --public --source=. --remote=origin --push \
  --description "CapiTool 2.0: hub de módulos para tiendas CeX. Login Google, datos en Google Sheets."
```

Activar Pages desde la rama `main`, carpeta raíz:

```bash
gh api --method POST /repos/Hexabor/CapiTool/pages \
  -f "source[branch]=main" -f "source[path]=/"
gh api /repos/Hexabor/CapiTool/pages --jq '.html_url, .status'
```

Tarda 1–3 minutos en el primer despliegue. Comprobar:

```bash
curl -sI https://hexabor.github.io/CapiTool/ | head -1     # HTTP/2 200
```

> Si `gh repo create` falla porque el nombre ya existe, usar `CapiTool2` como nombre de
> repo y cambiar la URL en `docs/config.md` y en `CLAUDE.md`.

Anotar en `config.md`: URL del repo y URL de Pages.

---

## 2. Proyecto de Google Cloud y OAuth Client ID [tú]

Necesario para el botón "Entrar con Google" (Google Identity Services). Como todas las
cuentas son `@webuy.com`, la app se configura como **interna**: sin verificación de Google
y sin límite de usuarios de prueba.

1. Entra en https://console.cloud.google.com con `abeatrice@webuy.com`.
2. Arriba, selector de proyecto → **Nuevo proyecto**. Nombre: `CapiTool`. Organización:
   `webuy.com` (debe aparecer; si solo aparece "Sin organización", no estás dentro del
   Workspace y el modo interno no estará disponible; ver bloque de problemas al final).
3. Menú → **APIs y servicios → Pantalla de consentimiento de OAuth**.
   - Tipo de usuario: **Interno**.
   - Nombre de la app: `CapiTool`. Correo de asistencia: `abeatrice@webuy.com`.
   - Dominio autorizado: `hexabor.github.io`.
   - Ámbitos: dejar los no sensibles por defecto (`email`, `profile`, `openid`). No añadir más.
   - Guardar.
4. **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth**.
   - Tipo: **Aplicación web**. Nombre: `CapiTool web`.
   - Orígenes de JavaScript autorizados:
     - `https://hexabor.github.io`
     - `http://localhost:8080` (para desarrollo local)
   - URIs de redirección: ninguna (GIS no la necesita).
   - Crear → copiar el **ID de cliente** (termina en `.apps.googleusercontent.com`).

Anotar en `config.md`: ID del proyecto de Cloud y Client ID.

---

## 3. Carpeta de Drive y Sheet maestro [tú]

1. En https://drive.google.com con `abeatrice@webuy.com`: crear carpeta **`CapiTool`** y,
   dentro, la subcarpeta **`tiendas`**.
2. Dentro de `CapiTool/` crear una hoja de cálculo nueva y renombrarla **`CapiTool · Maestro`**.
   No hace falta crear pestañas: las creará `setupMaster()` en el paso 6.
3. Copiar de la URL el **id del Sheet** (la cadena larga entre `/d/` y `/edit`).
4. Con el Sheet abierto: **Extensiones → Apps Script**. Se abre el editor con un proyecto
   vinculado. Renombrarlo (clic en "Proyecto sin título") a **`CapiTool backend`**.
5. En el editor: ⚙ **Configuración del proyecto** → copiar el **ID de secuencia de comandos**
   (script ID) y marcar la casilla **"Mostrar el archivo de manifiesto appsscript.json"**.
6. Copiar también el **id de la carpeta `tiendas`** (de su URL en Drive).

Anotar en `config.md`: id del Sheet maestro, id de la carpeta `tiendas`, script ID.

---

## 4. Habilitar la API de Apps Script para clasp [tú]

1. Ir a https://script.google.com/home/usersettings con `abeatrice@webuy.com`.
2. Activar **"API de Google Apps Script"**.

> Si el interruptor no aparece o está bloqueado, el administrador de Workspace ha
> desactivado la API. Sin ella, `clasp` no funciona y el código del backend se pega a mano
> en el editor (funciona igual, solo es más incómodo). Ver bloque de problemas.

---

## 5. clasp: vincular `backend/` con el proyecto de Apps Script [chat + tú]

```bash
npm install -g @google/clasp
clasp login          # abre el navegador: elegir abeatrice@webuy.com y aceptar
```

Vincular la carpeta `backend/` al script (sustituir `<SCRIPT_ID>` por el de `config.md`):

```bash
cd "/d/1. Proyectos/CapiTool2/backend"
clasp clone <SCRIPT_ID> --rootDir .
```

`clasp clone` descarga el `Código.gs` vacío y `appsscript.json`, y crea `.clasp.json`.
Después, sustituir lo descargado por los archivos que ya están preparados en `backend/`
(`appsscript.json`, `Code.gs`, `setup.gs`) y subirlos:

```bash
rm -f "Código.gs" Code.js         # lo que haya bajado clasp con otro nombre
clasp push -f
clasp open                        # abre el editor para comprobar que están los 3 archivos
```

> `.clasp.json` (contiene el script ID y `rootDir`) se commitea. Las credenciales de clasp
> viven en `~/.clasprc.json`, fuera del repo.

---

## 6. Inicializar el Sheet maestro [tú]

En el editor de Apps Script (`clasp open`):

1. Abrir `setup.gs`, seleccionar la función **`setupMaster`** en el desplegable y pulsar ▶.
2. La primera vez pide autorización: aceptar con `abeatrice@webuy.com` (permisos de Sheets
   y Drive del propietario, es lo esperado).
3. Al terminar, el Sheet maestro tiene las pestañas `tiendas` (69 filas), `usuarios`
   (abeatrice como `admin` / `activo`), `modulos` (6 filas), `activacion` (vacía) y `log`.
4. Ejecutar también **`setupCheck`**: escribe en el registro un resumen y devuelve `OK` si
   todo está.

`setupMaster()` es idempotente: se puede volver a ejecutar y no duplica filas.

---

## 7. Publicar el Apps Script como web app [tú]

1. En el editor: **Implementar → Nueva implementación**.
2. Tipo: ⚙ → **Aplicación web**.
3. Descripción: `v0 arranque`.
4. **Ejecutar como: Yo** (`abeatrice@webuy.com`).
5. **Quién tiene acceso: Cualquiera**.
6. Implementar → copiar la **URL de la aplicación web** (`https://script.google.com/macros/s/.../exec`).

> Si en "Quién tiene acceso" no aparece **Cualquiera** (solo "Cualquiera de webuy.com"),
> el administrador de Workspace bloquea las web apps públicas. Ver bloque de problemas.

Comprobar desde la terminal [chat]:

```bash
curl -sL "<URL_WEB_APP>"
# → {"ok":true,"service":"capitool-backend","version":"0.0.1","time":"..."}
```

Anotar en `config.md`: URL de la web app y el **id de implementación** (Implementar →
Gestionar implementaciones → copiar ID). Con ese id, las actualizaciones futuras mantienen
la misma URL:

```bash
clasp push -f && clasp deploy -i <DEPLOYMENT_ID> -d "descripción del cambio"
```

---

## 8. Cerrar la fase 0 [chat]

1. Rellenar `docs/config.md` con todos los valores.
2. Escribir el Client ID y la URL de la web app en `core/config.js` (lo crea el chat en la
   fase 2; hasta entonces basta con `config.md`).
3. Commit y push cuando el usuario lo pida.
4. Guardar en memoria del proyecto: URL de la web app, Client ID, ids de los Sheets.

Checklist final:

- [ ] `https://hexabor.github.io/CapiTool/` responde 200.
- [ ] La URL del Apps Script devuelve `{"ok":true,...}`.
- [ ] El Sheet maestro tiene 5 pestañas con cabeceras y 69 tiendas.
- [ ] `docs/config.md` sin placeholders `<...>`.
- [ ] `clasp push` funciona desde `backend/`.

---

## Desarrollo local

Para probar el hub y los módulos sin subir a Pages:

```bash
cd "/d/1. Proyectos/CapiTool2"
npx --yes serve -l 8080 .
# o: python -m http.server 8080
```

Abrir `http://localhost:8080/hub/`. El origen `http://localhost:8080` está en el OAuth client,
así que el login de Google funciona en local. El Apps Script es el mismo que en producción:
**cuidado al escribir datos de prueba**; usar una tienda de prueba (`Tienda de pruebas`,
que `setupMaster()` añade al final de la lista con `activa = no`).

---

## Problemas conocidos de Workspace y plan B

| Síntoma | Causa | Qué hacer |
|---|---|---|
| Al crear el proyecto de Cloud no aparece la organización `webuy.com` | La cuenta no está dentro del Workspace, o el admin no permite crear proyectos | Pedir al admin de Workspace permiso para crear proyectos de Cloud, o que cree uno llamado `CapiTool` y te dé rol Propietario. |
| La pantalla de consentimiento no ofrece "Interno" | El proyecto no está en la organización | Mismo que arriba. Plan B: "Externo" + añadir hasta 100 emails como usuarios de prueba; funciona pero con aviso de "app no verificada". |
| El interruptor de la API de Apps Script no está | Admin la ha desactivado | Trabajar sin clasp: copiar `backend/*.gs` y `appsscript.json` a mano en el editor. Todo lo demás funciona igual. |
| "Quién tiene acceso" no ofrece "Cualquiera" | Política de Workspace: web apps solo para el dominio | Pedir al admin que permita compartir web apps fuera del dominio (Consola de administración → Aplicaciones → Servicios adicionales de Google → Apps Script). Plan B técnico: desplegar como "Cualquiera de webuy.com" + "Ejecutar como usuario que accede" y llamar con `Authorization: Bearer <access_token>`; obliga a pedir scope de Drive al usuario y a compartir cada Sheet de tienda con sus usuarios. Es un cambio de diseño: hablarlo antes. |
| La autorización de `setupMaster` dice "app bloqueada" | Política de apps de terceros de Workspace | Es un script propio, vinculado al Sheet; el admin puede añadirlo a la lista de permitidas por su Client ID (aparece en el mensaje). |
