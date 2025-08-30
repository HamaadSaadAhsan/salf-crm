<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WorkflowStep extends Model
{
    use HasFactory;

    protected $fillable = [
        'workflow_id',
        'step_type',
        'service',
        'operation',
        'order',
        'configuration',
        'enabled'
    ];

    protected $casts = [
        'configuration' => 'array',
        'enabled' => 'boolean'
    ];

    public function workflow(): BelongsTo
    {
        return $this->belongsTo(Workflow::class);
    }

    public function fieldMappings(): HasMany
    {
        return $this->hasMany(WorkflowFieldMapping::class);
    }

    public function outgoingConnections(): HasMany
    {
        return $this->hasMany(WorkflowStepConnection::class, 'from_step_id');
    }

    public function incomingConnections(): HasMany
    {
        return $this->hasMany(WorkflowStepConnection::class, 'to_step_id');
    }
}
