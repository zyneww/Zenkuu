import type { Phrases } from '@/content/phrases'

/**
 * Tabla de frases — español.
 *
 * Las claves son las cadenas fuente en francés; véase `content/phrases.ts`. Una clave
 * ausente recae en el francés y no en una cadena vacía, de modo que este archivo puede
 * crecer por secciones sin dejar nunca un hueco en una página.
 */
export const esPhrases: Phrases = {
  /* ── Navegación ─────────────────────────────────────────────────────────── */
  Parcourir: 'Explorar',
  Données: 'Datos',
  Analyse: 'Análisis',
  Actualités: 'Noticias',
  Plus: 'Más',

  Palmarès: 'Clasificaciones',
  Classements: 'Clasificaciones',
  'Le classement complet, page par page': 'La clasificación completa, página a página',
  'Nouvelles cryptomonnaies': 'Nuevas criptomonedas',
  'Les actifs référencés le plus récemment': 'Los activos incorporados más recientemente',
  'Activité du marché': 'Actividad del mercado',
  'Places de cotation': 'Plataformas de intercambio',
  'Où le marché s’échange, et avec quelle confiance':
    'Dónde se negocia el mercado, y con cuánta confianza',
  'Places de dérivés': 'Plataformas de derivados',
  'Où se portent les positions à effet de levier': 'Dónde se concentran las posiciones apalancadas',
  Nouveautés: 'Novedades',
  'Ce qui a changé récemment': 'Lo que ha cambiado recientemente',

  Visualisations: 'Gráficos',
  'Graphiques globaux': 'Gráficos globales',
  'Capitalisation, dominance, secteurs et trésoreries':
    'Capitalización, dominancia, sectores y tesorerías',
  'Heatmap sectorielle': 'Mapa de calor sectorial',
  'Les secteurs en un coup d’œil': 'Los sectores de un vistazo',
  Indicateurs: 'Indicadores',
  'Indice de sentiment': 'Índice de sentimiento',
  'Fear & Greed du marché crypto': 'Fear & Greed del mercado cripto',
  'Carte macroéconomique': 'Mapa macroeconómico',
  'Inflation, chômage, dette : l’état des économies':
    'Inflación, desempleo, deuda: el estado de las economías',
  Outils: 'Herramientas',
  Screener: 'Screener',
  'Filtrer le marché sur vos critères': 'Filtrar el mercado según sus criterios',
  Comparateur: 'Comparador',
  'Deux à quatre actifs côte à côte': 'De dos a cuatro activos uno al lado del otro',
  Convertisseur: 'Conversor',
  'Conversion entre actifs et devises': 'Conversión entre activos y divisas',

  'Toute l’actualité': 'Todas las noticias',
  Blog: 'Blog',
  'Le fil complet, toutes sources confondues': 'El hilo completo, con todas las fuentes',
  'Analyses et coulisses du produit': 'Análisis y entresijos del producto',

  'Suivi du marché': 'Seguimiento del mercado',
  'Ma liste de suivi': 'Mi lista de seguimiento',
  'Les actifs rattachés à votre compte': 'Los activos vinculados a su cuenta',
  'Mes alertes': 'Mis alertas',
  'Un courriel au franchissement d’un seuil de prix':
    'Un correo cuando se cruza un umbral de precio',
  'Mon compte': 'Mi cuenta',
  'Liste de suivi, alertes et écrans, retrouvés partout':
    'Lista de seguimiento, alertas y pantallas, disponibles en todas partes',

  Apprendre: 'Aprender',
  'Comprendre les marchés, pas à pas': 'Entender los mercados, paso a paso',
  'Bien démarrer': 'Primeros pasos',
  'Prendre en main ZENKUU en cinq minutes': 'Familiarizarse con ZENKUU en cinco minutos',
  'Centre d’aide': 'Centro de ayuda',
  'Questions fréquentes et assistance': 'Preguntas frecuentes y asistencia',
  Ressources: 'Recursos',
  'Méthodologie & sources': 'Metodología y fuentes',
  'D’où viennent nos chiffres, et à quelle fréquence':
    'De dónde vienen nuestras cifras, y con qué frecuencia',
  'API & développeurs': 'API y desarrolladores',
  'Accéder aux données par programme': 'Acceder a los datos mediante programación',
  ZENKUU: 'ZENKUU',
  'À propos': 'Acerca de',
  'Notre positionnement et nos limites': 'Nuestro posicionamiento y nuestros límites',
  'Pourquoi ZENKUU': 'Por qué ZENKUU',
  'Nos partis pris, et ce qu’on refuse de faire':
    'Nuestras decisiones, y lo que nos negamos a hacer',
  'Volumes et exposition, ou extrêmes du jour': 'Volúmenes y exposición, o los extremos del día',

  /* ── Titres et chapeaux de page ─────────────────────────────────────────── */
  "Données de trading": "Datos de negociación",
  "L’activité du marché crypto en quatre plans : les agrégats mondiaux, la répartition du volume entre les places, l’exposition sur les produits dérivés, puis les mouvements de la période.": "La actividad del mercado cripto desde cuatro ángulos: los agregados mundiales, el reparto del volumen entre plataformas, la exposición en derivados y los movimientos del periodo.",
  "Points marquants": "Lo más destacado",
  "Ce qui sort de l’ordinaire aujourd’hui : ce qu’on regarde, ce qui bouge, ce qui s’échange, ce qui apparaît.": "Lo que se sale de lo habitual hoy: lo que se mira, lo que se mueve, lo que se negocia, lo que aparece.",
  "Comment les chiffres affichés sur ZENKUU sont collectés, vérifiés et présentés — et ce qu’ils ne disent pas.": "Cómo se recogen, comprueban y presentan las cifras de ZENKUU, y qué es lo que no dicen.",
  "Classements crypto": "Clasificaciones cripto",
  "Quatre palmarès à confronter : ce qui monte, ce qui baisse, ce qui s’échange le plus, et ce qui tourne le plus vite au regard de sa taille.": "Cuatro clasificaciones para contrastar: lo que sube, lo que baja, lo que más se negocia y lo que más rota en relación con su tamaño.",
  "Deux à six actifs côte à côte, toutes classes confondues : trajectoires ramenées à une base commune, puis les chiffres qui les séparent.": "De dos a seis activos uno al lado del otro, de todas las clases: trayectorias llevadas a una base común y luego las cifras que los separan.",
  "Carte thermique du marché": "Mapa de calor del mercado",
  "Le marché en un coup d’œil : la surface porte la capitalisation, la couleur porte la variation. Basculez entre les pièces et les secteurs, et cliquez un rectangle pour l’ouvrir.": "El mercado de un vistazo: la superficie representa la capitalización y el color la variación. Alterne entre monedas y sectores, y haga clic en un rectángulo para abrirlo.",
  "Dérivés": "Derivados",
  "Les contrats les plus actifs, leur intérêt ouvert et leur taux de financement. Un contrat perpétuel n’a pas d’échéance : son taux de financement est ce qui le raccroche au cours au comptant.": "Los contratos más activos, su interés abierto y su tasa de financiación. Un contrato perpetuo no tiene vencimiento: su tasa de financiación es lo que lo ancla al precio al contado.",
  "Les trois cents actifs dont la source a relevé un cours pour la première fois le plus récemment, du plus récent au plus ancien. Ceux que nous suivons par ailleurs portent leur logo et mènent à leur fiche.": "Los trescientos activos cuyo primer precio registró la fuente más recientemente, del más nuevo al más antiguo. Los que además seguimos llevan su logotipo y enlazan a su ficha.",
  "Paramètres": "Ajustes",
  "Vos réglages d’affichage, votre compte et l’origine des chiffres. ZENKUU n’exécute aucun ordre et ne détient aucun fonds : il n’y a ici ni moyen de paiement, ni limite de transaction, ni vérification d’identité — et rien à payer, le site n’ayant pas d’offre payante.": "Sus ajustes de visualización, su cuenta y el origen de las cifras. ZENKUU no ejecuta ninguna orden ni custodia fondos: aquí no hay medio de pago, ni límite de transacción, ni verificación de identidad, y nada que pagar, ya que el sitio no tiene oferta de pago.",
  "Les places de contrats perpétuels, classées par l’exposition qu’elles portent réellement — l’intérêt ouvert — et non par le volume qu’elles affichent. ZENKUU ne référence aucun carnet d’ordres et ne permet aucune transaction : ce registre situe l’activité, il n’y donne pas accès.": "Las plataformas de contratos perpetuos, ordenadas por la exposición que realmente soportan —el interés abierto— y no por el volumen que declaran. ZENKUU no referencia ningún libro de órdenes ni permite ninguna transacción: este registro sitúa la actividad, no da acceso a ella.",
  "Où s’échange le marché au comptant": "Dónde se negocia el mercado al contado",
  "Les places d’échange classées par note de confiance, avec le volume qu’elles déclarent sur 24 heures et la part qu’il représente dans ce classement. ZENKUU ne référence aucun carnet d’ordres et ne permet aucune transaction : ce registre situe l’activité, il n’y donne pas accès.": "Las plataformas ordenadas por nota de confianza, con el volumen que declaran en 24 horas y la parte que representa en esta clasificación. ZENKUU no referencia ningún libro de órdenes ni permite ninguna transacción: este registro sitúa la actividad, no da acceso a ella.",
  "Tableau de bord": "Panel",
  "Vos actifs suivis et vos préférences d’affichage. ZENKUU n’exécute aucun ordre et ne détient aucun fonds : il n’y a donc ici ni solde, ni portefeuille, ni performance — seulement ce que vous avez choisi de suivre.": "Los activos que sigue y sus preferencias de visualización. ZENKUU no ejecuta ninguna orden ni custodia fondos: aquí no hay saldo, ni cartera, ni rentabilidad, solo lo que usted ha elegido seguir.",

  /* ── Compte ─────────────────────────────────────────── */
  "Se connecter": "Iniciar sesión",
  "Vérification…": "Verificando…",

  /* ── Parcourir les marchés ─────────────────────────────────────────── */
  "Parcourir les marchés": "Explorar los mercados",
  "Les sept marchés suivis, triables et paginés sur une seule page. Lecture seule : aucun ordre ne part d’ici.": "Los siete mercados que seguimos, ordenables y paginados en una sola página. Solo lectura: de aquí no sale ninguna orden.",
  "Classes d’actifs": "Clases de activos",
  "Synthèse de la sélection affichée": "Resumen de la selección mostrada",
  "Actifs affichés": "Activos mostrados",
  "Variation moyenne 24 h": "Variación media 24 h",
  "En hausse": "Al alza",
  "En baisse": "A la baja",
  "Calculé sur {portée}, pas sur l’ensemble du marché.": "Calculado sobre {portée}, no sobre el conjunto del mercado.",
  "Colonnes": "Columnas",
  "Favoris": "Favoritos",
  "Tous": "Todo",
  "Tendance": "Tendencia",
  "Gagnants": "Ganadores",
  "Perdants": "Perdedores",
  "L’ordre du classement, sans filtre": "El orden de la clasificación, sin filtro",
  "Les plus fort taux de rotation — volume 24 h rapporté à la capitalisation": "La mayor rotación: volumen 24 h en relación con la capitalización",
  "Variation positive sur la période choisie": "Variación positiva en el periodo elegido",
  "Variation négative sur la période choisie": "Variación negativa en el periodo elegido",
  "Période de variation": "Periodo de variación",
  "Variation sur 1 heure": "Variación en 1 hora",
  "Variation sur 24 heures": "Variación en 24 horas",
  "Variation sur 7 jours": "Variación en 7 días",
  "Variation sur 30 jours": "Variación en 30 días",
  "Variation sur 1 an": "Variación en 1 año",
  "Filtrer cette page…": "Filtrar esta página…",
  "Filtrer les actifs affichés sur cette page": "Filtrar los activos mostrados en esta página",
  "Échangeables": "Negociables",
  "Tous les actifs": "Todos los activos",
  "Tous les actifs de cette page, volume publié ou non": "Todos los activos de esta página, con o sin volumen publicado",
  "Plus grandes capitalisations": "Mayores capitalizaciones",
  "Plus forts volumes 24 h": "Mayores volúmenes 24 h",
  "Plus fortes hausses": "Mayores subidas",
  "Plus fortes baisses": "Mayores bajadas",
  "Plus fortes variations": "Mayores variaciones",
  "À la hausse comme à la baisse": "Tanto al alza como a la baja",
  "Métaux précieux": "Metales preciosos",
  "Énergie": "Energía",
  "Paires de référence": "Pares de referencia",

  /* ── Portée et onglets ─────────────────────────────────────────── */
  "Marchés": "Mercados",
  "Places": "Plataformas",
  "Perpétuels": "Perpetuos",
  "les {n} actifs de cette page": "los {n} activos de esta página",
  "les {n} actifs suivis dans cette classe": "los {n} activos seguidos en esta clase",

  /* ── Paliers de période ─────────────────────────────────────────── */
  "1 H": "1 H",
  "24 h": "24 H",
  "7 J": "7 D",
  "1 M": "1 M",
  "1 A": "1 A",
}
