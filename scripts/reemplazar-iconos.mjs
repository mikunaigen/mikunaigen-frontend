import fs from 'fs';
import path from 'path';

const root = path.join(process.cwd(), 'src');
const map = {
  '/iconos/engranajes.png': 'heroCog6Tooth',
  '/iconos/consulta-informacion-azul.png': 'heroInformationCircle',
  '/iconos/destellos-recomendaciones.png': 'heroSparkles',
  '/iconos/error-rojo.png': 'heroXCircle',
  '/iconos/advertencia-amarillo.png': 'heroExclamationTriangle',
  '/iconos/correcto-check-verde.png': 'heroCheckCircle',
  '/iconos/lupa.png': 'heroMagnifyingGlass',
  '/iconos/candado.png': 'heroLockClosed',
  '/iconos/correo.png': 'heroEnvelope',
  '/iconos/ojo-abierto.png': 'heroEye',
  '/iconos/ojo-cerrado.png': 'heroEyeSlash',
  '/iconos/billetes-soles.png': 'heroBanknotes',
  '/iconos/like-pulgar.png': 'heroHandThumbUp',
  '/iconos/plato.png': 'heroBeaker',
  '/iconos/carrito-compras.png': 'heroShoppingCart',
  '/iconos/usuarios.png': 'heroUsers',
  '/iconos/dashboard.png': 'heroChartPie',
  '/iconos/documento.png': 'heroDocumentText',
  '/iconos/tacho.png': 'heroTrash',
  '/iconos/editar-lapiz.png': 'heroPencilSquare',
  '/iconos/agregar.png': 'heroPlus',
  '/iconos/camion-abastecer-ingrediente.png': 'heroTruck',
  '/iconos/estrella-amarilla.png': 'heroStar',
  '/iconos/estrella-gris.png': 'heroStar',
  '/iconos/logout.png': 'heroArrowRightOnRectangle',
  '/iconos/categoria-entrada.png': 'heroQueueList',
  '/iconos/categoria-plato-principal.png': 'heroBeaker',
  '/iconos/categoria-postres.png': 'heroCake',
  '/iconos/categoria-bebidas.png': 'heroBeaker',
  '/iconos/categoria-verduras.png': 'heroSparkles',
  '/iconos/categoria-carnes.png': 'heroFire',
  '/iconos/categoria-huevos.png': 'heroCircleStack',
  '/iconos/categoria-marinos.png': 'heroBeaker',
  '/iconos/categoria-abarrotes.png': 'heroArchiveBox',
  '/iconos/categoria-lacteos.png': 'heroBeaker',
  '/iconos/categoria-frutas.png': 'heroSparkles',
  '/iconos/categoria-panaderia.png': 'heroCake',
};

function walk(dir, files = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, files);
    else if (/\.(html|ts)$/.test(e.name) && !e.name.endsWith('.spec.ts')) files.push(p);
  }
  return files;
}

function replacePaths(content) {
  let c = content;
  for (const [png, hero] of Object.entries(map)) {
    c = c.split(png).join(hero);
    c = c.split(`'${png}'`).join(`'${hero}'`);
    c = c.split(`"${png}"`).join(`"${hero}"`);
  }
  c = c.replace(/assets\/no-image\.png/g, '');
  return c;
}

function imgToNgIcon(html) {
  return html.replace(
    /<img\s+([^>]*?)src="([^"]+)"([^>]*?)\/?>/gi,
    (full, before, src, after) => {
      if (!src.startsWith('hero')) return full;
      const w = full.match(/width="(\d+)"/i)?.[1] || '20';
      const cls =
        (full.match(/class="([^"]*)"/i)?.[1] || 'h-5 w-5') +
        ' text-secondary dark:text-blue-400';
      const alt = full.includes('estrella-gris') ? ' opacity-35' : '';
      return `<ng-icon name="${src}" size="${w}" class="${cls}${alt}" />`;
    },
  );
}

function imgBindingToNgIcon(html) {
  return html.replace(
    /<img\s+([^>]*?)\[src\]="([^"]+)"([^>]*?)\/?>/gi,
    (full, before, expr, after) => {
      const esHero =
        expr.includes('hero') ||
        expr.includes('c.img') ||
        expr.includes('iconoEstadoUltimo') ||
        expr.includes('p.icon') ||
        expr.includes('iconoModal') ||
        expr.includes('modal.tipo');
      if (!esHero) return full;
      const w = full.match(/width="(\d+)"/i)?.[1] || '20';
      let cls =
        (full.match(/class="([^"]*)"/i)?.[1] || 'h-5 w-5') +
        ' text-secondary dark:text-blue-400';
      cls = cls.replace(/object-contain/g, '').trim();
      const extra = full.includes('grayscale') ? ' [class.grayscale]="i > idxEstado()" [class.opacity-50]="i > idxEstado()"' : '';
      return `<ng-icon [name]="${expr}" size="${w}" class="${cls}"${extra} />`;
    },
  );
}

function imgSrcCatToNgIcon(html) {
  return html.replace(
    /<img\s+\[src\]="c\.img"[^>]*\/?>/gi,
    '<ng-icon [name]="c.img" size="20" class="h-5 w-5 text-secondary dark:text-blue-400" />',
  );
}

let changed = 0;
for (const file of walk(root)) {
  let c = fs.readFileSync(file, 'utf8');
  const orig = c;
  c = replacePaths(c);
  if (file.endsWith('.html')) {
    c = imgToNgIcon(c);
    c = imgBindingToNgIcon(c);
    c = imgSrcCatToNgIcon(c);
  }
  if (c !== orig) {
    fs.writeFileSync(file, c, 'utf8');
    changed++;
  }
}
console.log('Archivos actualizados:', changed);
