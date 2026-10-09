// Envoie une notif sans pitié sur le téléphone. Lancé par .github/workflows/notifs.yml.
// Secrets GitHub nécessaires : VAPID_PRIVATE et PUSH_SUBSCRIPTION (le code copié depuis l'appli).

const VAPID_PUBLIC = 'BPdKhJcNIpn2NNxrGfJU4NrRQLXtQKEBzXfeu8LdiehiwVE9bVfojerScxy_cm10ClN9-anhHGNyIw2EyZVJCMo';
const SITE = 'https://flocko12378.github.io/jamais-zero/';
const { VAPID_PRIVATE = '', PUSH_SUBSCRIPTION = '', SCHEDULE = '', MANUEL = 'false' } = process.env;

const PHRASES = {
  matin: [
    'Debout, feignasse. Une case avant le café.',
    'Ton réveil a sonné. Ta flemme aussi. Choisis.',
    'Toujours au lit ? Personne va le faire à ta place.',
    'La journée commence. Toi aussi, normalement.',
    'Lundi, mardi, peu importe. Aujourd\'hui, tu te bouges.',
    '50 pompes. Maintenant. Pas dans cinq minutes.'
  ],
  aprem: [
    'Il est 14 h. T\'as fait quoi depuis ce matin ?',
    'La moitié de la journée est passée. T\'as coché quoi ?',
    'Range ton tel. Va bosser.',
    'Si c\'est encore zéro, t\'as un problème. Règle-le.',
    'T\'as que ça dans le ventre ?',
    'T\'es pas fatigué, t\'es juste confortable.'
  ],
  soir: [
    'Il est 21 h 30. Coche tes cases ou assume ton zéro.',
    'C\'est pour ça qu\'elle t\'a quitté. Ouvre l\'appli.',
    'Encore une journée à zéro ? Il te reste deux heures.',
    'Dix pages avant de dormir. Pas de négo.',
    'T\'as fait quoi aujourd\'hui ? Sois honnête.',
    'T\'es une salope ou quoi ? Une case, maintenant.'
  ]
};
const SLOTS = { 8: 'matin', 14: 'aprem', 21: 'soir' };

const parisHour = d => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', hourCycle: 'h23' }).format(d));

// GitHub planifie en heure UTC : deux créneaux par notif (été / hiver), on ne garde que celui
// qui tombe à la bonne heure de Paris. Le retard habituel de GitHub ne change rien au calcul.
function slotFor(now) {
  if (MANUEL === 'true' || !SCHEDULE) {
    const h = parisHour(now);
    return h < 12 ? 'matin' : h < 18 ? 'aprem' : 'soir';
  }
  const utcHour = Number(SCHEDULE.trim().split(/\s+/)[1]);
  const offset = (parisHour(now) - now.getUTCHours() + 24) % 24;
  return SLOTS[(utcHour + offset) % 24] || null;
}

const slot = slotFor(new Date());
if (!slot) {
  console.log(`Créneau ${SCHEDULE} : pas la bonne heure à Paris aujourd'hui, rien à envoyer.`);
  process.exit(0);
}
console.log('Créneau :', slot);

if (!VAPID_PRIVATE || !PUSH_SUBSCRIPTION) {
  console.log('::warning::Secrets VAPID_PRIVATE et/ou PUSH_SUBSCRIPTION manquants. Active les notifs dans l\'appli et colle les secrets dans GitHub.');
  process.exit(0);
}

let subs;
try {
  subs = [].concat(JSON.parse(PUSH_SUBSCRIPTION));
} catch (e) {
  console.log('::error::PUSH_SUBSCRIPTION n\'est pas un code valide. Recopie-le depuis l\'appli (bouton « Copier mon code »).');
  process.exit(1);
}

const { default: webpush } = await import('web-push');
webpush.setVapidDetails('https://github.com/flocko12378/jamais-zero', VAPID_PUBLIC, VAPID_PRIVATE.trim());

const list = PHRASES[slot];
const payload = JSON.stringify({
  title: 'Jamais Zéro',
  body: list[Math.floor(Math.random() * list.length)],
  url: SITE,
  tag: 'jamais-zero-' + slot
});

let sent = 0;
for (const sub of subs) {
  try {
    await webpush.sendNotification(sub, payload, { TTL: 4 * 3600, urgency: 'high' });
    sent++;
  } catch (e) {
    if (e.statusCode === 404 || e.statusCode === 410) {
      console.log('::error::Ce téléphone n\'est plus abonné. Réactive les notifs dans l\'appli et recolle le code dans PUSH_SUBSCRIPTION.');
    } else {
      console.log(`::error::Envoi raté (${e.statusCode || '?'}) : ${e.body || e.message}`);
    }
  }
}
console.log(`${sent}/${subs.length} notif(s) envoyée(s).`);
if (!sent) process.exit(1);
