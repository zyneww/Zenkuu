/**
 * Envoi de courriel — Resend, en HTTP direct.
 *
 * ── POURQUOI PAS LE SDK `resend` ──────────────────────────────────────────────
 *
 * L'API tient en UN appel POST. Le SDK n'apporterait qu'un habillage de types autour
 * de ce même appel, au prix d'une dépendance de plus à suivre dans un projet qui en
 * compte volontairement peu. Le jour où l'on enverra des pièces jointes ou des lots,
 * la question se reposera — pas avant.
 *
 * ── DÉGRADATION, COMME PARTOUT AILLEURS ───────────────────────────────────────
 *
 * Même doctrine que les sources de marché et la base (§5) : sans clé, la
 * fonction ne lève pas, elle REFUSE en le disant. La conséquence est portée jusqu'à
 * l'interface — sans expéditeur configuré, les alertes ne sont pas proposées du tout,
 * plutôt qu'acceptées puis silencieusement jamais envoyées. Une alerte qui ne
 * prévient pas est pire qu'une alerte absente : elle a été crue.
 */

const apiKey = process.env.RESEND_API_KEY?.trim()
const from = process.env.ALERT_FROM_EMAIL?.trim()

export const MAILER_ENABLED = Boolean(apiKey && from)

export type MailResult = { ok: true } | { ok: false; reason: string }

export async function sendMail(input: {
  to: string
  subject: string
  html: string
  text: string
}): Promise<MailResult> {
  if (!apiKey || !from) {
    return { ok: false, reason: 'Service d’envoi non configuré' }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        // La version texte n'est pas une politesse : un message sans elle est noté
        // comme suspect par plusieurs filtres anti-pourriel, et une alerte de prix
        // qui atterrit en indésirable n'alerte personne.
        text: input.text,
      }),
    })

    if (!response.ok) {
      const detail = await response.text()
      return { ok: false, reason: `Refus du service d’envoi (${response.status}) : ${detail}` }
    }

    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'Échec de l’envoi',
    }
  }
}

/**
 * Gabarit d'une alerte franchie.
 *
 * Style EN LIGNE et tableau de mise en page : les clients de messagerie — Outlook au
 * premier chef — ignorent une bonne partie du CSS moderne, et une feuille de style
 * externe n'est jamais chargée. Ce qui ressemble ici à du HTML d'un autre âge est ce
 * qui s'affiche correctement partout.
 *
 * Aucune image, aucun pixel de suivi : le message doit s'afficher entier même avec le
 * chargement d'images bloqué, ce qui est le réglage par défaut de beaucoup de clients.
 */
export function alertEmail(input: {
  label: string
  symbol: string | null
  direction: 'above' | 'below'
  threshold: string
  price: string
  url: string
  /** Nom donné à l'alerte par son auteur. Absent ⇒ l'objet reprend le franchissement. */
  title?: string
  /** Note laissée à la création, recopiée telle quelle. */
  note?: string
}): { subject: string; html: string; text: string } {
  const sense = input.direction === 'above' ? 'dépassé' : 'est descendu sous'
  const headline =
    input.direction === 'above'
      ? `${input.label} a dépassé ${input.threshold}`
      : `${input.label} est descendu sous ${input.threshold}`

  const text = [
    headline,
    '',
    ...(input.note ? [`Votre note : ${input.note}`, ''] : []),
    `Cours relevé : ${input.price}`,
    `Seuil : ${input.threshold}`,
    '',
    `Voir la fiche : ${input.url}`,
    '',
    'Cette alerte est maintenant désarmée. Réarmez-la depuis vos alertes si vous voulez',
    'être prévenu au prochain franchissement.',
    '',
    'ZENKUU publie de l’information de marché. Ce message n’est pas un conseil en investissement.',
  ].join('\n')

  const html = `<!doctype html><html lang="fr"><body style="margin:0;padding:24px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#18181b;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e7;">
<tr><td style="padding:24px;">
<p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#71717a;">ZENKUU — alerte de prix</p>
<h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;font-weight:700;">${escapeHtml(headline)}</h1>
${input.note ? `<p style="margin:0 0 16px;padding:12px 14px;background:#f4f4f5;border-left:3px solid #3d63c2;font-size:14px;line-height:1.5;">${escapeHtml(input.note)}</p>` : ''}
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;font-size:14px;">
<tr><td style="padding:8px 0;border-bottom:1px solid #e4e4e7;color:#71717a;">Actif</td><td style="padding:8px 0;border-bottom:1px solid #e4e4e7;text-align:right;">${escapeHtml(input.label)}${input.symbol ? ` <span style="color:#71717a;">${escapeHtml(input.symbol.toUpperCase())}</span>` : ''}</td></tr>
<tr><td style="padding:8px 0;border-bottom:1px solid #e4e4e7;color:#71717a;">Cours relevé</td><td style="padding:8px 0;border-bottom:1px solid #e4e4e7;text-align:right;font-weight:600;">${escapeHtml(input.price)}</td></tr>
<tr><td style="padding:8px 0;color:#71717a;">Seuil ${escapeHtml(sense === 'dépassé' ? 'haut' : 'bas')}</td><td style="padding:8px 0;text-align:right;">${escapeHtml(input.threshold)}</td></tr>
</table>
<p style="margin:24px 0 0;"><a href="${escapeHtml(input.url)}" style="display:inline-block;background:#3d63c2;color:#ffffff;text-decoration:none;padding:10px 20px;font-size:14px;font-weight:500;">Voir la fiche</a></p>
<p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#71717a;">Cette alerte est maintenant désarmée. Réarmez-la depuis vos alertes si vous voulez être prévenu au prochain franchissement.</p>
<p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#a1a1aa;">ZENKUU publie de l’information de marché. Ce message n’est pas un conseil en investissement.</p>
</td></tr></table></body></html>`

  return { subject: input.title ? `ZENKUU — ${input.title}` : `ZENKUU — ${headline}`, html, text }
}

/**
 * Gabarit du CODE DE CONNEXION.
 *
 * ── POURQUOI UN CODE ET NON UN LIEN ───────────────────────────────────────────
 *
 * Un lien magique se clique dans le client de messagerie, qui l'ouvre dans SON
 * navigateur — souvent pas celui où la demande a été faite. L'utilisateur se retrouve
 * connecté dans une fenêtre qu'il n'a pas ouverte, et déconnecté dans celle où il
 * était. Un code à recopier ferme la session là où elle a été demandée, ce qui est
 * l'endroit où il attend le résultat.
 *
 * Les liens sont aussi préchargés par certains scanners de sécurité d'entreprise, ce
 * qui consomme le jeton avant que le destinataire ne l'ait vu.
 */
export function loginCodeEmail(input: {
  code: string
  minutes: number
}): { subject: string; html: string; text: string } {
  const text = [
    `Votre code de connexion ZENKUU : ${input.code}`,
    '',
    `Il expire dans ${input.minutes} minutes et ne sert qu'une fois.`,
    '',
    'Si vous n’avez rien demandé, ignorez ce message : aucun compte n’a été créé ni',
    'modifié.',
  ].join('\n')

  const html = `<!doctype html><html lang="fr"><body style="margin:0;padding:24px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#18181b;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e7;">
<tr><td style="padding:24px;">
<p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#71717a;">ZENKUU — connexion</p>
<h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;font-weight:700;">Votre code de connexion</h1>
<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#3f3f46;">Recopiez ce code dans la fenêtre de connexion restée ouverte&nbsp;:</p>
<p style="margin:0 0 20px;font-size:32px;letter-spacing:.24em;font-weight:700;font-family:ui-monospace,'SF Mono',Menlo,monospace;">${escapeHtml(input.code)}</p>
<p style="margin:0;font-size:13px;line-height:1.6;color:#71717a;">Il expire dans ${input.minutes} minutes et ne sert qu’une fois.</p>
<p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#a1a1aa;">Si vous n’avez rien demandé, ignorez ce message : aucun compte n’a été créé ni modifié.</p>
</td></tr></table></body></html>`

  return { subject: `ZENKUU — code de connexion ${input.code}`, html, text }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
