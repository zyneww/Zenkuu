/**
 * Les deux intentions d'authentification.
 *
 * Le type vivait dans `AuthOverlay`, une fenêtre modale supprimée depuis que la
 * connexion et l'inscription sont des PAGES (voir `AuthPageView`). Trois fichiers en
 * dépendaient : le laisser dans le composant aurait obligé à garder ce dernier en vie
 * pour deux mots.
 */
export type AuthMode = 'signin' | 'signup'
