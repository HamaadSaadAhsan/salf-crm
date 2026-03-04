<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadPdfSubmission extends Model
{
    use HasFactory;

    protected $fillable = [
        'lead_id',
        'pdf_template_id',
        'field_values',
        'status',
        'submitted_by',
    ];

    protected $casts = [
        'field_values' => 'array',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(PdfTemplate::class, 'pdf_template_id');
    }

    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }
}
