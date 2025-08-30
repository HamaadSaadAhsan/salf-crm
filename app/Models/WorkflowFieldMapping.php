<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkflowFieldMapping extends Model
{
    use HasFactory;

    protected $fillable = [
        'workflow_step_id',
        'source_field',
        'target_field',
        'field_type',
        'transformation_rules',
        'required'
    ];

    protected $casts = [
        'transformation_rules' => 'array',
        'required' => 'boolean'
    ];

    public function workflowStep(): BelongsTo
    {
        return $this->belongsTo(WorkflowStep::class);
    }
}
