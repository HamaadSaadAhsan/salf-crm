<?php

// app/Models/Workflow.php
namespace App\Models;

use App\Policies\WorkflowPolicy;
use Illuminate\Database\Eloquent\Attributes\UsePolicy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[UsePolicy(WorkflowPolicy::class)]
class Workflow extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'status',
        'user_id',
        'metadata'
    ];

    protected $casts = [
        'metadata' => 'array'
    ];

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
