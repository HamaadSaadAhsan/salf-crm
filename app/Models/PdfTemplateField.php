<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PdfTemplateField extends Model
{
    use HasFactory;

    protected $fillable = [
        'pdf_template_id',
        'field_name',
        'field_label',
        'field_type',
        'field_options',
        'lead_field_mapping',
        'default_value',
        'sort_order',
        'page_number',
        'section',
        'repeat_group',
        'is_required',
    ];

    protected $casts = [
        'field_options' => 'array',
        'is_required' => 'boolean',
        'sort_order' => 'integer',
        'page_number' => 'integer',
    ];

    public function template(): BelongsTo
    {
        return $this->belongsTo(PdfTemplate::class, 'pdf_template_id');
    }
}
