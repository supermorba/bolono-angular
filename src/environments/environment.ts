/**
 * Configuration du back-office.
 *
 * - apiUrl : adresse de l'API Spring Boot (même backend que l'app mobile).
 * - firebase : projet Firebase « bolono-2026 », partagé avec l'app mobile.
 *   L'authentification du back-office passe par Firebase (e-mail + mot de
 *   passe) : le jeton obtenu est envoyé au backend, qui vérifie le rôle ADMIN.
 *
 *   ⚠️ Enregistrez une application **Web** dans la console Firebase
 *   (Paramètres du projet → Vos applications → Ajouter une application Web)
 *   et reportez ici son apiKey et son appId. La clé ci-dessous est celle de
 *   l'application Android : si elle est restreinte aux applications Android,
 *   Firebase refusera la connexion depuis un navigateur.
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080',
  firebase: {
    apiKey: 'AIzaSyBJx2ZiZJ_ZCZY4BlFNikYWXphRGGIKqIA',
    authDomain: 'bolono-2026.firebaseapp.com',
    projectId: 'bolono-2026',
    storageBucket: 'bolono-2026.firebasestorage.app',
    messagingSenderId: '876644842504',
    appId: '',
  },
};
