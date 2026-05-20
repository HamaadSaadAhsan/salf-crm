<?php

namespace App\Models\Forms;

use App\Enums\Forms\FieldType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TemplateField extends Model
{
    use HasFactory;

    protected $fillable = [
        'form_template_id',
        'field_name',
        'field_type',
        'page',
        'rect_pdf',
        'page_size_pdf',
        'export_values',
    ];

    protected function casts(): array
    {
        return [
            'field_type' => FieldType::class,
            'rect_pdf' => 'array',
            'page_size_pdf' => 'array',
            'export_values' => 'array',
        ];
    }

    public function formTemplate(): BelongsTo
    {
        return $this->belongsTo(FormTemplate::class);
    }
}
