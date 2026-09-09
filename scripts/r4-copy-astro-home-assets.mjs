#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

const source=
  path.join(
    ROOT,
    'images',
    'desktop',
    'home'
  );

const outputRoot=
  path.join(
    ROOT,
    '.r4-astro-dist'
  );

const target=
  path.join(
    outputRoot,
    'images',
    'desktop',
    'home'
  );

const mobileSource=
  path.join(ROOT,'images','shared','home','HOME001');

const mobileTarget=
  path.join(outputRoot,'images','shared','home','HOME001');

const runtimeSource=
  path.join(
    ROOT,
    'src',
    'astro',
    'runtime',
    'home-runtime.js'
  );

const runtimeTarget=
  path.join(
    outputRoot,
    'r4-home-runtime.js'
  );

if(!fs.existsSync(outputRoot)){
  console.error(
    '[R4 Astro Home Assets] output directory is missing: .r4-astro-dist'
  );
  process.exit(1);
}

if(!fs.existsSync(source)){
  console.error(
    '[R4 Astro Home Assets] source directory is missing: images/desktop/home'
  );
  process.exit(1);
}

if(!fs.existsSync(mobileSource)){
  console.error('[R4 Astro Home Assets] Mobile cover source is missing: images/shared/home/HOME001');
  process.exit(1);
}

if(!fs.existsSync(runtimeSource)){
  console.error(
    '[R4 Astro Home Assets] Home runtime source is missing: src/astro/runtime/home-runtime.js'
  );
  process.exit(1);
}

fs.rmSync(
  target,
  {
    recursive:true,
    force:true
  }
);

fs.mkdirSync(
  path.dirname(target),
  {
    recursive:true
  }
);

fs.cpSync(
  source,
  target,
  {
    recursive:true,
    force:true
  }
);

fs.rmSync(mobileTarget,{recursive:true,force:true});
fs.mkdirSync(path.dirname(mobileTarget),{recursive:true});
fs.cpSync(mobileSource,mobileTarget,{recursive:true,force:true});

fs.copyFileSync(
  runtimeSource,
  runtimeTarget
);

console.log(
  '[R4 Astro Home Assets] copied images/desktop/home → .r4-astro-dist/images/desktop/home'
);

console.log('[R4 Astro Home Assets] copied images/shared/home/HOME001 → .r4-astro-dist/images/shared/home/HOME001');

console.log(
  '[R4 Astro Home Runtime] copied src/astro/runtime/home-runtime.js → .r4-astro-dist/r4-home-runtime.js'
);
