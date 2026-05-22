<?php

namespace App\Ai\Agents;

use App\Ai\Tools\ActivitySummaryTool;
use App\Ai\Tools\CallMetricsTool;
use App\Ai\Tools\ConversionFunnelTool;
use App\Ai\Tools\LeadSearchTool;
use App\Ai\Tools\LeadStatsTool;
use App\Ai\Tools\UserPerformanceTool;
use App\Models\User;
use Laravel\Ai\Attributes\MaxSteps;
use Laravel\Ai\Attributes\Model;
use Laravel\Ai\Attributes\Provider;
use Laravel\Ai\Attributes\Temperature;
use Laravel\Ai\Concerns\RemembersConversations;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\Conversational;
use Laravel\Ai\Contracts\HasMiddleware;
use Laravel\Ai\Contracts\HasTools;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Middleware\RememberConversation;
use Laravel\Ai\Promptable;
use Stringable;

#[Provider('anthropic')]
#[Model('claude-haiku-4-5-20251001')]
#[MaxSteps(10)]
#[Temperature(0.3)]
class CrmAssistant implements Agent, Conversational, HasMiddleware, HasTools
{
    use Promptable, RemembersConversations;

    public function __construct(
        protected User $user
    ) {}

    public function instructions(): Stringable|string
    {
        $userName = $this->user->name;
        $userRole = $this->user->roles->first()?->name ?? 'user';
        $today = now()->format('l, F j, Y');

        $roleLabel = match (true) {
            $this->user->hasAnyRole(['super-admin', 'admin']) => 'Administrator',
            $this->user->hasAnyRole(['manager', 'team-lead']) => 'Manager',
            $this->user->hasAnyRole(['support-agent', 'senior-support-agent']) => 'CRO (Customer Relations Officer)',
            $this->user->hasAnyRole(['sales-rep', 'senior-sales-rep']) => 'Sales Advisor',
            default => 'Team Member',
        };

        return <<<PROMPT
        You are a CRM assistant for SALF CRM. You help {$userName} ({$roleLabel}) with their daily work.

        Today is {$today}. The user's role is "{$userRole}".

        ## Your Capabilities
        You have access to tools that let you query CRM data. Always use the appropriate tool to answer data questions — never guess or make up numbers.

        Available tools:
        - **Lead Statistics**: Counts and breakdowns by status, priority, source, or service
        - **Lead Search**: Find specific leads by name, email, phone, or status
        - **Call Metrics**: Call totals, durations, and answer rates
        - **Conversion Funnel**: Pipeline stages and conversion rates between them
        - **User Performance**: Individual or team performance metrics
        - **Activity Summary**: Pending tasks, overdue items, and daily workload

        ## Guidelines
        - Always use tools to get data before answering — do not fabricate numbers.
        - Format responses with markdown for readability.
        - Be concise and actionable. Highlight important numbers in **bold**.
        - When showing metrics, provide context (e.g., comparisons, trends, whether numbers are good or concerning).
        - After answering, suggest 1-2 relevant follow-up questions the user might want to ask.
        - If a question is outside your CRM data capabilities, say so clearly.
        PROMPT;
    }

    /**
     * @return Tool[]
     */
    public function tools(): iterable
    {
        return [
            new LeadStatsTool($this->user),
            new LeadSearchTool($this->user),
            new CallMetricsTool($this->user),
            new ConversionFunnelTool($this->user),
            new UserPerformanceTool($this->user),
            new ActivitySummaryTool($this->user),
        ];
    }

    public function middleware(): array
    {
        return [
            RememberConversation::class,
        ];
    }
}
