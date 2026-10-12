<?php

/*
| Messages de validation en français (sous-ensemble des règles utilisées par l'API).
| Pour la liste complète : composer require laravel-lang/common --dev && php artisan lang:update
*/

return [
    'accepted' => 'Le champ :attribute doit être accepté.',
    'array' => 'Le champ :attribute doit être une liste.',
    'between' => [
        'numeric' => 'Le champ :attribute doit être compris entre :min et :max.',
        'string' => 'Le champ :attribute doit contenir entre :min et :max caractères.',
        'array' => 'Le champ :attribute doit contenir entre :min et :max éléments.',
        'file' => 'Le fichier :attribute doit peser entre :min et :max Ko.',
    ],
    'boolean' => 'Le champ :attribute doit être vrai ou faux.',
    'confirmed' => 'La confirmation du champ :attribute ne correspond pas.',
    'distinct' => 'Le champ :attribute contient un doublon.',
    'enum' => 'La valeur choisie pour :attribute est invalide.',
    'exists' => 'La valeur choisie pour :attribute est introuvable.',
    'file' => 'Le champ :attribute doit être un fichier.',
    'image' => 'Le champ :attribute doit être une image.',
    'in' => 'La valeur choisie pour :attribute est invalide.',
    'integer' => 'Le champ :attribute doit être un nombre entier.',
    'max' => [
        'numeric' => 'Le champ :attribute ne peut pas dépasser :max.',
        'string' => 'Le champ :attribute ne peut pas dépasser :max caractères.',
        'array' => 'Le champ :attribute ne peut pas contenir plus de :max éléments.',
        'file' => 'Le fichier :attribute ne peut pas dépasser :max Ko.',
    ],
    'mimes' => 'Le fichier :attribute doit être de type : :values.',
    'min' => [
        'numeric' => 'Le champ :attribute doit être au moins :min.',
        'string' => 'Le champ :attribute doit contenir au moins :min caractères.',
        'array' => 'Le champ :attribute doit contenir au moins :min élément(s).',
        'file' => 'Le fichier :attribute doit peser au moins :min Ko.',
    ],
    'numeric' => 'Le champ :attribute doit être un nombre.',
    'regex' => 'Le format du champ :attribute est invalide.',
    'required' => 'Le champ :attribute est obligatoire.',
    'string' => 'Le champ :attribute doit être un texte.',
    'unique' => 'Cette valeur de :attribute est déjà utilisée.',

    'attributes' => [
        'full_name' => 'nom et prénom',
        'username' => "nom d'utilisateur",
        'password' => 'mot de passe',
        'role' => 'profil',
        'items' => 'panier',
        'payment_method' => 'opérateur',
        'payment_phone' => 'numéro Mobile Money',
        'delivery_city' => 'ville de livraison',
        'delivery_address' => 'adresse de livraison',
        'name' => 'nom',
        'price' => 'prix',
        'ensemble' => 'ensemble',
        'cat' => 'catégorie',
        'sizes' => 'tailles',
        'niveaux' => 'niveaux',
        'image' => 'image',
        'sketch' => 'croquis',
        'images' => 'images',
        'hero_title' => 'titre principal',
        'status' => 'statut',
    ],
];
