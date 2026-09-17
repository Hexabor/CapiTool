// === CapiTool 2.0 · backend ===
// Web app de Apps Script. Se despliega como "ejecutar como propietario" y
// "acceso: cualquiera". Toda petición de datos va por doPost con un idToken de
// Google en el cuerpo (ver docs/api.md). Este archivo es el esqueleto de la fase 0:
// solo el ping de salud y el router vacío. La fase 1 añade auth, rows, handlers.

const VERSION = '0.0.1';

// Ids de Drive. Se rellenan con setupMaster() en PropertiesService para no
// hardcodearlos en el código (ver setup.gs).
function cfg(key) {
  const v = PropertiesService.getScriptProperties().getProperty(key);
  if (!v) throw new Error('Falta la propiedad ' + key + '. Ejecuta setupMaster().');
  return v;
}

function respond(obj) {
  obj.serverTime = new Date().toISOString();
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function ok(data)             { return respond({ ok: true, data: data }); }
function fail(code, message, extra) {
  const error = Object.assign({ code: code, message: message || code }, extra || {});
  return respond({ ok: false, error: error });
}

// Ping de salud (criterio de "hecho" de la fase 0).
function doGet() {
  return respond({ ok: true, service: 'capitool-backend', version: VERSION, time: new Date().toISOString() });
}

// Router. Fase 1: auth(token) → user; HANDLERS[action](user, payload).
const HANDLERS = {
  // 'auth.me': handleAuthMe,
  // 'config.get': handleConfigGet,
  // ...
};

function doPost(e) {
  let body;
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return fail('bad_request', 'Cuerpo JSON inválido');
  }
  const action = body.action;
  if (!action) return fail('bad_request', 'Falta action');
  const handler = HANDLERS[action];
  if (!handler) return fail('not_found', 'Acción desconocida: ' + action);
  try {
    // const user = auth(body.token);   // fase 1
    // return ok(handler(user, body));
    return fail('internal', 'Router sin implementar (fase 1)');
  } catch (err) {
    console.error(action, err);
    return fail(err.code || 'internal', err.message);
  }
}
