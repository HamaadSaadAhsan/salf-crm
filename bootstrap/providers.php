<?php

use App\Providers\AppServiceProvider;
use App\Providers\FacebookIntegrationServiceProvider;
use App\Providers\HorizonServiceProvider;

return [
    AppServiceProvider::class,
    FacebookIntegrationServiceProvider::class,
    HorizonServiceProvider::class,
];
