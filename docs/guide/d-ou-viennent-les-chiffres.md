# D'où viennent les chiffres

ZENKUU ne produit aucune donnée de marché. Il en affiche, et il dit toujours laquelle
vient d'où.

## Une source par classe d'actif

| Classe | Source | Secours |
|---|---|---|
| Cryptomonnaies | **CoinGecko** | Binance |
| Devises | **Frankfurter**, qui relaie les taux de référence de la BCE | — |
| Actions, ETF, indices, matières premières | **Yahoo Finance** | — |
| NFT | *aucune source gratuite retenue à ce jour* | — |

Le **secours** n'entre en jeu que si la source principale échoue, et seulement pour les
lectures qui s'y prêtent. Le nom affiché en bas de bloc est toujours celui qui a
réellement répondu.

## Les autres briques

| Ce que vous lisez | Source |
|---|---|
| Frais, valeur immobilisée, rendements des protocoles | **DefiLlama** |
| Indice de peur et d'avidité | **Alternative.me** |
| Indicateurs macroéconomiques | **Banque mondiale** |
| Pools de liquidité sur chaîne | **GeckoTerminal** |
| Actualités | les flux publics de CoinDesk, Cointelegraph, The Block, Decrypt, Bitcoin Magazine, CryptoSlate et d'autres |

Les actualités sont reprises **telles quelles** : titre, source, date, lien. ZENKUU ne
les résume pas et ne les qualifie pas — dire d'un article qu'il est « haussier » serait
une opinion présentée comme une donnée.

## La fraîcheur

Chaque bloc porte, en pied, le nom de sa source et la date du relevé. C'est cette
mention qui fait foi, pas l'heure à laquelle vous ouvrez la page.

Les durées de cache diffèrent selon ce que la donnée mesure : un cours se périme en
minutes, la liste des places qui négocient un actif bouge à l'échelle de la journée. Les
sources gratuites imposent par ailleurs des quotas ; le cache est ce qui permet de les
respecter sans dégrader l'affichage.

## Les mentions à ne pas confondre

* **« Source : X »** — qui publie le chiffre.
* **« données du … »** — quand le relevé a été fait.
* **« Signaler une donnée »** — un lien vers la page de cet actif **chez la source**. Une
  valeur fausse se corrige là-bas, pas ici : nous affichons ce qu'elle publie.

## Ce que la conversion de devise change

Le sélecteur de devise **convertit** un montant déjà coté. Un cours publié en dollars et
affiché en euros a traversé un taux de change du jour — ce n'est pas une cotation en
euros, et la différence compte dès qu'on compare deux actifs cotés dans deux monnaies.

Les graphiques rendus côté serveur restent dans la devise de la source, et leur note le
précise.

## Une limite qui revient souvent

Une source qui ne publie pas une mesure produit une **absence**, jamais un zéro. Voir
[Ce que ZENKUU fait, et ne fait pas](ce-que-zenkuu-fait.md) pour la liste des vides que
cette règle explique.
