// === setup.gs · inicialización del Sheet maestro ===
// Ejecutar setupMaster() UNA vez desde el editor (▶) con la cuenta propietaria.
// Es idempotente: crea las pestañas que falten, escribe cabeceras, carga las
// tiendas y el catálogo de módulos sin duplicar filas, y guarda los ids en
// PropertiesService. Después, setupCheck() confirma que todo está.

const MASTER_TABS = {
  tiendas:    ['id', 'nombre', 'activa', 'sheetId', 'creadaEn', 'creadaPor'],
  usuarios:   ['email', 'tienda', 'rol', 'estado', 'aprobadoPor', 'fecha', 'ultimoAcceso'],
  modulos:    ['id', 'nombre', 'descripcion', 'url', 'icono', 'orden', 'activoGlobal'],
  activacion: ['tienda', 'modulo', 'activo', 'modificadoPor', 'fecha'],
  log:        ['fecha', 'email', 'accion', 'detalle']
};

const FIRST_ADMIN = 'abeatrice@webuy.com';

const MODULE_CATALOG = [
  ['checklist',      'Checklist',          'Listas de tareas diarias del equipo',             '../modules/checklist/',      'check',   1, 1],
  ['xfer',           'Xfer Reg',           'Registro y seguimiento de transferencias',        '../modules/xfer/',           'truck',   2, 1],
  ['garantias',      'Garantías',          'Garantías en curso, llamadas y atención especial', '../modules/garantias/',      'shield',  3, 1],
  ['ajustes',        'Control de ajustes', 'Importación y revisión de ajustes de stock',      '../modules/ajustes/',        'sliders', 4, 1],
  ['procurement',    'Procurement',        'Peticiones a procurement y su estado',            '../modules/procurement/',    'cart',    5, 1],
  ['entrenamientos', 'Entrenamientos',     'Formación del equipo',                            '../modules/entrenamientos/', 'book',    6, 1]
];

// Red completa (69 tiendas). Misma lista que core/stores.js.
const ALL_STORES = [
    'A Coruña Juan Florez',
    'A Coruña Marineda City',
    'Albacete Concepción',
    'Alcalá Magna',
    'Alcorcón TresAguas',
    'Algeciras Puerta Europa',
    'Alicante Alfonso X El Sabio',
    'Alicante Gran Vía',
    'Almería Torrecárdenas',
    'Barcelona Fabra i Puig',
    'Barcelona Gran de Gràcia',
    'Barcelona La Maquinista',
    'Barcelona Passeig Sant Joan',
    'Barcelona Sant Antoni',
    'Barcelona Sants',
    'Bilbao Areilza',
    'Bilbao Ballonti',
    'Bilbao de la Cruz',
    'Castellón Colón',
    'Ciudad Real Ramón y Cajal',
    'Córdoba Cruz Conde',
    'Elche Glorieta',
    'Getafe Madrid',
    'Gijón Uría',
    'Girona Espai',
    'Granada San Antón',
    'Hospitalet Just Oliveras',
    'Huelva Berdigón',
    'Jerez Santa María',
    'Leganés Juan Muñoz',
    'León Espacio',
    'León Ordoño',
    'Lleida Blondel',
    'Logroño Gran Vía',
    'Madrid Alcalá',
    'Madrid Atocha',
    'Madrid Bravo Murillo',
    'Madrid Hortaleza',
    'Madrid Islazul',
    'Madrid La Laguna',
    'Madrid La Vaguada',
    'Madrid Las Rosas',
    'Madrid Usera',
    'Málaga de la Mota',
    'Málaga Rosaleda',
    'Móstoles Plaza Pradillo',
    'Murcia Primo de Rivera',
    'Palma Carrer d\'Aragò',
    'Palma FAN Mallorca Shopping',
    'Palma Joan March',
    'Salamanca Mirat',
    'San Sebastián - Plaza Cataluña',
    'Santa Coloma de Gramenet',
    'Santander San Fernando',
    'Sevilla Asunción',
    'Sevilla Imagen',
    'Sevilla Nervión',
    'Sevilla Santa Justa',
    'Talavera Trinidad',
    'Terrassa Fontvella',
    'Torrent Avinguda',
    'Valencia Benimaclet',
    'Valencia Fernando',
    'Valencia Ruzafa',
    'Valladolid Teresa Gil',
    'Vigo Camelias',
    'Vilanova Macià',
    'Vitoria Independencia',
    'Zaragoza Carmen'
];

function slugify(name) {
  return name.toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function ensureTab(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  const current = sh.getLastColumn() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0] : [];
  const missing = headers.filter(h => current.indexOf(h) === -1);
  if (current.length === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else if (missing.length) {
    sh.getRange(1, current.length + 1, 1, missing.length).setValues([missing]);
  }
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold');
  // Todo como texto plano: evita que Sheets reinterprete fechas ISO o ids numéricos.
  sh.getRange(1, 1, sh.getMaxRows(), sh.getLastColumn()).setNumberFormat('@');
  return sh;
}

function readRows(sh) {
  const values = sh.getDataRange().getValues();
  const headers = values.shift() || [];
  return values.map(r => Object.fromEntries(headers.map((h, i) => [h, r[i]])));
}

function appendMissing(sh, keyCol, rows, headers) {
  const existing = new Set(readRows(sh).map(r => String(r[keyCol])));
  const toAdd = rows.filter(r => !existing.has(String(r[keyCol])));
  if (toAdd.length) {
    const matrix = toAdd.map(r => headers.map(h => r[h] === undefined ? '' : r[h]));
    sh.getRange(sh.getLastRow() + 1, 1, matrix.length, headers.length).setValues(matrix);
  }
  return toAdd.length;
}

function setupMaster() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Ejecuta esto desde el proyecto vinculado al Sheet maestro.');
  const props = PropertiesService.getScriptProperties();
  props.setProperty('MASTER_ID', ss.getId());

  // Carpeta tiendas/ junto al maestro (la crea si no existe).
  const file = DriveApp.getFileById(ss.getId());
  const parents = file.getParents();
  const parent = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  const it = parent.getFoldersByName('tiendas');
  const tiendasFolder = it.hasNext() ? it.next() : parent.createFolder('tiendas');
  props.setProperty('STORES_FOLDER_ID', tiendasFolder.getId());
  props.setProperty('HOSTED_DOMAIN', 'webuy.com');

  const tabs = {};
  Object.keys(MASTER_TABS).forEach(name => { tabs[name] = ensureTab(ss, name, MASTER_TABS[name]); });

  // Quitar la hoja vacía por defecto si sigue ahí.
  ['Hoja 1', 'Sheet1'].forEach(n => {
    const s = ss.getSheetByName(n);
    if (s && ss.getSheets().length > 1) ss.deleteSheet(s);
  });

  const now = new Date().toISOString();
  const stores = ALL_STORES.concat(['Tienda de pruebas']).map(n => ({
    id: slugify(n), nombre: n, activa: '0', sheetId: '', creadaEn: '', creadaPor: ''
  }));
  const addedStores = appendMissing(tabs.tiendas, 'id', stores, MASTER_TABS.tiendas);

  const modules = MODULE_CATALOG.map(m => ({
    id: m[0], nombre: m[1], descripcion: m[2], url: m[3], icono: m[4], orden: String(m[5]), activoGlobal: String(m[6])
  }));
  const addedModules = appendMissing(tabs.modulos, 'id', modules, MASTER_TABS.modulos);

  const addedAdmin = appendMissing(tabs.usuarios, 'email', [{
    email: FIRST_ADMIN, tienda: '', rol: 'admin', estado: 'activo', aprobadoPor: 'setup', fecha: now, ultimoAcceso: ''
  }], MASTER_TABS.usuarios);

  console.log('setupMaster: tiendas +%s, modulos +%s, admin +%s. MASTER_ID=%s STORES_FOLDER_ID=%s',
    addedStores, addedModules, addedAdmin, ss.getId(), tiendasFolder.getId());
}

function setupCheck() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const props = PropertiesService.getScriptProperties();
  const problems = [];
  Object.keys(MASTER_TABS).forEach(name => {
    const sh = ss.getSheetByName(name);
    if (!sh) { problems.push('Falta pestaña ' + name); return; }
    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    MASTER_TABS[name].forEach(h => { if (headers.indexOf(h) === -1) problems.push(name + ': falta columna ' + h); });
  });
  const count = name => { const sh = ss.getSheetByName(name); return sh ? sh.getLastRow() - 1 : 0; };
  const nStores = count('tiendas');
  const nMods = count('modulos');
  ['MASTER_ID', 'STORES_FOLDER_ID', 'HOSTED_DOMAIN'].forEach(k => { if (!props.getProperty(k)) problems.push('Falta propiedad ' + k); });
  if (nStores < 70) problems.push('tiendas tiene ' + nStores + ' filas (esperadas 70)');
  if (nMods < 6) problems.push('modulos tiene ' + nMods + ' filas (esperadas 6)');
  const msg = problems.length ? 'PROBLEMAS:\n' + problems.join('\n') : 'OK · tiendas=' + nStores + ' modulos=' + nMods;
  console.log(msg);
  return msg;
}
