'use client'

import { BookmarkPlus, Loader2, Trash2 } from 'lucide-react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { ButtonGroup } from '@/components/ui/button-group'
import { useEffect, useState, useTransition } from 'react'

import { IconButton } from '@/components/ui/IconButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import {
  listSavedScreens,
  removeScreen,
  storeScreen,
  type ScreenCriteria,
  type SavedScreenRow,
} from '@/lib/screen-actions'
import { usePhrase } from '@/components/locale/ContentProvider'

/**
 * Règle de nommage d'un écran.
 *
 * Elle vivait dans un `if (name === '') return` qui ne disait rien. Les deux cas sont
 * désormais nommés — un nom vide n'identifie rien, un nom de plus de quarante
 * caractères déborde de la pastille qui le portera — et chacun a son message.
 */
const screenSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Donnez un nom à cet écran pour le retrouver.')
    .max(40, 'Quarante caractères au plus — la pastille ne peut pas en afficher davantage.'),
})

type ScreenName = z.infer<typeof screenSchema>

/**
 * Barre des écrans de screener enregistrés.
 *
 * ── POURQUOI LA LISTE EST CHARGÉE APRÈS LE RENDU, ET NON PASSÉE EN PROPRIÉTÉ ──
 *
 * `/screener` est une page prérendue et mise en cache cinq minutes (elle apparaît
 * comme statique dans la sortie de build). Y injecter des données propres à
 * l'utilisateur la rendrait dynamique pour TOUT LE MONDE : chaque visiteur anonyme
 * paierait un rendu serveur pour une barre qu'il ne verra jamais, sur la page la plus
 * lourde du site en calcul client.
 *
 * La liste est donc demandée après l'hydratation, par une action serveur. Le coût est
 * un léger décalage d'apparition ; le gain est que la page reste servie depuis le
 * cache pour les 99 % de visiteurs qui n'ont pas d'écran enregistré.
 */
export function SavedScreens({
  criteria,
  onApply,
}: {
  /** Critères courants du screener — ce qui sera enregistré. */
  criteria: ScreenCriteria
  onApply: (criteria: ScreenCriteria) => void
}) {
  const t = usePhrase()
  const [all, setScreens] = useState<SavedScreenRow[]>([])

  /*
   * ── SEULS LES ÉCRANS DE CE MARCHÉ SONT MONTRÉS ─────────────────────────
   *
   * Un écran d'actions ne veut rien dire sur l'onglet des pools : ses clés de seuil
   * n'y existent pas, et le rejouer ne filtrerait rien tout en allumant un préréglage
   * inconnu. Le filtre est ici plutôt que dans l'action serveur : la liste complète
   * n'est demandée qu'une fois, et changer d'onglet ne doit pas la recharger.
   */
  const screens = all.filter((screen) => screen.criteria.market === criteria.market)
  const [naming, setNaming] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    // Sans base configurée, l'action renvoie un tableau vide : la barre reste alors
    // réduite à son bouton d'enregistrement, qui explique au clic.
    void listSavedScreens().then(setScreens)
  }, [])

  /*
   * Le formulaire de nommage — voir le schéma en tête de fichier.
   *
   * La règle ne s'applique qu'à la VALIDATION, pas à la frappe — c'est le défaut de
   * react-hook-form, et c'est le bon ici : reprocher un champ vide à quelqu'un qui
   * vient de l'ouvrir et n'a pas encore tapé une lettre serait absurde. L'erreur
   * s'efface ensuite dès la première correction.
   */
  const form = useForm<ScreenName>({
    resolver: zodResolver(screenSchema),
    defaultValues: { name: '' },
  })

  function save({ name }: ScreenName) {
    startTransition(async () => {
      const result = await storeScreen(name, criteria)

      if (!result.ok) {
        setMessage(
          result.reason === 'db-disabled'
            ? t('La base de données n’est pas configurée : l’écran ne serait pas conservé.')
            : t('L’enregistrement a échoué.'),
        )
        return
      }

      setMessage(null)
      setNaming(false)
      form.reset()
      setScreens(await listSavedScreens())
    })
  }

  function drop(id: number) {
    startTransition(async () => {
      await removeScreen(id)
      setScreens(await listSavedScreens())
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {screens.map((screen) => (
          /*
            ── `ButtonGroup` PLUTÔT QU'UN `<span>` QUI ENCADRE DEUX BOUTONS ───────

            Le montage manuel accolait les boutons en annulant leurs rayons
            (`rounded-r-none`, `rounded-l-none`) et en posant la bordure sur
            l'enveloppe. Il marchait, et il ne disait rien : deux boutons voisins
            restaient deux boutons indépendants pour une synthèse vocale, alors qu'ils
            portent ici sur le MÊME objet — appliquer cet écran, supprimer cet écran.

            `ButtonGroup` rend un `role="group"` étiqueté, et gère les rayons et les
            bordures internes par des sélecteurs de position. Les `rounded-*-none`
            posés à la main disparaissent avec lui, et un troisième bouton s'y
            insérerait sans qu'on ait à redistribuer les coins.
          */
          <ButtonGroup
            key={screen.id}
            aria-label={`Écran « ${screen.name} »`}
            className="rounded-card border border-border-subtle bg-surface"
          >
            {/* `ghost` sur les deux : la bordure et le fond appartiennent au groupe,
                qui fait de la paire un seul objet. Deux boutons `outline` y poseraient
                une seconde bordure à l'intérieur de la première. */}
            <Button size="xs" variant="ghost" onClick={() => onApply(screen.criteria)}>
              {screen.name}
            </Button>
            <IconButton
              size="icon-xs"
              variant="ghost"
              onClick={() => drop(screen.id)}
              disabled={pending}
              label={`Supprimer l’écran ${screen.name}`}
              icon={Trash2}
              className="border-l border-border-subtle hover:text-down"
            />
          </ButtonGroup>
        ))}

        {naming ? (
          /*
            ── LE NOM EST VALIDÉ, ET LE REFUS SE VOIT ────────────────────────────

            Le formulaire disait `if (name === '') return` : un nom vide ne
            produisait RIEN. Le bouton était cliquable, le clic partait, il ne se
            passait rien, et le lecteur n'avait aucun moyen de savoir si le champ
            était en cause ou si l'enregistrement avait échoué en silence.

            `Form` — c'est-à-dire `react-hook-form` habillé par shadcn/ui — remplace ce
            retour muet par un message SOUS le champ, relié par `aria-describedby`, et
            marque le champ `aria-invalid`. La règle vit dans un schéma `zod` plutôt
            que dans un `if` : elle nomme les deux cas — vide et trop long — que le
            `maxLength` du champ traitait par troncature silencieuse.

            ⚠️ `zod` ET `react-hook-form` ÉTAIENT DÉJÀ INSTALLÉS : ce sont les
            dépendances que `shadcn add form` a tirées. On ne paie donc rien de plus
            que l'usage.
          */
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(save)}
              className="inline-flex items-start gap-1"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="gap-1">
                    <FormLabel className="sr-only">{t('Nom de l’écran à enregistrer')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        size="sm"
                        autoFocus
                        maxLength={40}
                        placeholder={t('Nom de l’écran')}
                        className="w-40"
                      />
                    </FormControl>
                    <FormMessage className="text-micro" />
                  </FormItem>
                )}
              />

              <Button type="submit" size="sm" disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : null}
                Enregistrer
              </Button>
            </form>
          </Form>
        ) : (
          /* La bordure TIRETÉE est conservée par-dessus la variante `outline` : elle
             distingue « créer » de « appliquer » dans une rangée où les deux gestes se
             suivent, et aucune variante de shadcn/ui ne porte ce trait. */
          <Button
            size="xs"
            variant="outline"
            onClick={() => setNaming(true)}
            className="border-dashed ring-0 shadow-none border border-border-subtle"
          >
            <BookmarkPlus />
            {t('Enregistrer cet écran')}
          </Button>
        )}
      </div>

      {message ? (
        <p role="status" className="text-xs text-ink-muted">
          {message}
        </p>
      ) : null}
    </div>
  )
}
