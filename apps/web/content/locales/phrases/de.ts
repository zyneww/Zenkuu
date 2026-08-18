import type { Phrases } from '@/content/phrases'

/**
 * Phrasentabelle — Deutsch.
 *
 * Die Schlüssel sind die französischen Ausgangszeichenketten; siehe
 * `content/phrases.ts`. Ein fehlender Schlüssel fällt auf das Französische zurück und
 * nicht auf eine leere Zeichenkette — diese Datei darf also abschnittsweise wachsen,
 * ohne je eine Lücke auf einer Seite zu hinterlassen.
 */
export const dePhrases: Phrases = {
  /* ── Navigation ─────────────────────────────────────────────────────────── */
  Parcourir: 'Durchsuchen',
  Données: 'Daten',
  Analyse: 'Analyse',
  Actualités: 'Nachrichten',
  Plus: 'Mehr',

  Palmarès: 'Ranglisten',
  Classements: 'Ranglisten',
  'Le classement complet, page par page': 'Die vollständige Rangliste, Seite für Seite',
  'Nouvelles cryptomonnaies': 'Neue Kryptowährungen',
  'Les actifs référencés le plus récemment': 'Die zuletzt aufgenommenen Werte',
  'Activité du marché': 'Marktaktivität',
  'Places de cotation': 'Handelsplätze',
  'Où le marché s’échange, et avec quelle confiance':
    'Wo der Markt handelt — und wie vertrauenswürdig',
  'Places de dérivés': 'Derivatebörsen',
  'Où se portent les positions à effet de levier': 'Wo die gehebelten Positionen liegen',
  Nouveautés: 'Neuerungen',
  'Ce qui a changé récemment': 'Was sich zuletzt geändert hat',

  Visualisations: 'Diagramme',
  'Graphiques globaux': 'Globale Diagramme',
  'Capitalisation, dominance, secteurs et trésoreries':
    'Marktkapitalisierung, Dominanz, Sektoren und Unternehmensbestände',
  'Heatmap sectorielle': 'Sektor-Heatmap',
  'Les secteurs en un coup d’œil': 'Die Sektoren auf einen Blick',
  Indicateurs: 'Indikatoren',
  'Indice de sentiment': 'Stimmungsindex',
  'Fear & Greed du marché crypto': 'Fear & Greed des Kryptomarkts',
  'Carte macroéconomique': 'Makroökonomische Karte',
  'Inflation, chômage, dette : l’état des économies':
    'Inflation, Arbeitslosigkeit, Schulden: der Zustand der Volkswirtschaften',
  Outils: 'Werkzeuge',
  Screener: 'Screener',
  'Filtrer le marché sur vos critères': 'Den Markt nach eigenen Kriterien filtern',
  Comparateur: 'Vergleich',
  'Deux à quatre actifs côte à côte': 'Zwei bis vier Werte nebeneinander',
  Convertisseur: 'Umrechner',
  'Conversion entre actifs et devises': 'Umrechnung zwischen Werten und Währungen',

  'Toute l’actualité': 'Alle Nachrichten',
  Blog: 'Blog',
  'Le fil complet, toutes sources confondues': 'Der vollständige Feed, aus allen Quellen',
  'Analyses et coulisses du produit': 'Analysen und Einblicke hinter das Produkt',

  'Suivi du marché': 'Marktbeobachtung',
  'Ma liste de suivi': 'Meine Beobachtungsliste',
  'Les actifs rattachés à votre compte': 'Die Ihrem Konto zugeordneten Werte',
  'Mes alertes': 'Meine Alarme',
  'Un courriel au franchissement d’un seuil de prix':
    'Eine E-Mail, sobald eine Preisschwelle überschritten wird',
  'Mon compte': 'Mein Konto',
  'Liste de suivi, alertes et écrans, retrouvés partout':
    'Beobachtungsliste, Alarme und Filter — überall wiederzufinden',

  Apprendre: 'Lernen',
  'Comprendre les marchés, pas à pas': 'Märkte verstehen, Schritt für Schritt',
  'Bien démarrer': 'Erste Schritte',
  'Prendre en main ZENKUU en cinq minutes': 'ZENKUU in fünf Minuten kennenlernen',
  'Centre d’aide': 'Hilfezentrum',
  'Questions fréquentes et assistance': 'Häufige Fragen und Unterstützung',
  Ressources: 'Ressourcen',
  'Méthodologie & sources': 'Methodik & Quellen',
  'D’où viennent nos chiffres, et à quelle fréquence':
    'Woher unsere Zahlen stammen und wie oft sie erscheinen',
  'API & développeurs': 'API & Entwickler',
  'Accéder aux données par programme': 'Programmatischer Zugriff auf die Daten',
  ZENKUU: 'ZENKUU',
  'À propos': 'Über uns',
  'Notre positionnement et nos limites': 'Unsere Ausrichtung und unsere Grenzen',
  'Pourquoi ZENKUU': 'Warum ZENKUU',
  'Nos partis pris, et ce qu’on refuse de faire':
    'Unsere Entscheidungen — und was wir bewusst nicht tun',
  'Volumes et exposition, ou extrêmes du jour': 'Volumen und Exponierung, oder die Tagesextreme',

  /* ── Titres et chapeaux de page ─────────────────────────────────────────── */
  "Données de trading": "Handelsdaten",
  "L’activité du marché crypto en quatre plans : les agrégats mondiaux, la répartition du volume entre les places, l’exposition sur les produits dérivés, puis les mouvements de la période.": "Die Aktivität des Kryptomarkts aus vier Blickwinkeln: globale Kennzahlen, Verteilung des Volumens auf die Handelsplätze, Exponierung bei Derivaten und schließlich die Bewegungen des Zeitraums.",
  "Points marquants": "Höhepunkte",
  "Ce qui sort de l’ordinaire aujourd’hui : ce qu’on regarde, ce qui bouge, ce qui s’échange, ce qui apparaît.": "Was heute aus dem Rahmen fällt: was beobachtet wird, was sich bewegt, was gehandelt wird, was neu auftaucht.",
  "Comment les chiffres affichés sur ZENKUU sont collectés, vérifiés et présentés — et ce qu’ils ne disent pas.": "Wie die Zahlen auf ZENKUU erhoben, geprüft und dargestellt werden — und was sie nicht aussagen.",
  "Classements crypto": "Krypto-Ranglisten",
  "Quatre palmarès à confronter : ce qui monte, ce qui baisse, ce qui s’échange le plus, et ce qui tourne le plus vite au regard de sa taille.": "Vier Ranglisten zum Vergleich: was steigt, was fällt, was am meisten gehandelt wird und was sich gemessen an seiner Größe am schnellsten umschlägt.",
  "Deux à six actifs côte à côte, toutes classes confondues : trajectoires ramenées à une base commune, puis les chiffres qui les séparent.": "Zwei bis sechs Werte nebeneinander, über alle Anlageklassen hinweg: Verläufe auf eine gemeinsame Basis gebracht, danach die Zahlen, die sie unterscheiden.",
  "Carte thermique du marché": "Markt-Heatmap",
  "Le marché en un coup d’œil : la surface porte la capitalisation, la couleur porte la variation. Basculez entre les pièces et les secteurs, et cliquez un rectangle pour l’ouvrir.": "Der Markt auf einen Blick: die Fläche steht für die Marktkapitalisierung, die Farbe für die Veränderung. Wechseln Sie zwischen Coins und Sektoren und klicken Sie ein Rechteck an, um es zu öffnen.",
  "Dérivés": "Derivate",
  "Les contrats les plus actifs, leur intérêt ouvert et leur taux de financement. Un contrat perpétuel n’a pas d’échéance : son taux de financement est ce qui le raccroche au cours au comptant.": "Die aktivsten Kontrakte, ihr Open Interest und ihre Finanzierungsrate. Ein perpetueller Kontrakt hat keine Fälligkeit: seine Finanzierungsrate hält ihn am Kassakurs.",
  "Les trois cents actifs dont la source a relevé un cours pour la première fois le plus récemment, du plus récent au plus ancien. Ceux que nous suivons par ailleurs portent leur logo et mènent à leur fiche.": "Die dreihundert Werte, für die die Quelle zuletzt erstmals einen Kurs erfasst hat, vom neuesten zum ältesten. Diejenigen, die wir ohnehin verfolgen, tragen ihr Logo und führen zu ihrer Seite.",
  "Paramètres": "Einstellungen",
  "Vos réglages d’affichage, votre compte et l’origine des chiffres. ZENKUU n’exécute aucun ordre et ne détient aucun fonds : il n’y a ici ni moyen de paiement, ni limite de transaction, ni vérification d’identité — et rien à payer, le site n’ayant pas d’offre payante.": "Ihre Anzeigeeinstellungen, Ihr Konto und die Herkunft der Zahlen. ZENKUU führt keine Order aus und verwahrt keine Gelder: es gibt hier kein Zahlungsmittel, kein Transaktionslimit und keine Identitätsprüfung — und nichts zu bezahlen, denn die Website hat kein kostenpflichtiges Angebot.",
  "Les places de contrats perpétuels, classées par l’exposition qu’elles portent réellement — l’intérêt ouvert — et non par le volume qu’elles affichent. ZENKUU ne référence aucun carnet d’ordres et ne permet aucune transaction : ce registre situe l’activité, il n’y donne pas accès.": "Die Handelsplätze für perpetuelle Kontrakte, geordnet nach der tatsächlich getragenen Exponierung — dem Open Interest — und nicht nach dem ausgewiesenen Volumen. ZENKUU führt kein Orderbuch und ermöglicht keine Transaktion: dieses Verzeichnis verortet Aktivität, es gibt keinen Zugang dazu.",
  "Où s’échange le marché au comptant": "Wo der Kassamarkt handelt",
  "Les places d’échange classées par note de confiance, avec le volume qu’elles déclarent sur 24 heures et la part qu’il représente dans ce classement. ZENKUU ne référence aucun carnet d’ordres et ne permet aucune transaction : ce registre situe l’activité, il n’y donne pas accès.": "Die Handelsplätze nach Vertrauensnote geordnet, mit dem von ihnen gemeldeten 24-Stunden-Volumen und dessen Anteil an dieser Rangliste. ZENKUU führt kein Orderbuch und ermöglicht keine Transaktion: dieses Verzeichnis verortet Aktivität, es gibt keinen Zugang dazu.",
  "Tableau de bord": "Übersicht",
  "Vos actifs suivis et vos préférences d’affichage. ZENKUU n’exécute aucun ordre et ne détient aucun fonds : il n’y a donc ici ni solde, ni portefeuille, ni performance — seulement ce que vous avez choisi de suivre.": "Die von Ihnen verfolgten Werte und Ihre Anzeigeeinstellungen. ZENKUU führt keine Order aus und verwahrt keine Gelder: es gibt hier also weder Saldo noch Depot noch Wertentwicklung — nur das, was Sie zu verfolgen gewählt haben.",

  /* ── Compte ─────────────────────────────────────────── */
  "Se connecter": "Anmelden",
  "Vérification…": "Wird geprüft…",

  /* ── Parcourir les marchés ─────────────────────────────────────────── */
  "Parcourir les marchés": "Märkte durchsuchen",
  "Les sept marchés suivis, triables et paginés sur une seule page. Lecture seule : aucun ordre ne part d’ici.": "Die sieben verfolgten Märkte, sortierbar und seitenweise auf einer Seite. Nur Lesen: von hier geht keine Order hinaus.",
  "Classes d’actifs": "Anlageklassen",
  "Synthèse de la sélection affichée": "Zusammenfassung der angezeigten Auswahl",
  "Actifs affichés": "Angezeigte Werte",
  "Variation moyenne 24 h": "Durchschnittliche Veränderung 24 h",
  "En hausse": "Im Plus",
  "En baisse": "Im Minus",
  "Calculé sur {portée}, pas sur l’ensemble du marché.": "Berechnet auf {portée}, nicht auf dem gesamten Markt.",
  "Colonnes": "Spalten",
  "Favoris": "Favoriten",
  "Tous": "Alle",
  "Tendance": "Im Trend",
  "Gagnants": "Gewinner",
  "Perdants": "Verlierer",
  "L’ordre du classement, sans filtre": "Die Reihenfolge der Rangliste, ungefiltert",
  "Les plus fort taux de rotation — volume 24 h rapporté à la capitalisation": "Der höchste Umschlag — 24-Stunden-Volumen im Verhältnis zur Marktkapitalisierung",
  "Variation positive sur la période choisie": "Positive Veränderung im gewählten Zeitraum",
  "Variation négative sur la période choisie": "Negative Veränderung im gewählten Zeitraum",
  "Période de variation": "Veränderungszeitraum",
  "Variation sur 1 heure": "Veränderung über 1 Stunde",
  "Variation sur 24 heures": "Veränderung über 24 Stunden",
  "Variation sur 7 jours": "Veränderung über 7 Tage",
  "Variation sur 30 jours": "Veränderung über 30 Tage",
  "Variation sur 1 an": "Veränderung über 1 Jahr",
  "Filtrer cette page…": "Diese Seite filtern…",
  "Filtrer les actifs affichés sur cette page": "Die auf dieser Seite angezeigten Werte filtern",
  "Échangeables": "Handelbar",
  "Tous les actifs": "Alle Werte",
  "Tous les actifs de cette page, volume publié ou non": "Alle Werte dieser Seite, mit oder ohne veröffentlichtes Volumen",
  "Plus grandes capitalisations": "Größte Marktkapitalisierungen",
  "Plus forts volumes 24 h": "Höchste 24-Stunden-Volumen",
  "Plus fortes hausses": "Größte Gewinner",
  "Plus fortes baisses": "Größte Verlierer",
  "Plus fortes variations": "Größte Bewegungen",
  "À la hausse comme à la baisse": "Nach oben wie nach unten",
  "Métaux précieux": "Edelmetalle",
  "Énergie": "Energie",
  "Paires de référence": "Referenzpaare",

  /* ── Portée et onglets ─────────────────────────────────────────── */
  "Marchés": "Märkte",
  "Places": "Handelsplätze",
  "Perpétuels": "Perpetuals",
  "les {n} actifs de cette page": "die {n} Werte dieser Seite",
  "les {n} actifs suivis dans cette classe": "die {n} in dieser Klasse verfolgten Werte",

  /* ── Paliers de période ─────────────────────────────────────────── */
  "1 H": "1 Std.",
  "24 h": "24 Std.",
  "7 J": "7 T",
  "1 M": "1 M",
  "1 A": "1 J",

  /* ── Titres de page ─────────────────────────────────────────────── */
  'Places de produits dérivés': 'Derivate-Handelsplätze',
  'Widgets de marché': 'Markt-Widgets',
  'Cotations ZENKUU': 'ZENKUU-Kurse',
}
