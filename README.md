# Loup-Garou Online (Multijoueur)

Un jeu de Loup-Garou complet développé avec React, Node.js et Socket.io.

## 🚀 Lancement Rapide

1.  **Installation :**
    ```bash
    npm install
    ```

2.  **Démarrage (Mode Développement) :**
    ```bash
    npm start
    ```
    Le client sera accessible sur `http://localhost:5173` et le serveur sur `http://localhost:3001`.

## 🛠 Structure du Projet

- `client/` : Frontend React (Vite + Tailwind CSS).
- `server/` : Backend Node.js (Express + Socket.io).
- `shared/` : Types TypeScript partagés.

## 🌍 Déploiement (GitHub & Online)

Pour jouer avec d'autres personnes en ligne, vous devez héberger le serveur et le client.

### 1. Héberger le Serveur (Backend)
Vous pouvez utiliser des services gratuits comme **Render**, **Railway** ou **Fly.io**.
- Le serveur doit écouter sur `process.env.PORT`.
- Assurez-vous d'autoriser les CORS si nécessaire (actuellement configuré sur `*`).

### 2. Héberger le Client (Frontend)
Vous pouvez utiliser **GitHub Pages**, **Vercel** ou **Netlify**.
- **Important :** Dans les paramètres de votre hébergement frontend, vous devez définir la variable d'environnement `VITE_SOCKET_URL` avec l'URL de votre serveur backend hébergé.

### 3. GitHub
1. Créez un nouveau dépôt sur GitHub.
2. Initialisez git localement : `git init`.
3. Ajoutez les fichiers : `git add .`.
4. Commitez : `git commit -m "Initial commit"`.
5. Pushez vers GitHub.

## 🃏 Rôles Disponibles
- **Loups-Garous** : Doivent éliminer tous les villageois.
- **Voyante** : Peut voir le rôle d'un joueur chaque nuit.
- **Sorcière** : Possède des potions pour tuer ou sauver.
- **Villageois** : Doivent démasquer les loups.

## 💡 Notes Techniques
- Le jeu nécessite au moins **4 joueurs** pour démarrer.
- Les transitions entre la Nuit, le Jour et le Vote sont automatisées.
