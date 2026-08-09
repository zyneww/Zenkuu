'use client'

import { Check, Link2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { SITE_URL } from '@/lib/site'

/**
 * Partage d'un article.
 *
 * DEUX destinations seulement — copier le lien, et partager sur X — là où une page
 * de blog en aligne couramment six. Le choix est délibéré : chaque bouton de réseau
 * social est un logo tiers posé sur la page pour un usage marginal, et la rangée de
 * pastilles colorées est l'un des ornements les plus sûrement identifiables d'un
 * gabarit (§3.1.1). Copier un lien couvre en réalité tous les usages.
 *
 * Aucun script tiers n'est chargé : les boutons officiels des réseaux sociaux
 * embarquent des traceurs qui suivent le lecteur d'un site à l'autre. Un simple lien
 * `intent` fait le même travail sans rien exposer.
 */
export function ShareButtons({ title, path }: { title: string; path: string }) {
  const [copied, setCopied] = useState(false)
  const url = `${SITE_URL}${path}`

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      // `clipboard` est refusé hors contexte sécurisé. L'URL reste dans la barre
      // d'adresse du navigateur : l'échec n'empêche personne de partager la page.
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-ink-muted">Partager</span>

      <button
        type="button"
        onClick={copyLink}
        className="inline-flex items-center gap-1.5 rounded-card border border-border-subtle bg-surface px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-brand hover:text-brand-strong"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-up" aria-hidden="true" />
        ) : (
          <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {copied ? 'Lien copié' : 'Copier le lien'}
      </button>

      <a
        href={`https://x.com/intent/post?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="inline-flex items-center gap-1.5 rounded-card border border-border-subtle bg-surface px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-brand hover:text-brand-strong"
      >
        Partager sur X
        <span className="sr-only">(nouvelle fenêtre)</span>
      </a>

      {/* Annonce du succès de la copie : le presse-papiers est silencieux, et le
          changement d'icône est invisible à la synthèse vocale. */}
      <span role="status" className="sr-only">
        {copied ? 'Lien de l’article copié dans le presse-papiers' : ''}
      </span>
    </div>
  )
}
