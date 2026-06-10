<?php

use App\Providers\AppServiceProvider;
use App\Providers\FacebookIntegrationServiceProvider;
use App\Providers\FortifyServiceProvider;
use App\Providers\HorizonServiceProvider;

return [
    AppServiceProvider::class,
    FacebookIntegrationServiceProvider::class,
    FortifyServiceProvider::class,
    HorizonServiceProvider::class,
];
