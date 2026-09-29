# KOLA (Kōlā Collection)

Plateforme web de commande d'uniformes scolaires en République du Congo, pour les élèves de collège et lycée. Deux profils : **Parent** et **Élève**.

> Statut : maquette validée, version dynamique en cours (Supabase). Voir `CAHIER_DES_CHARGES.md` pour le périmètre complet.

## Fonctionnalités

- Inscription avec choix du rôle (Parent / Élève)
- Connexion : Google, SMS OTP, nom d'utilisateur + mot de passe
- Catalogue filtrable (collège / lycée / école)
- Panier et commande
- Historique des commandes
- Paiement Mobile Money **simulé**
- Pages À propos et Mentions légales

## Stack

- Front : HTML / CSS / JavaScript
- Backend : Supabase (Auth, PostgreSQL, Storage, Edge Functions)
- Polices : Fraunces (titres), Work Sans (texte)

## Structure du projet

Application monopage. Tout le back (auth, base, storage) est géré par Supabase — il n'y a pas de dossier serveur.

```
KOLA-Collection/
└── index.html   # application complète (HTML + CSS + JS)
```

Pas encore de dépôt Git : le projet est actuellement un fichier local, non versionné sur GitHub.

## Base de données

Tables : `profiles`, `products`, `orders`, `order_items`. RLS activée sur toutes les tables.

## Authentification

- Google OAuth
- SMS OTP
- Nom d'utilisateur + mot de passe, sans e-mail : l'Edge Function `register-user` crée le compte déjà confirmé via l'API admin, avec un e-mail interne dérivé du nom d'utilisateur.

## Installation

Aucune dépendance ni build à installer : `index.html` s'ouvre directement dans un navigateur, ou se sert avec n'importe quel serveur statique.

### Configuration Supabase

Les clés Supabase (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) sont utilisées directement dans `index.html` 

## Lancer en local

On ouvre `index.html` directement dans un navigateur, ou on sert le dossier avec un serveur statique simple, par exemple :

```bash
npx serve .
```

## Déploiement

Hébergé sur **Netlify**, déploiement manuel par glisser-déposer.

## Limites actuelles

- Paiement : simulation uniquement
- Mentions légales et réseaux sociaux : champs provisoires

## Identité visuelle

| Élément | Couleur |
|---|---|
| Marron chocolat | `#3D2E1F` |
| Crème | `#F7F2E9` |
| Terracotta (CTA) | `#C9622E` |
| Bleu nuit (hero) | `#1B2A4A` |

## Licence et contact

[À compléter]
