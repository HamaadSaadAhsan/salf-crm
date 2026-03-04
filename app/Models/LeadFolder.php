<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadFolder extends Model
{
    /** @use HasFactory<\Database\Factories\LeadFolderFactory> */
    use HasFactory;

    protected $fillable = [
        'lead_id',
        'name',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }
}
