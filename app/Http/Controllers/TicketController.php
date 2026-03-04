<?php

namespace App\Http\Controllers;

use App\Enums\TicketPriority;
use App\Enums\TicketStatus;
use App\Enums\TicketType;
use App\Http\Requests\StoreTicketRequest;
use App\Http\Requests\UpdateTicketRequest;
use App\Models\Ticket;
use App\Models\TicketAttachment;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TicketController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->input('status');
        $type = $request->input('type');
        $priority = $request->input('priority');

        $query = Ticket::query()
            ->forUser(auth()->id())
            ->with(['assignedTo:id,name,email'])
            ->withCount('comments')
            ->latest();

        if ($status) {
            $query->status($status);
        }

        if ($type) {
            $query->type($type);
        }

        if ($priority) {
            $query->priority($priority);
        }

        $tickets = $query->paginate(20)->withQueryString();

        return Inertia::render('support/index', [
            'tickets' => $tickets,
            'filters' => [
                'status' => $status,
                'type' => $type,
                'priority' => $priority,
            ],
            'statusOptions' => collect(TicketStatus::cases())->map(fn ($s) => [
                'value' => $s->value,
                'label' => $s->label(),
            ]),
            'typeOptions' => collect(TicketType::cases())->map(fn ($t) => [
                'value' => $t->value,
                'label' => $t->label(),
            ]),
            'priorityOptions' => collect(TicketPriority::cases())->map(fn ($p) => [
                'value' => $p->value,
                'label' => $p->label(),
            ]),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('support/create', [
            'typeOptions' => collect(TicketType::cases())->map(fn ($t) => [
                'value' => $t->value,
                'label' => $t->label(),
            ]),
            'priorityOptions' => collect(TicketPriority::cases())->map(fn ($p) => [
                'value' => $p->value,
                'label' => $p->label(),
            ]),
            'isSuperAdmin' => auth()->user()->hasRole('super-admin'),
        ]);
    }

    public function store(StoreTicketRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $ticket = Ticket::query()->create([
            'type' => $validated['type'],
            'status' => TicketStatus::Open->value,
            'priority' => $validated['priority'] ?? TicketPriority::Medium->value,
            'subject' => $validated['subject'],
            'description' => $validated['description'],
        ]);

        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $path = $file->store('ticket-attachments', 'public');

                TicketAttachment::query()->create([
                    'ticket_id' => $ticket->id,
                    'file_path' => $path,
                    'file_name' => $file->getClientOriginalName(),
                    'file_size' => $file->getSize(),
                    'mime_type' => $file->getMimeType(),
                ]);
            }
        }

        return redirect()->route('support.show', $ticket)->with('success', 'Ticket created successfully.');
    }

    public function show(Ticket $ticket): Response
    {
        $this->authorize('view', $ticket);

        $ticket->load([
            'user:id,name,email',
            'assignedTo:id,name,email',
            'comments' => fn ($q) => $q->with(['user:id,name,email', 'attachments'])->oldest(),
            'attachments' => fn ($q) => $q->whereNull('ticket_comment_id'),
        ]);

        $isSuperAdmin = auth()->user()->hasRole('super-admin');

        return Inertia::render('support/show', [
            'ticket' => $ticket,
            'isSuperAdmin' => $isSuperAdmin,
            'users' => $isSuperAdmin
                ? User::query()->select(['id', 'name', 'email'])->orderBy('name')->get()
                : [],
            'statusOptions' => collect(TicketStatus::cases())->map(fn ($s) => [
                'value' => $s->value,
                'label' => $s->label(),
            ]),
            'priorityOptions' => collect(TicketPriority::cases())->map(fn ($p) => [
                'value' => $p->value,
                'label' => $p->label(),
            ]),
        ]);
    }

    public function update(UpdateTicketRequest $request, Ticket $ticket): RedirectResponse
    {
        $this->authorize('update', $ticket);

        $validated = $request->validated();

        if (isset($validated['status'])) {
            if ($validated['status'] === TicketStatus::Resolved->value) {
                $validated['resolved_at'] = now();
            }

            if ($validated['status'] === TicketStatus::Closed->value) {
                $validated['closed_at'] = now();
            }
        }

        $ticket->update($validated);

        return redirect()->back()->with('success', 'Ticket updated successfully.');
    }

    public function destroy(Ticket $ticket): RedirectResponse
    {
        $this->authorize('delete', $ticket);

        $ticket->delete();

        return redirect()->route('support.index')->with('success', 'Ticket deleted successfully.');
    }

    public function adminIndex(Request $request): Response
    {
        $status = $request->input('status');
        $type = $request->input('type');
        $priority = $request->input('priority');
        $assignedToId = $request->input('assigned_to_id');
        $search = $request->input('search');

        $query = Ticket::query()
            ->with(['user:id,name,email', 'assignedTo:id,name,email'])
            ->withCount('comments')
            ->latest();

        if ($status) {
            $query->status($status);
        }

        if ($type) {
            $query->type($type);
        }

        if ($priority) {
            $query->priority($priority);
        }

        if ($assignedToId) {
            $query->where('assigned_to_id', $assignedToId);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('subject', 'ilike', "%{$search}%")
                    ->orWhere('description', 'ilike', "%{$search}%");
            });
        }

        $tickets = $query->paginate(20)->withQueryString();

        $users = User::query()->select(['id', 'name', 'email'])->orderBy('name')->get();

        return Inertia::render('support/admin/index', [
            'tickets' => $tickets,
            'users' => $users,
            'filters' => [
                'status' => $status,
                'type' => $type,
                'priority' => $priority,
                'assigned_to_id' => $assignedToId,
                'search' => $search,
            ],
            'statusOptions' => collect(TicketStatus::cases())->map(fn ($s) => [
                'value' => $s->value,
                'label' => $s->label(),
            ]),
            'typeOptions' => collect(TicketType::cases())->map(fn ($t) => [
                'value' => $t->value,
                'label' => $t->label(),
            ]),
            'priorityOptions' => collect(TicketPriority::cases())->map(fn ($p) => [
                'value' => $p->value,
                'label' => $p->label(),
            ]),
        ]);
    }
}
