// Génère la version GitHub Pages (docs/) à partir de jamais-zero.html et programme.json,
// qui restent les sources uniques (ce sont aussi les fichiers publiés sur claude.ai).
// Usage : node build.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const src = readFileSync('jamais-zero.html', 'utf8');
const split = src.indexOf('<style>');
if (split < 0) throw new Error('<style> introuvable dans jamais-zero.html');

// <title> et polices passent dans le <head>, le reste va dans le <body>.
const headExtra = src.slice(0, split).trim();
let body = src.slice(split);

// Active le bloc « Activer les notifs », qui n'a de sens que sur la version GitHub.
const WEB_FLAG = 'const IS_WEB_BUILD = false;';
if (!body.includes(WEB_FLAG)) throw new Error('IS_WEB_BUILD introuvable dans jamais-zero.html');
body = body.replace(WEB_FLAG, 'const IS_WEB_BUILD = true;');

// Programme de muscu : on refuse de mettre en ligne un fichier cassé.
const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
let programme;
try {
  programme = JSON.parse(readFileSync('programme.json', 'utf8'));
} catch (e) {
  console.error('programme.json est cassé : ' + e.message + '\nVérifie les virgules et les guillemets autour de la ligne indiquée.');
  process.exit(1);
}
const problems = [];
const seances = programme && programme.seances;
if (!seances || typeof seances !== 'object') problems.push('il manque "seances".');
else for (const [sid, s] of Object.entries(seances)) {
  if (!ID_RE.test(sid)) problems.push(`séance "${sid}" : nom de séance invalide (lettres, chiffres, - et _ seulement).`);
  if (!s || !Array.isArray(s.exos) || !s.exos.length) { problems.push(`séance "${sid}" : il faut une liste "exos".`); continue; }
  const ids = new Set();
  s.exos.forEach((e, i) => {
    const where = `séance "${sid}", exo ${i + 1}`;
    if (!e || !ID_RE.test(e.id || '')) problems.push(`${where} : "id" manquant ou invalide.`);
    else if (ids.has(e.id)) problems.push(`${where} : "id" "${e.id}" déjà utilisé dans cette séance.`);
    else ids.add(e.id);
    if (!e || typeof e.nom !== 'string' || !e.nom.trim()) problems.push(`${where} : "nom" manquant.`);
    if (!e || !Number.isInteger(e.series) || e.series < 1 || e.series > 10) problems.push(`${where} : "series" doit être un nombre entier entre 1 et 10.`);
    const okReps = e && (e.unite === 's' || e.reps === 'max' || (Array.isArray(e.reps) && e.reps.length === 2 && e.reps.every(Number.isFinite) && e.reps[0] <= e.reps[1]));
    if (!okReps) problems.push(`${where} : "reps" doit être [min, max], "max", ou mets "unite": "s".`);
  });
}
if (problems.length) {
  console.error('programme.json a des erreurs :\n- ' + problems.join('\n- '));
  process.exit(1);
}

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
writeFileSync('docs/programme.json', JSON.stringify(programme, null, 2) + '\n');
console.log('docs/index.html et docs/programme.json générés');
