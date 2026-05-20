<?php

namespace App\Models\Forms;

use App\Enums\Forms\GenerationStatus;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApplicationGeneration extends Model
{
    use HasFactory;

    protected $fillable = [
        'application_id',
        'generated_by_user_id',
        'output_path',
        'file_count',
        'generation_log',
        'status',
        'started_at',
        'completed_at',
        'error_message',
    ];

    protected function casts(): array
    {
        return [
            'status' => GenerationStatus::class,
            'generation_log' => 'array',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }

    public function generatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generated_by_user_id');
    }
}
