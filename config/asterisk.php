<?php

return [
    'host' => env('ASTERISK_HOST', 'localhost'),
    'port' => env('ASTERISK_PORT', '8088'),
    'username' => env('ASTERISK_USERNAME', 'admin'),
    'secret' => env('ASTERISK_SECRET', 'admin'),
    'recording_path' => env('ASTERISK_RECORDING_PATH', '/var/spool/asterisk/monitor'),
];
