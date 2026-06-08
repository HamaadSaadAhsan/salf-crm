<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect_uri' => env('GOOGLE_REDIRECT_URI', env('APP_URL').'/calendar/callback'),
    ],

    'gmail' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect_uri' => env('GMAIL_REDIRECT_URI', env('APP_URL').'/integrations/gmail/callback'),
    ],

    'google_drive' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_DRIVE_REDIRECT_URI', env('APP_URL').'/settings/storage-accounts/google-drive/callback'),
    ],

    'facebook' => [
        'api_version' => env('FACEBOOK_API_VERSION', 'v23.0'),
        'app_id' => env('FACEBOOK_APP_ID'),
        'app_secret' => env('FACEBOOK_APP_SECRET'),
        'redirect_uri' => env('FACEBOOK_REDIRECT_URI'),
        'webhook_url' => env('FACEBOOK_WEBHOOK_URL'),
        'webhook_verify_token' => env('FACEBOOK_WEBHOOK_VERIFY_TOKEN'),
    ],

    'python' => [
        'path' => env('PYTHON_PATH', 'python3'),
    ],

    'forms_service' => [
        'url' => env('FORMS_SERVICE_URL', 'http://127.0.0.1:8002'),
        'token' => env('FORMS_SERVICE_TOKEN'),
        'timeout' => (int) env('FORMS_SERVICE_TIMEOUT', 30),
    ],

    // Standalone Forms orchestration app (Laravel + Inertia) that took over
    // programs / templates / applications from this CRM. We talk to it over
    // HTTP, signing requests with a shared HS256 JWT.
    'forms_app' => [
        'url' => env('FORMS_APP_URL', 'https://forms-app.test'),
        'timeout' => (int) env('FORMS_APP_TIMEOUT', 15),
        // When true, LeadApplicationController forwards all lead-scoped
        // forms calls to the forms-app service instead of hitting the
        // CRM's local Application / ApplicationGeneration tables. Flip
        // off to revert to the legacy local behavior in an emergency.
        'proxy_lead_applications' => filter_var(env('FORMS_APP_PROXY_LEAD_APPLICATIONS', true), FILTER_VALIDATE_BOOL),
        'jwt' => [
            'secret' => env('FORMS_JWT_SECRET'),
            'issuer' => env('FORMS_JWT_ISSUER', 'salf-crm'),
            'audience' => env('FORMS_JWT_AUDIENCE', 'forms-app'),
            'ttl_seconds' => (int) env('FORMS_JWT_TTL_SECONDS', 300),
        ],
    ],

];
