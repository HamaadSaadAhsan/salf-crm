<?php

namespace App\Models;

use Database\Factories\LeadGoogleDriveFileFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadGoogleDriveFile extends Model
{
    /** @use HasFactory<LeadGoogleDriveFileFactory> */
    use HasFactory;

    protected $fillable = [
        'lead_id',
        'storage_account_id',
        'google_file_id',
        'file_name',
        'mime_type',
        'file_size',
        'icon_link',
        'web_view_link',
        'thumbnail_link',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function storageAccount(): BelongsTo
    {
        return $this->belongsTo(StorageAccount::class);
    }
}
