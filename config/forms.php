<?php

return [
    'page_render_dpi' => (int) env('FORMS_PAGE_RENDER_DPI', 144),
    'output_disk' => env('FORMS_OUTPUT_DISK', 'forms_output'),
    'output_path_prefix' => env('FORMS_OUTPUT_PATH', 'generated'),
    'flatten_pdfs' => filter_var(env('FORMS_FLATTEN_PDFS', false), FILTER_VALIDATE_BOOL),
    'max_retries' => (int) env('FORMS_MAX_GENERATION_RETRIES', 2),
    'job_timeout' => 600,
    'job_queue' => 'forms',
    'application_code_prefix' => 'APP',
    'application_code_year_format' => 'Y',
];
