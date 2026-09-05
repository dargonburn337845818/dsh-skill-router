// Minimal client bundle builder for dsh-skill-router.
// Because the sandbox may not have tsdown's "unrun" dependency, we generate the
// browser ModuleLoader bundle directly from the TypeScript-compiled src/client.
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const src = readFileSync(resolve(root, 'lib/client/index.js'), 'utf8')

let code = src.replace("import { createElement, useEffect, useMemo, useRef, useState } from 'react';", "const { createElement, useEffect, useMemo, useRef, useState } = require('react');")
code = code.replace("export const inject = ['slots'];", "const inject = ['slots'];")
code = code.replace("export function apply(ctx)", "function apply(ctx)")

const bundle = `window.__ModuleLoader__.load({
  id: "@dsh-external/dsh-skill-router",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    ${code}
    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
`
writeFileSync(resolve(root, 'lib/client.js'), bundle)
console.log('client bundle written:', bundle.length, 'bytes')
