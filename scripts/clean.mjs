#!/usr/bin/env node
/**
 * Purge des caches de build.
 *
 * POURQUOI CE SCRIPT EXISTE. Le `clean` précédent était `turbo run clean` — et aucun
 * paquet n'implémentait de tâche `clean`. La commande réussissait donc en ne faisant
 * rien, ce qui est la pire des deux options : une commande absente se remarque, une
 * commande qui ne fait rien se croit faite.
 *
 * Pendant ce temps, `.turbo/cache` avait atteint 32 Go — 387 entrées, une par
 * exécution de tâche. Turborepo écrit une entrée par empreinte des fichiers d'entrée
 * et n'en supprime jamais aucune ; il n'existe aucune option de purge automatique.
 * Le dossier étant ignoré par git, rien ne le signale : il grossit en silence jusqu'à
 * ce qu'on regarde la taille du projet.
 *
 * En Node plutôt qu'en `rm -rf` : les scripts de `package.json` sont exécutés par le
 * shell du système, et `rm` n'existe ni sous cmd.exe ni sous PowerShell. `fs.rm` est
 * le seul appel qui se comporte pareil sur les trois.
 *
 * `node_modules` n'est JAMAIS supprimé, même avec `--all` : la réinstallation est
 * longue et dépend du réseau, alors que tout le reste ici se régénère hors ligne en
 * quelques dizaines de secondes. Un script de nettoyage qui casse une session de
 * travail hors ligne n'est pas un service.
 */

import { readdir, rm, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const args = new Set(process.argv.slice(2))
const force = args.has('--force')
const keepNext = args.has('--keep-next')

/** Emplacements des caches, relatifs à la racine du dépôt. */
const WORKSPACE_GLOBS = ['apps', 'packages']

/**
 * Taille d'une arborescence, en octets.
 *
 * Mesurée AVANT suppression, pour que le script rende compte de ce qu'il a fait.
 * Un nettoyage muet laisse relancer la commande sans savoir si elle a servi.
 */
async function sizeOf(path) {
  let total = 0

  async function walk(current) {
    let entries
    try {
      entries = await readdir(current, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      const child = join(current, entry.name)
      // Les liens symboliques ne sont pas suivis : compter la cible gonflerait le
      // total, et `fs.rm` ne supprimera de toute façon que le lien.
      if (entry.isSymbolicLink()) continue
      if (entry.isDirectory()) {
        await walk(child)
      } else {
        try {
          total += (await stat(child)).size
        } catch {
          /* fichier disparu entre la lecture et la mesure — sans importance ici */
        }
      }
    }
  }

  await walk(path)
  return total
}

function human(bytes) {
  if (bytes < 1024) return `${bytes} o`
  const units = ['Ko', 'Mo', 'Go']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(value >= 10 ? 0 : 1).replace('.', ',')} ${units[unit]}`
}

/** Dossiers de cache à retirer, découverts plutôt que codés en dur. */
async function collectTargets() {
  const targets = [join(ROOT, '.turbo')]

  for (const group of WORKSPACE_GLOBS) {
    const base = join(ROOT, group)
    if (!existsSync(base)) continue

    let entries
    try {
      entries = await readdir(base, { withFileTypes: true })
    } catch {
      continue
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const pkg = join(base, entry.name)
      targets.push(join(pkg, '.turbo'))
      if (!keepNext) targets.push(join(pkg, '.next'))
      targets.push(join(pkg, 'dist'))
    }
  }

  return targets.filter((path) => existsSync(path))
}

/**
 * Le serveur de développement tient un verrou dans `.next/dev`.
 *
 * Supprimer `.next` sous un serveur vivant ne lève pas d'erreur franche : le serveur
 * continue de tourner en servant des morceaux qui n'existent plus, et les symptômes
 * — pages blanches, modules introuvables, rechargement à chaud figé — ressemblent à
 * des bugs applicatifs. Mieux vaut refuser et le dire.
 */
function devServerRunning() {
  return existsSync(join(ROOT, 'apps', 'web', '.next', 'dev', 'lock'))
}

const targets = await collectTargets()

if (targets.length === 0) {
  console.log('Rien à nettoyer — aucun cache de build présent.')
  process.exit(0)
}

const touchesNext = targets.some((path) => path.endsWith('.next'))

if (touchesNext && devServerRunning() && !force) {
  console.error(
    [
      'Un serveur de développement tourne (verrou trouvé dans apps/web/.next/dev).',
      '',
      'Supprimer .next sous un serveur vivant ne provoque pas d’erreur claire : il',
      'continue de servir des morceaux qui n’existent plus, et les symptômes',
      'ressemblent à des bugs applicatifs.',
      '',
      'Trois options :',
      '  • arrêter le serveur, puis relancer  bun run clean',
      '  • ne purger que les caches Turborepo :  bun run clean --keep-next',
      '  • forcer malgré tout :  bun run clean --force',
    ].join('\n'),
  )
  process.exit(1)
}

let freed = 0

for (const path of targets) {
  const size = await sizeOf(path)
  await rm(path, { recursive: true, force: true })
  freed += size
  console.log(`  supprimé  ${relative(ROOT, path).replace(/\\/g, '/')}  (${human(size)})`)
}

console.log(`\n${human(freed)} libérés sur ${targets.length} dossier${targets.length > 1 ? 's' : ''}.`)
