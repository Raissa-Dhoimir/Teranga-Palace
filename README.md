# Hôtel Teranga Palace

Bienvenue dans le dépôt du projet **Teranga Palace**, une application web complète de gestion hôtelière et de réservation en ligne.

## 📝 Description

Teranga Palace est une plateforme web permettant aux clients de consulter les chambres disponibles, d'effectuer des réservations et de gérer leurs séjours. Elle intègre également un tableau de bord complet pour les administrateurs afin de gérer l'hôtel (chambres, réservations, facturation, statistiques).

L'application utilise une architecture frontend classique (HTML, CSS, JavaScript) couplée à un backend **Supabase** (PostgreSQL, Authentification, Row Level Security).

## ✨ Fonctionnalités

### Côté Client
*   **Consultation des chambres** : Parcourir les différentes chambres disponibles (types, prix, capacités).
*   **Réservation en ligne** : Effectuer une réservation pour des dates spécifiques (avec vérification anti-chevauchement).
*   **Espace Personnel (Dashboard)** : Suivre l'état de ses réservations, séjours et factures.
*   **Paiement** : Simulation de paiement pour régler les factures des séjours.
*   **Authentification** : Inscription et connexion sécurisées.

### Côté Administrateur
*   **Gestion des Chambres** : Ajouter, modifier, ou retirer des chambres (statut, prix, capacité).
*   **Gestion des Réservations et Séjours** : Valider, modifier ou annuler les réservations, gérer les check-ins/check-outs.
*   **Facturation** : Émettre et suivre l'état des factures et des paiements.
*   **Statistiques** : Vue d'ensemble sur l'activité de l'hôtel.

## 🛠️ Technologies Utilisées

*   **Frontend** : HTML5, CSS3 (Vanilla), JavaScript (ES6+).
*   **Backend & Base de données** : [Supabase](https://supabase.com/) (PostgreSQL).
*   **Polices** : Google Fonts (Inter).

## 🗂️ Structure du Projet

```text
Terangua Palace/
│
├── assetes/                # Images et ressources médias
├── css/
│   └── style.css           # Feuille de style principale
├── js/
│   ├── admin.js            # Logique du dashboard administrateur
│   ├── apercu-chambres.js  # Affichage des chambres sur l'accueil
│   ├── auth.js             # Logique d'authentification (Supabase Auth)
│   ├── chambres.js         # Logique de la page des chambres
│   ├── dashboard-client.js # Logique du dashboard client
│   ├── paiement.js         # Logique de simulation de paiement
│   ├── reservation.js      # Logique de création de réservation
│   ├── statistiques.js     # Logique des statistiques admin
│   └── supabase-config.js  # Configuration et initialisation de Supabase
│
├── index.html              # Page d'accueil
├── auth.html               # Page de connexion / inscription
├── chambres.html           # Page listant toutes les chambres
├── dashboard-client.html   # Espace client
├── dashboard-admin.html    # Espace administrateur
├── paiement.html           # Page de paiement
├── reservation.html        # Page de réservation
├── statistiques.html       # Page des statistiques admin
│
├── schema.sql              # Script SQL de création de la BDD et des politiques RLS
└── cahier_de_charge2.rtf   # Cahier des charges du projet
```

## 🚀 Installation et Configuration

1. **Cloner le dépôt** (ou télécharger les fichiers).
2. **Configuration Supabase** :
    *   Créez un projet sur Supabase.
    *   Exécutez le script SQL présent dans `schema.sql` dans le SQL Editor de Supabase pour créer les tables et les politiques de sécurité (RLS).
    *   Récupérez votre **URL de projet** et votre **Clé API (anon/public)**.
3. **Lien avec le Frontend** :
    *   Ouvrez le fichier `js/supabase-config.js`.
    *   Remplacez les valeurs par vos informations Supabase :
        ```javascript
        const supabaseUrl = 'VOTRE_URL_SUPABASE';
        const supabaseKey = 'VOTRE_CLE_ANON_SUPABASE';
        ```
4. **Lancement** :
    *   L'application étant composée de fichiers statiques, vous pouvez simplement ouvrir `index.html` dans votre navigateur ou utiliser un serveur local (comme Live Server sur VS Code) pour une meilleure expérience.

## 🔒 Sécurité (RLS)

La base de données est sécurisée par le **Row Level Security (RLS)** de PostgreSQL via Supabase :
*   Les clients ne peuvent accéder qu'à leurs propres données (profil, réservations, factures).
*   Seuls les administrateurs (utilisateurs ayant le rôle `admin` dans la table `profiles`) ont un accès total en lecture/écriture sur les chambres et les réservations de tous les clients.
*   Un système anti-chevauchement (via `EXCLUDE USING gist`) empêche la réservation d'une même chambre sur des dates qui se croisent.

---
*Projet développé dans le cadre de la gestion hôtelière.*
