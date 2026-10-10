import fs from 'node:fs';
import path from 'node:path';

// The Home keeps exactly one application runtime. Only the unprefixed /
// landing page may also contain the tiny, parser-blocking locale bootstrap.
const BOOTSTRAP='data-f4-home-hero-locale-first-paint';
const HOME_RUNTIME='src="/r4-home-runtime.js"';
const LOCALES=['en','zh','ko'];

function executableScripts(html){
  return [...html.matchAll(/<script\b[^>]*>/gi)]
    .filter(match=>!/\btype\s*=\s*["']application\/json["']/i.test(match[0]))
    .map(match=>({tag:match[0],index:match.index}));
}

export function validateHomeScriptBoundary(rootHtml,outputDirectory){
  const errors=[];
  const rootScripts=executableScripts(rootHtml);
  const runtime=rootScripts.filter(entry=>entry.tag.includes(HOME_RUNTIME));
  const bootstrap=rootScripts.filter(entry=>entry.tag.includes(BOOTSTRAP));

  if(rootScripts.length!==2||runtime.length!==1||bootstrap.length!==1){
    errors.push(
      `Root Home permits exactly one Home Runtime and one locale bootstrap; `+
      `found ${rootScripts.length} executable scripts, ${runtime.length} runtimes, `+
      `${bootstrap.length} bootstraps.`
    );
  }

  if(bootstrap.length===1){
    const headClose=rootHtml.indexOf('</head>');
    const heroPreload=rootHtml.match(
      /<link\b[^>]*\brel="preload"[^>]*\bhref="\/images\/desktop\/home\/hero\/hero-main-en\.webp"[^>]*>/i
    );
    const beforeBody=headClose>=0&&bootstrap[0].index<headClose;
    const beforePreload=heroPreload&&bootstrap[0].index<rootHtml.indexOf(heroPreload[0]);
    const match=rootHtml.match(
      /<script\b[^>]*data-f4-home-hero-locale-first-paint[^>]*>([\s\S]*?)<\/script>/i
    );
    const script=match?.[1]||'';

    if(!beforeBody||!beforePreload){
      errors.push('Locale bootstrap must appear in <head> before the English desktop Hero preload.');
    }
    if(!script||Buffer.byteLength(script,'utf8')>620){
      errors.push('Locale bootstrap is missing or exceeds its 620-byte budget.');
    }
    for(const required of [
      "window.location.pathname!=='/'",
      "window.localStorage.getItem('productManualLang')",
      "language==='zh'||language==='ko'",
      'window.location.replace('
    ]){
      if(!script.includes(required)){
        errors.push('Locale bootstrap lost first-paint safety condition: '+required);
      }
    }
  }

  for(const locale of LOCALES){
    const file=path.join(outputDirectory,locale,'index.html');
    if(!fs.existsSync(file)){
      errors.push('Localized Home output is missing: '+locale+'/index.html');
      continue;
    }
    const html=fs.readFileSync(file,'utf8');
    const scripts=executableScripts(html);
    if(scripts.length!==1||!scripts[0]?.tag.includes(HOME_RUNTIME)){
      errors.push(
        locale+' Home must contain only the dedicated Home Runtime; found '+
        scripts.length+' executable scripts.'
      );
    }
    if(html.includes(BOOTSTRAP)){
      errors.push(locale+' Home must not contain the root-only locale bootstrap.');
    }
    const expected='/images/desktop/home/hero/hero-main-'+locale+'.webp';
    if(!html.includes('href="'+expected+'"')){
      errors.push(locale+' Home is missing its localized desktop Hero preload: '+expected);
    }
  }

  return errors;
}
