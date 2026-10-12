<?php

return [

    /*
    | Adresses qui reçoivent un e-mail à chaque nouvelle commande.
    | Plusieurs adresses possibles, séparées par des virgules : KOLA_NOTIFY_EMAIL=a@x.com,b@y.com
    */
    'notify_emails' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('KOLA_NOTIFY_EMAIL', '')),
    ))),

];
