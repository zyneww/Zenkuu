import { Link } from '@/i18n/navigation'
import { ZenkuuWordmark } from '@/components/BrandMark'
import { LocaleBadge } from '@/components/settings/LocaleBadge'

import { DATA_SOURCES, FOOTER_COLUMNS, SOCIAL_LINKS } from '@/content/footer'
import { getContent } from '@/lib/content'

/**
 * Pied de page.
 *
 * L'avertissement « lecture seule » n'est pas décoratif : c'est ce qui matérialise
 * le positionnement du §1 et tient ZENKUU à distance du conseil en investissement.
 * Il reste donc en bas de CHAQUE page, y compris les fiches d'actif, là où les
 * plateformes d'échange placent au contraire leur bouton d'achat.
 */
export async function Footer() {
  const fr = await getContent()
  const year = new Date().getFullYear()

  return (
    <footer className="mt-16 border-t border-border-subtle bg-surface-muted">
      <div className="shell py-10">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-6">
          {/* Bloc d'identité, sur deux colonnes pour laisser respirer la marque. */}
          <div className="col-span-2 lg:col-span-2">
            {/*
              MÊME DESSIN QUE L'EN-TÊTE, en plus grand.

              La marque était ici composée en DEUX morceaux — une silhouette en masque
              CSS, plus le mot « Zenkuu » écrit en texte — puis en deux PNG de thème.
              Les deux montages avaient le même défaut : deux représentations d'une
              seule marque, qui finissent toujours par diverger.

              Il n'en reste qu'une, partagée avec l'en-tête, qui prend l'encre du thème
              par `currentColor`. Voir components/BrandMark.tsx.
            */}
            <Link
              href="/"
              className="inline-flex items-center text-ink"
              aria-label={fr.site.name}
            >
              <ZenkuuWordmark className="h-8 w-auto" />
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-muted">
              {fr.site.tagline}. {fr.footer.positioning}
            </p>

            <LocaleBadge hint={fr.footer.localeHint} />
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="mb-2.5 text-xs font-semibold text-ink">{column.title}</h2>
              <ul className="space-y-1.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-xs text-ink-muted transition-colors hover:text-brand-strong"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Bloc communauté rendu uniquement si des comptes existent réellement —
            cf. le commentaire de SOCIAL_LINKS. */}
        {SOCIAL_LINKS.length > 0 ? (
          <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border-subtle pt-6">
            <h2 className="text-xs font-semibold text-ink">{fr.footer.community}</h2>
            <ul className="flex flex-wrap items-center gap-2">
              {SOCIAL_LINKS.map((link) => {
                const Icon = link.icon
                return (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-card border border-border-subtle bg-surface px-2.5 py-1.5 text-xs text-ink-muted transition-colors hover:border-brand hover:text-brand-strong"
                      aria-label={`${link.label} — ${link.handle}`}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      {link.handle}
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}

        <div className="mt-8 space-y-3 border-t border-border-subtle pt-6">
          <p className="text-xs leading-relaxed text-ink-muted">{fr.footer.disclaimer}</p>

          <p className="text-[0.6875rem] text-ink-muted">
            {fr.footer.dataNote}{' '}
            {DATA_SOURCES.map((source, index) => (
              <span key={source.href}>
                {index > 0 ? ' · ' : ''}
                <a
                  href={source.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-brand-strong"
                >
                  {source.label}
                </a>
              </span>
            ))}
          </p>

          {/*
            Attribution EXIGÉE par les CGU de l'API CoinGecko (§4.1.4) : la mention
            « Powered by CoinGecko » doit apparaître dans une police lisible d'au
            moins 10 px, et cette obligation ne distingue pas le palier gratuit des
            offres payantes. Aucun plan n'autorise son retrait.

            D'où `text-xs` (12 px) et non la taille `0.6875rem` des lignes voisines :
            la contrainte est chiffrée, on garde une marge au-dessus du minimum.
          */}
          <p className="text-xs text-ink-muted">
            <a
              href="https://www.coingecko.com/en/api"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-brand-strong"
            >
              {fr.footer.poweredByCoinGecko}
            </a>
          </p>

          <p className="text-[0.6875rem] font-medium text-ink">{fr.footer.rights(year)}</p>
        </div>
      </div>
    </footer>
  )
}

