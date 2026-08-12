'use client'

import { useEffect, useRef } from 'react'

import { useSettings } from '@/lib/stores/settings'

/**
 * Graphique TradingView — la vue « avancée », montée à la demande.
 *
 * ── CE QU'ON GAGNE, ET CE QU'ON PERD ──────────────────────────────────────────
 *
 * TradingView apporte ce que notre graphique ne prétend pas offrir : une centaine
 * d'indicateurs, les outils de dessin, la comparaison multi-actifs, le carnet en
 * superposition. Le reconstruire représenterait des mois de travail pour un résultat
 * inférieur.
 *
 * En échange, cette vue N'EST PAS À NOUS. Elle arrive avec sa typographie, ses
 * couleurs, son menu contextuel et son logo — c'est la condition d'usage du widget
 * gratuit, et elle n'est pas négociable. C'est aussi pourquoi elle est une VUE parmi
 * quatre et non le graphique par défaut : la fiche doit rester la nôtre, et le
 * lecteur qui veut l'outil de trading le demande explicitement.
 *
 * ── LE SCRIPT NE SE CHARGE QU'AU CLIC ─────────────────────────────────────────
 *
 * L'embarqué de TradingView pèse plusieurs centaines de kilooctets et ouvre ses
 * propres connexions. Le poser en import statique le ferait voyager dans le paquet de
 * chaque visiteur de fiche, dont l'immense majorité ne l'ouvrira jamais. Le composant
 * n'étant monté que sur cette vue, le script ne part qu'à ce moment-là.
 *
 * ── PORTÉE : CRYPTO COTÉE CHEZ BINANCE ────────────────────────────────────────
 *
 * Le symbole est construit sur la même supposition que le reste du direct — `SOLUSDT`
 * chez Binance. Un symbole que TradingView ne connaît pas affiche son propre message
 * dans le cadre ; on ne peut pas l'intercepter depuis l'extérieur de l'iframe, et
 * c'est la limite assumée de cette intégration.
 */

const WIDGET_SCRIPT = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'

export function TradingViewChart({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { theme } = useSettings()

  /*
   * Le thème est passé au montage et ne peut plus changer ensuite : le widget lit sa
   * configuration une seule fois, à l'injection. Basculer le thème du site pendant
   * que cette vue est ouverte laisse donc le cadre dans son thème d'origine jusqu'au
   * prochain montage. C'est visible, mais le remède — remonter l'iframe à chaque
   * bascule — rechargerait plusieurs centaines de kilooctets et ferait perdre les
   * dessins en cours, ce qui serait pire.
   */
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Nettoyage AVANT injection : React réutilise le nœud entre deux symboles, et un
    // second script s'ajouterait au premier au lieu de le remplacer — deux graphiques
    // empilés dans le même cadre.
    container.innerHTML = ''

    const script = document.createElement('script')
    script.src = WIDGET_SCRIPT
    script.async = true
    script.type = 'text/javascript'
    script.innerHTML = JSON.stringify({
      symbol: `BINANCE:${symbol.toUpperCase()}USDT`,
      interval: '60',
      timezone: 'Europe/Paris',
      theme: theme === 'dark' ? 'dark' : 'light',
      style: '1',
      locale: 'fr',
      autosize: true,
      // Barre d'outils latérale et détails masqués : ils dupliquent ce que la fiche
      // affiche déjà à côté, et le cadre ne fait que 420 pixels de haut.
      hide_side_toolbar: false,
      allow_symbol_change: false,
      details: false,
      withdateranges: true,
    })

    container.appendChild(script)

    return () => {
      // Le widget laisse des écouteurs et une iframe derrière lui ; vider le conteneur
      // est le seul démontage que son API publique permette.
      container.innerHTML = ''
    }
  }, [symbol, theme])

  return (
    <div className="overflow-hidden rounded-card border border-border-subtle">
      <div ref={containerRef} className="h-[420px] w-full" />
      <p className="border-t border-border-subtle px-3 py-2 text-[0.6875rem] text-ink-muted">
        Graphique fourni par TradingView, sur la paire Binance. Les réglages de la barre
        d’outils ci-dessus ne s’y appliquent pas.
      </p>
    </div>
  )
}
