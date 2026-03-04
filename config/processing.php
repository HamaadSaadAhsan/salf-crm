<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Processing Department — Visible Advisor Stages
    |--------------------------------------------------------------------------
    |
    | Leads whose advisor_stage matches any of these values will be visible
    | to users with the "processing" role. Change this array to widen or
    | narrow the processing department's lead visibility.
    |
    */

    'visible_advisor_stages' => [
        'meeting',
        'contract_signed',
        'initial_payment',
        'won',
    ],

];
