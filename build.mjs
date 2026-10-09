// Génère la version GitHub Pages (docs/index.html) à partir de jamais-zero.html,
// qui reste la source unique (c'est aussi le fichier publié sur claude.ai).
// Usage : node build.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const src = readFileSync('jamais-zero.html', 'utf8');
const split = src.indexOf('<style>');
if (split < 0) throw new Error('<style> introuvable dans jamais-zero.html');

// <title> et polices passent dans le <head>, le reste va dans le <body>.
const headExtra = src.slice(0, split).trim();
let body = src.slice(split);

// Les rappels pointent vers l'adresse GitHub du site, quelle qu'elle soit.
const APP_URL_LINE = /const APP_URL = '[^']*';/;
if (!APP_URL_LINE.test(body)) throw new Error('APP_URL introuvable dans jamais-zero.html');
body = body.replace(APP_URL_LINE, 'const APP_URL = location.origin + location.pathname;');

// Active le bloc « Activer les notifs », qui n'a de sens que sur la version GitHub.
const WEB_FLAG = 'const IS_WEB_BUILD = false;';
if (!body.includes(WEB_FLAG)) throw new Error('IS_WEB_BUILD introuvable dans jamais-zero.html');
body = body.replace(WEB_FLAG, 'const IS_WEB_BUILD = true;');

const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#090C17">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Jamais Zéro">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon-192.png" type="image/png">
<link rel="apple-touch-icon" href="icon-180.png">
${headExtra}
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
${body}
<script>if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});</script>
</body>
</html>
`;

mkdirSync('docs', { recursive: true });
writeFileSync('docs/index.html', html);
console.log('docs/index.html généré');
