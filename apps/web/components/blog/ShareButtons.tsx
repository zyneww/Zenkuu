'use client'

import { usePhrase } from '@/components/locale/ContentProvider'
import { Check, Link2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
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
  const t = usePhrase()
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
      <span className="text-xs font-medium text-ink-muted">{t('Partager')}</span>

      {/* `Button` de shadcn/ui, variante `outline` — le même dessin que les deux
          boutons bordés qu'il remplace, mais avec l'anneau de focus et l'état de
          survol du système.

          L'ICÔNE EST UN ENFANT, et non une prop. C'est la convention de shadcn/ui, et
          elle vaut mieux qu'une prop `iconLeading` ici : la position dans le JSX dit
          déjà de quel côté l'icône se pose, et le bouton n'a pas à connaître deux
          emplacements nommés. Les classes qui l'habillent (`size-4`, `shrink-0`) sont
          posées par le sélecteur `[&_svg]` du bouton, donc sans rien à écrire.

          Le second bouton passe par `asChild` : sa destination est externe, il doit
          rester un vrai `<a href>` — ouvrable dans un onglet, suivi par le
          navigateur — et non un bouton qui navigue en JavaScript. */}
      <Button size="sm" variant="outline" onClick={copyLink}>
        {copied ? <Check /> : <Link2 />}
        {copied ? 'Lien copié' : 'Copier le lien'}
      </Button>

      <Button asChild size="sm" variant="outline">
        <a
          href={`https://x.com/intent/post?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer nofollow"
        >
          Partager sur X<span className="sr-only"> {t('(nouvelle fenêtre)')}</span>
        </a>
      </Button>

      {/* Annonce du succès de la copie : le presse-papiers est silencieux, et le
          changement d'icône est invisible à la synthèse vocale. */}
      <span role="status" className="sr-only">
        {copied ? 'Lien de l’article copié dans le presse-papiers' : ''}
      </span>
    </div>
  )
}
