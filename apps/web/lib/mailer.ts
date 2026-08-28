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
 * l'interface — sans expéditeur configuré, la connexion par courriel n'est pas proposée
 * du tout, plutôt qu'acceptée puis silencieusement sans effet. Un code qui n'arrive
 * jamais est pire qu'une connexion absente : elle a été crue.
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
        // comme suspect par plusieurs filtres anti-pourriel, et un code de connexion
        // qui atterrit en indésirable ne connecte personne.
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

/*
 * ⚠️ LE GABARIT `alertEmail` A ÉTÉ SUPPRIMÉ AVEC LES ALERTES DE PRIX.
 *
 * Il mettait en forme le courriel envoyé au franchissement d'un seuil. La
 * fonctionnalité entière est partie : page, tâche planifiée, table, module d'accès.
 *
 * CE FICHIER RESTE, et il le faut : `sendMail` et `loginCodeEmail` servent les CODES DE
 * CONNEXION, qui n'ont rien à voir avec les alertes. `MAILER_ENABLED` garde le même
 * sens — « un expéditeur est-il configuré » — et commande désormais la seule connexion
 * par courriel.
 */

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
