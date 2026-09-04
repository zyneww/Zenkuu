import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import type { AssetClass } from '@zenkuu/data'
import { getAsset } from '@zenkuu/data'

import { extremeMessage, getMetric, metricHref } from '@/lib/asset-metrics'
import { assetHref } from '@/lib/asset-routes'
import { getContent } from '@/lib/content'
import { pageAlternates } from '@/lib/site'

/**
 * Métadonnées d'une page d'actif.
 *
 * Le titre porte le nom réel : « Zenkuu | Bitcoin (BTC) » se reconnaît dans une
 * barre d'onglets encombrée, là où « Zenkuu | Cryptomonnaies » serait identique pour
 * les milliers de fiches — et sans valeur pour le référencement, qui est le premier
 * moteur d'acquisition du site (§9).
 *
 * Factorisé ici plutôt que dupliqué dans les six routes : ces fichiers ne doivent
 * contenir que du câblage, pour qu'une correction ne s'applique qu'à un seul endroit.
 */
export async function buildAssetMetadata(
  assetClass: AssetClass,
  id: string,
): Promise<Metadata> {
  const fr = await getContent()
  const asset = await getAsset(id, assetClass, 'eur')

  if (!asset.ok) {
    // Actif inconnu ou source en panne : pas de titre inventé, et surtout pas
    // d'indexation d'une page qui n'a rien à montrer.
    return { title: fr.asset.notFoundTitle, robots: { index: false } }
  }

  const { name, symbol, description } = asset.data
  const title = `${name} (${symbol})`

  return {
    title,
    description: description
      ? description.slice(0, 155)
      : `Cours, capitalisation et statistiques de ${name} sur ${fr.site.name}.`,
    /*
     * ⚠️ LES FICHES N'AVAIENT NI CANONIQUE NI TRADUCTIONS, ET ELLES SONT LA MAJORITÉ
     * DU SITE.
     *
     * Faute de bloc `alternates`, elles héritaient de celui du layout — dont la table
     * `languages` est calculée pour `/`. Mesuré sur `/crypto/bitcoin` : la version
     * française annoncée était `http://…/fr`, l'ACCUEIL. Un moteur à qui l'on désigne
     * la mauvaise traduction ne relie pas les deux pages ; il conclut simplement que
     * la déclaration est fausse, et treize fiches Bitcoin restent orphelines les unes
     * des autres.
     *
     * Le défaut existait avant le déménagement de langue — il n'en découle pas — mais
     * il portait sur des milliers de pages, et c'est ici qu'il se corrige une fois.
     */
    alternates: await pageAlternates(assetHref(assetClass, id)),
    openGraph: {
      title: `${fr.site.name} | ${title}`,
      description: `Cours et statistiques de ${name} — plateforme d’analyse en lecture seule.`,
    },
  }
}

/**
 * Métadonnées d'une page de métrique.
 *
 * Le titre combine la MESURE et l'ACTIF — « Capitalisation de Bitcoin (BTC) » — parce
 * que c'est exactement la requête qu'on tape. Un titre générique du type « Métrique »
 * rendrait interchangeables des milliers de pages et gaspillerait la seule chose que
 * ces pages apportent au référencement : leur spécificité (§9).
 *
 * La description reprend l'EXPLICATION de la métrique et non un texte de remplissage.
 * C'est du texte durable, contrairement aux nombres de la fiche qui changent toutes
 * les heures — c'est précisément ce qui justifie ces pages.
 */
export async function buildMetricMetadata(
  assetClass: AssetClass,
  id: string,
  slug: string,
): Promise<Metadata> {
  const fr = await getContent()
  const metric = getMetric(slug)

  // Slug hors registre : la page répondra 404, la métadonnée ne doit surtout pas
  // laisser croire l'inverse à un robot qui l'aurait atteinte autrement.
  if (!metric) return { title: fr.asset.notFoundTitle, robots: { index: false } }

  const [asset, t] = await Promise.all([
    getAsset(id, assetClass, 'eur'),
    getTranslations('metric'),
  ])

  if (!asset.ok) return { title: fr.asset.notFoundTitle, robots: { index: false } }

  const message =
    metric.message === 'ath' || metric.message === 'atl'
      ? extremeMessage(metric.message, assetClass)
      : metric.message

  const label = t(`${message}.label`)
  const { name, symbol } = asset.data
  const title = `${label} — ${name} (${symbol})`

  return {
    title,
    description: t(`${message}.help`).slice(0, 155),
    /* Même lacune que sur les fiches, même remède — voir la note ci-dessus. */
    alternates: await pageAlternates(metricHref(assetClass, id, slug)),
    openGraph: {
      title: `${fr.site.name} | ${title}`,
      description: t(`${message}.help`).slice(0, 200),
    },
  }
}
