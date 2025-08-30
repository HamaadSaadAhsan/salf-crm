<?php

// app/Models/WorkflowStepConnection.php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkflowStepConnection extends Model
{
    use HasFactory;

    protected $fillable = [
        'from_step_id',
        'to_step_id',
        'conditions'
    ];

    protected $casts = [
        'conditions' => 'array'
    ];

    public function fromStep(): BelongsTo
    {
        return $this->belongsTo(WorkflowStep::class, 'from_step_id');
    }

    public function toStep(): BelongsTo
    {
        return $this->belongsTo(WorkflowStep::class, 'to_step_id');
    }
}
