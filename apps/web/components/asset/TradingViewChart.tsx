'use client'

import { useEffect, useRef } from 'react'

import { ASSET_CHART_HEIGHT } from '@/components/asset/chart-kinds'
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
 * ── LE SYMBOLE ARRIVE TRADUIT, IL N'EST PLUS CONSTRUIT ICI ───────────────────
 *
 * ⚠️ CE COMPOSANT FABRIQUAIT SON SYMBOLE : `BINANCE:${symbol}USDT`, la supposition du
 * reste du direct. C'est ce qui réservait le moteur externe à la crypto — sur une
 * action ou une matière première, la formule produisait un symbole que personne ne
 * cote. La traduction vit désormais dans `tradingview-symbol.ts`, qui sait nommer les
 * six classes et rend `null` pour ce qu'il ne sait pas nommer ; l'interrupteur de la
 * barre disparaît alors, et ce composant n'est jamais monté avec un symbole douteux.
 *
 * Il reçoit donc le symbole COMPLET, préfixe de place inclus, et ne le retouche pas.
 * Un symbole que TradingView ne connaît malgré tout pas affiche son propre message
 * dans le cadre ; on ne peut pas l'intercepter depuis l'extérieur de l'iframe, et
 * c'est la limite assumée de cette intégration.
 */

const WIDGET_SCRIPT = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'

export function TradingViewChart({
  symbol,
}: {
  /** Symbole COMPLET au format TradingView — « BINANCE:BTCUSDT », « COMEX:GC1! ». */
  symbol: string
}) {
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
      symbol,
      interval: '60',
      timezone: 'Europe/Paris',
      theme: theme === 'dark' ? 'dark' : 'light',
      style: '1',
      locale: 'fr',
      autosize: true,
      // La barre d'outils latérale de TradingView est CONSERVÉE : le cadre fait
      // désormais la hauteur du graphique maison (voir plus bas), ce qui lui laisse la
      // place de tenir ses outils de dessin sans écraser le tracé.
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
    /*
      ══════════════════════════════════════════════════════════════════════════
      LE CADRE FAIT LA MÊME HAUTEUR QUE LE GRAPHIQUE MAISON
      ══════════════════════════════════════════════════════════════════════════

      Il valait 420 pixels en dur, contre 569 pour notre tracé (`ASSET_CHART_HEIGHT`).
      Deux défauts en découlaient, et le second est le pire.

      DE TAILLE : 149 pixels de moins, soit un quart du cadre, pour la vue qu'on
      demande PRÉCISÉMENT quand on veut regarder le tracé de plus près. TradingView
      empile en plus sa propre barre de pas, sa légende et son axe temporel dans cette
      hauteur — il ne restait qu'environ 300 pixels de bougies.

      DE MOUVEMENT : basculer d'un moteur à l'autre faisait sauter la page de 149
      pixels, et tout ce qui suit le graphique avec elle. C'est exactement le décalage
      que `ASSET_CHART_HEIGHT` existe pour empêcher entre le tracé SVG du serveur et le
      canevas hydraté — la même raison vaut ici, et il suffisait de réutiliser la
      constante au lieu d'écrire un nombre.

      ⚠️ NE PAS REMETTRE UNE VALEUR EN DUR : les deux moteurs doivent lire le même
      nombre, sinon le saut revient.
    */
    <div className="overflow-hidden rounded-card border border-border-subtle">
      <div ref={containerRef} className="w-full" style={{ height: ASSET_CHART_HEIGHT }} />
      {/* ⚠️ CETTE LIGNE DISAIT « SUR LA PAIRE BINANCE », ET C'EST DEVENU FAUX.
          Elle datait du symbole construit en dur ; la traduction choisit désormais la
          place la plus active parmi celles que TradingView cote, et ce n'est Binance
          que pour une partie des actifs — sur Hyperliquid, c'est Bybit. On nomme donc
          le symbole EFFECTIVEMENT tracé, qui porte sa place en préfixe : c'est la
          seule formulation qui ne puisse pas mentir (§5). */}
      <p className="border-t border-border-subtle px-3 py-2 text-xs text-ink-muted">
        Graphique fourni par TradingView, sur {symbol}.
      </p>
    </div>
  )
}
