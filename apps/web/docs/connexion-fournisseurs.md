# Connexion par fournisseur — ce qu'il reste à faire

Le code est en place et testé ; il manque les identifiants, que seul le propriétaire
du site peut créer. Tant qu'ils sont absents, les boutons s'affichent grisés avec la
mention « Bientôt » — c'est l'état exact des choses, et non une panne.

## Google

1. Ouvrir <https://console.cloud.google.com/apis/credentials>, créer un projet.
2. « Créer des identifiants » → « ID client OAuth » → type **Application Web**.
3. Dans **URI de redirection autorisés**, ajouter **exactement** :

   ```
   http://localhost:3000/api/auth/google/retour
   https://VOTRE-DOMAINE/api/auth/google/retour
   ```

   L'adresse doit correspondre au caractère près. Un écart produit
   `redirect_uri_mismatch`, dont le message ne dit pas laquelle des deux est fautive.

4. Reporter les deux valeurs dans `apps/web/.env.local` :

   ```
   GOOGLE_CLIENT_ID=…apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=…
   ```

L'écran de consentement demande une **portée** : `openid email` suffit, et c'est
exactement ce que le code demande. En demander plus ferait afficher au visiteur une
autorisation plus large que l'usage réel, ce qui fait renoncer — à juste titre.

## X (anciennement Twitter)

1. Ouvrir <https://developer.x.com/en/portal/dashboard>, créer une application.
2. Activer **OAuth 2.0**, type « Web App ». PKCE est obligatoire chez X ; le code
   l'applique déjà, aux deux fournisseurs.
3. **Callback URI** : `https://VOTRE-DOMAINE/api/auth/x/retour` (et la variante
   `localhost` pour le développement).
4. Reporter :

   ```
   X_CLIENT_ID=…
   X_CLIENT_SECRET=…
   ```

**À savoir** : l'API publique de X **ne donne pas** l'adresse électronique. Le code
fabrique donc un identifiant de compte de la forme `pseudo@x.zenkuu.local`. Ce n'est
pas une adresse joignable, et elle n'est jamais utilisée comme telle — elle sert
d'identifiant stable, seul rôle que ce site fait jouer à une adresse. Le domaine
`.local` étant réservé par la norme, aucune collision n'est possible avec un compte
créé par courriel.

## Apple

Volontairement laissé de côté : « Sign in with Apple » exige un compte développeur
Apple à 99 $/an. Le bouton est affiché mais inerte, ce qui annonce un chemin à venir
sans le promettre. Pour l'activer un jour, il faudra un *Services ID*, une clé privée
`.p8` et la génération d'un jeton client signé en ES256 — un mécanisme différent des
deux autres, à ajouter dans `lib/oauth.ts`.

## Vérifier que tout est branché

Après avoir renseigné les variables et **redémarré** le serveur de développement (les
variables d'environnement sont lues au démarrage) :

```sh
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" \
  "http://localhost:3000/api/auth/google?intention=signin"
```

- **307 vers `accounts.google.com`** → configuré, l'échange démarre.
- **307 vers `/?connexion=non-configuree`** → les variables ne sont pas lues.

## Pourquoi pas Auth.js

C'est la réponse par défaut à ce besoin, et elle est bonne dans le cas général. Elle
ne l'était pas ici : le site possède déjà son modèle de sessions — `createSession`,
`findSessionAccount`, `deleteAccountSessions` — et surtout `claimAnonymousData`, qui
verse dans le compte la liste de suivi et les alertes constituées avant toute
connexion.

Auth.js apporte son propre modèle de sessions. L'installer imposait soit de faire
cohabiter deux systèmes — deux cookies, deux tables, deux notions de « connecté » —,
soit de réécrire ce qui fonctionne, en emportant la reprise des données anonymes, qui
est la partie la plus délicate et la moins testable du parcours.

Ce que la bibliothèque aurait apporté tient en deux échanges HTTP et une protection
CSRF, soit le contenu de `lib/oauth.ts` — environ 150 lignes, sans dépendance
nouvelle, et branchées sur l'ouverture de session existante.
