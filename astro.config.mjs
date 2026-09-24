import {defineConfig} from 'astro/config';

export default defineConfig({
  site:'https://dreamlandart.net',
  output:'static',
  srcDir:'./src/astro',
  outDir:'./.r4-astro-dist',
  publicDir:'./src/astro/public'
});
