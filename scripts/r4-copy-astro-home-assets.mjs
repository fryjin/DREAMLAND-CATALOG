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

console.log(
  '[R4 Astro Home Assets] copied images/desktop/home → .r4-astro-dist/images/desktop/home'
);
