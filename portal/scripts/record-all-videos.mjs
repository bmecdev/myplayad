import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VIDEOS = [
  { id: 1, file: 'record-01-planes.mjs', name: '01-creacion-planes-comerciales.webm', desc: 'Creación y Configuración de Planes Comerciales' },
  { id: 2, file: 'record-02-pantalla.mjs', name: '02-alta-pantalla-kiosco.webm', desc: 'Alta y Configuración de Pantalla Kiosco' },
  { id: 3, file: 'record-03-cliente.mjs', name: '03-alta-cliente-y-asignacion.webm', desc: 'Alta de Cliente Comercial y Asignación de Recursos' },
  { id: 4, file: 'record-04-videos.mjs', name: '04-subida-videos-y-cuotas.webm', desc: 'Subida de Videos Publicitarios y Cuota de Rotación' },
  { id: 5, file: 'record-05-juegos.mjs', name: '05-programacion-juegos-arcade.webm', desc: 'Asignación y Programación de Juegos Arcade' },
  { id: 6, file: 'record-06-control-remoto.mjs', name: '06-control-remoto-hdmi-ota.webm', desc: 'Control Remoto HDMI-CEC y Actualizaciones OTA' },
  { id: 7, file: 'record-07-roles.mjs', name: '07-roles-admin-vs-cliente.webm', desc: 'Diferencia de Roles: Super Admin vs Cliente' },
  { id: 8, file: 'record-08-mantenimiento.mjs', name: '08-mantenimiento-y-bajas.webm', desc: 'Desasignación y Eliminación de Recursos' },
];

const OUT_DIR = path.resolve(__dirname, '../../docs/videos');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

console.log('================================================================');
console.log('🎬 INICIANDO SUITE DE GRABACIÓN AUTOMATIZADA: PORTAL MYPLAYAD');
console.log(`📁 Directorio de salida: ${OUT_DIR}`);
console.log(`🎯 Total de cápsulas a producir: ${VIDEOS.length}`);
console.log('================================================================\n');

const results = [];

for (const v of VIDEOS) {
  const scriptPath = path.join(__dirname, v.file);
  const outPath = path.join(OUT_DIR, v.name);
  console.log(`\n▶ [${v.id}/${VIDEOS.length}] Grabando: ${v.desc}...`);
  console.log(`  Script: ${v.file}`);

  const start = Date.now();
  try {
    execSync(`node "${scriptPath}"`, {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env },
    });
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    const size = fs.existsSync(outPath) ? (fs.statSync(outPath).size / 1024 / 1024).toFixed(2) : '0';
    console.log(`  ✅ Completado en ${duration}s | Archivo: ${v.name} (${size} MB)`);
    results.push({ ...v, success: true, duration, size });
  } catch (err) {
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    console.error(`  ❌ Error grabando ${v.name} tras ${duration}s`);
    results.push({ ...v, success: false, duration, error: err.message });
  }
}

console.log('\n================================================================');
console.log('📊 RESUMEN FINAL DE PRODUCCIÓN DE VIDEOS');
console.log('================================================================');
for (const r of results) {
  if (r.success) {
    console.log(`  ✓ ${r.name.padEnd(42)} [${r.size} MB] (${r.duration}s) - ${r.desc}`);
  } else {
    console.log(`  ✗ ${r.name.padEnd(42)} [FALLIDO] (${r.duration}s) - ${r.desc}`);
  }
}
console.log('================================================================\n');

