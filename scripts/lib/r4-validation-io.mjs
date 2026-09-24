#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';

export function normalizeLogicalText(value){
  return String(
    value??''
  ).replace(
    /\r\n?/g,
    '\n'
  );
}

export function readLogicalText(file){
  return normalizeLogicalText(
    fs.readFileSync(
      file,
      'utf8'
    )
  );
}

export function logicalTextBytes(value){
  return Buffer.byteLength(
    normalizeLogicalText(
      value
    ),
    'utf8'
  );
}

export function physicalBytes(file){
  return fs.statSync(file).size;
}

export function hashLogicalTextFile(file){
  return crypto
    .createHash('sha256')
    .update(
      readLogicalText(file),
      'utf8'
    )
    .digest('hex');
}

export function hashPhysicalFile(file){
  return crypto
    .createHash('sha256')
    .update(
      fs.readFileSync(file)
    )
    .digest('hex');
}
