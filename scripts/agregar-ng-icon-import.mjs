import fs from 'fs';
import path from 'path';

const root = path.join(process.cwd(), 'src', 'app');

function walk(dir, files = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, files);
    else if (e.name.endsWith('.ts') && !e.name.endsWith('.spec.ts')) files.push(p);
  }
  return files;
}

function tplPath(tsFile) {
  const base = tsFile.replace(/\.ts$/, '');
  for (const ext of ['.component.html', '.html']) {
    const p = base + ext;
    if (fs.existsSync(p)) return p;
  }
  const raw = fs.readFileSync(tsFile, 'utf8');
  const m = raw.match(/templateUrl:\s*['"]([^'"]+)['"]/);
  if (m) return path.join(path.dirname(tsFile), m[1]);
  return null;
}

let n = 0;
for (const file of walk(root)) {
  if (file.includes('shared' + path.sep) && file.includes('rb-icono')) continue;
  if (file.includes('rb-logo-marca')) continue;
  const tpl = tplPath(file);
  let content = '';
  if (tpl && fs.existsSync(tpl)) content += fs.readFileSync(tpl, 'utf8');
  const raw = fs.readFileSync(file, 'utf8');
  if (raw.includes('template:')) content += raw;
  if (!content.includes('ng-icon') && !content.includes('rb-logo-marca')) continue;
  if (!raw.includes('@Component')) continue;

  let c = raw;
  const needIcon = content.includes('ng-icon');
  const needLogo = content.includes('rb-logo-marca');

  if (needIcon && !c.includes('NgIconComponent')) {
    if (!c.includes("@ng-icons/core")) {
      c = c.replace(
        /^(import .+ from '@angular\/core';?\r?\n)/m,
        "$1import { NgIconComponent } from '@ng-icons/core';\n",
      );
      if (!c.includes("NgIconComponent")) {
        c = "import { NgIconComponent } from '@ng-icons/core';\n" + c;
      }
    } else if (!c.includes('NgIconComponent')) {
      c = c.replace(
        /from '@ng-icons\/core';/,
        "from '@ng-icons/core';\nimport { NgIconComponent } from '@ng-icons/core';",
      );
    }
  }

  if (needLogo && !c.includes('RbLogoMarcaComponent')) {
    const rel = path.relative(path.dirname(file), path.join(root, 'shared', 'rb-logo-marca.component')).replace(/\\/g, '/');
    const imp = rel.startsWith('.') ? rel : './' + rel;
    c = c.replace(
      /^(import .+ from '@angular\/core';?\r?\n)/m,
      `$1import { RbLogoMarcaComponent } from '${imp.replace(/\.ts$/, '')}';\n`,
    );
    if (!c.includes('RbLogoMarcaComponent')) {
      c = `import { RbLogoMarcaComponent } from '${imp.replace(/\.ts$/, '')}';\n` + c;
    }
  }

  const impMatch = c.match(/imports:\s*\[([\s\S]*?)\]/);
  if (impMatch) {
    let list = impMatch[1];
    if (needIcon && !list.includes('NgIconComponent')) list += ', NgIconComponent';
    if (needLogo && !list.includes('RbLogoMarcaComponent')) list += ', RbLogoMarcaComponent';
    c = c.replace(impMatch[0], `imports: [${list}]`);
  }

  if (c !== raw) {
    fs.writeFileSync(file, c, 'utf8');
    n++;
  }
}
console.log('Componentes actualizados:', n);
