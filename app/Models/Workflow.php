<?php

// app/Models/Workflow.php

namespace App\Models;

use App\Policies\WorkflowPolicy;
use App\Traits\BelongsToTeam;
use Illuminate\Database\Eloquent\Attributes\UsePolicy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[UsePolicy(WorkflowPolicy::class)]
class Workflow extends Model
{
    use BelongsToTeam, HasFactory;

    protected $fillable = [
        'team_id',
        'name',
        'description',
        'status',
        'user_id',
        'metadata',
        'webhook_token',
        'canvas_data',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'canvas_data' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Workflow $workflow) {
            if (! $workflow->webhook_token) {
                $workflow->webhook_token = bin2hex(random_bytes(32));
            }
        });
    }

    public function getWebhookUrlAttribute(): string
    {
        return url("/webhooks/workflow/{$this->webhook_token}");
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function steps(): HasMany
    {
        return $this->hasMany(WorkflowStep::class)->orderBy('order');
    }

    public function executions(): HasMany
    {
        return $this->hasMany(WorkflowExecution::class);
    }

    public function getTriggerStep()
    {
        return $this->steps()->where('step_type', 'trigger')->first();
    }

    public function getActionSteps()
    {
        return $this->steps()->where('step_type', 'action')->get();
    }
}
