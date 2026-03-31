<?php

namespace App\Http\Controllers;

use App\Http\Requests\SendMessageRequest;
use App\Models\GmailIntegration;
use App\Models\Label;
use App\Models\Message;
use App\Models\MessageLabel;
use App\Models\MessageRecipient;
use App\Models\User;
use App\Services\GmailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class MailController extends Controller
{
    public function index(Request $request): Response
    {
        $folder = $request->query('folder', 'inbox');
        $labelId = $request->query('label');

        return Inertia::render('mail/index', [
            'folder' => $folder,
            'labelId' => $labelId,
        ]);
    }

    public function messages(Request $request): JsonResponse
    {
        $user = $request->user();
        $folder = $request->query('folder', 'inbox');
        $labelId = $request->query('label');
        $search = $request->query('search');

        $messages = match ($folder) {
            'inbox' => $this->getInbox($user, $search),
            'sent' => $this->getSent($user, $search),
            'drafts' => $this->getDrafts($user, $search),
            'starred' => $this->getStarred($user, $search),
            'trash' => $this->getTrash($user, $search),
            default => $this->getInbox($user, $search),
        };

        if ($labelId) {
            $messageIds = MessageLabel::where('user_id', $user->id)
                ->where('label_id', $labelId)
                ->pluck('message_id');
            $messages = $messages->whereIn('id', $messageIds);
        }

        return response()->json([
            'messages' => $messages->values(),
        ]);
    }

    public function show(Request $request, Message $message): JsonResponse
    {
        $user = $request->user();

        $message->load(['sender:id,name,email', 'recipients.user:id,name,email']);

        // Mark as read for this user
        MessageRecipient::where('message_id', $message->id)
            ->where('user_id', $user->id)
            ->whereNull('read_at')
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);

        // Load thread messages if part of a thread
        $thread = [];
        if ($message->thread_id) {
            $thread = Message::where('thread_id', $message->thread_id)
                ->where('id', '!=', $message->id)
                ->with(['sender:id,name,email', 'recipients.user:id,name,email'])
                ->orderBy('sent_at')
                ->get()
                ->map(fn (Message $m) => $this->formatMessage($m, $user));
        }

        return response()->json([
            'message' => $this->formatMessage($message, $user),
            'thread' => $thread,
        ]);
    }

    public function send(SendMessageRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $user = $request->user();
        $isDraft = $validated['is_draft'] ?? false;

        $message = Message::create([
            'sender_id' => $user->id,
            'parent_id' => $validated['parent_id'] ?? null,
            'thread_id' => $this->resolveThreadId($validated['parent_id'] ?? null),
            'subject' => $validated['subject'],
            'body' => $validated['body'],
            'type' => $validated['type'] ?? 'new',
            'is_draft' => $isDraft,
            'sent_at' => $isDraft ? null : now(),
        ]);

        $this->createRecipients($message, $validated);

        // Send via Gmail API if the user has an active integration and this is not a draft
        if (! $isDraft) {
            $this->dispatchViaGmail($user, $validated);
        }

        $message->load(['sender:id,name,email', 'recipients.user:id,name,email']);

        return response()->json([
            'success' => true,
            'message' => $this->formatMessage($message, $user),
        ], 201);
    }

    private function dispatchViaGmail(User $user, array $validated): void
    {
        $integration = GmailIntegration::where('user_id', $user->id)
            ->where('is_active', true)
            ->first();

        if (! $integration) {
            return;
        }

        try {
            $gmailService = app(GmailService::class);

            // Resolve recipient email addresses
            $toEmails = $this->resolveEmails($validated['to'] ?? []);
            $ccEmails = $this->resolveEmails($validated['cc'] ?? []);

            if (empty($toEmails)) {
                return;
            }

            $gmailService->sendEmail($integration, [
                'from_name' => $user->name,
                'from_email' => $integration->google_account_email,
                'to' => $toEmails,
                'cc' => $ccEmails,
                'subject' => $validated['subject'],
                'body' => $validated['body'],
            ]);
        } catch (\Exception $e) {
            Log::warning('Gmail dispatch failed (message still saved internally): '.$e->getMessage());
        }
    }

    private function resolveEmails(array $recipients): array
    {
        $emails = [];

        foreach ($recipients as $recipient) {
            if (is_numeric($recipient) && (int) $recipient > 0) {
                $user = User::find((int) $recipient);
                if ($user?->email) {
                    $emails[] = "{$user->name} <{$user->email}>";
                }
            } elseif (is_string($recipient) && filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
                // Lead or free-form external email — include as-is
                $emails[] = $recipient;
            }
        }

        return $emails;
    }

    public function update(SendMessageRequest $request, Message $message): JsonResponse
    {
        $user = $request->user();

        if ($message->sender_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validated();
        $isDraft = $validated['is_draft'] ?? false;

        $message->update([
            'subject' => $validated['subject'],
            'body' => $validated['body'],
            'type' => $validated['type'] ?? $message->type,
            'is_draft' => $isDraft,
            'sent_at' => $isDraft ? null : now(),
        ]);

        // Replace recipients
        $message->recipients()->delete();
        $this->createRecipients($message, $validated);

        $message->load(['sender:id,name,email', 'recipients.user:id,name,email']);

        return response()->json([
            'success' => true,
            'message' => $this->formatMessage($message, $user),
        ]);
    }

    public function toggleStar(Request $request, Message $message): JsonResponse
    {
        $recipient = MessageRecipient::where('message_id', $message->id)
            ->where('user_id', $request->user()->id)
            ->first();

        if ($recipient) {
            $recipient->update(['is_starred' => ! $recipient->is_starred]);
        }

        return response()->json(['success' => true, 'is_starred' => $recipient?->is_starred ?? false]);
    }

    public function toggleRead(Request $request, Message $message): JsonResponse
    {
        $recipient = MessageRecipient::where('message_id', $message->id)
            ->where('user_id', $request->user()->id)
            ->first();

        if ($recipient) {
            $isRead = ! $recipient->is_read;
            $recipient->update([
                'is_read' => $isRead,
                'read_at' => $isRead ? now() : null,
            ]);
        }

        return response()->json(['success' => true, 'is_read' => $recipient?->is_read ?? false]);
    }

    public function trash(Request $request, Message $message): JsonResponse
    {
        $user = $request->user();

        // If sender, soft-trash the message for sender
        if ($message->sender_id === $user->id) {
            $message->update(['deleted_at' => now()]);
        }

        // Trash for recipient
        MessageRecipient::where('message_id', $message->id)
            ->where('user_id', $user->id)
            ->update(['trashed_at' => now()]);

        return response()->json(['success' => true]);
    }

    public function restore(Request $request, Message $message): JsonResponse
    {
        $user = $request->user();

        if ($message->sender_id === $user->id && $message->trashed()) {
            $message->restore();
        }

        MessageRecipient::where('message_id', $message->id)
            ->where('user_id', $user->id)
            ->update(['trashed_at' => null]);

        return response()->json(['success' => true]);
    }

    public function destroy(Request $request, Message $message): JsonResponse
    {
        $user = $request->user();

        if ($message->sender_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $message->forceDelete();

        return response()->json(['success' => true]);
    }

    // Labels

    public function labels(Request $request): JsonResponse
    {
        $labels = Label::where('user_id', $request->user()->id)
            ->withCount(['messageLabels'])
            ->orderBy('name')
            ->get();

        return response()->json(['labels' => $labels]);
    }

    public function storeLabel(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:50'],
            'color' => ['nullable', 'string', 'max:20'],
        ]);

        $label = Label::create([
            'user_id' => $request->user()->id,
            'name' => $validated['name'],
            'color' => $validated['color'] ?? 'gray',
        ]);

        return response()->json(['success' => true, 'label' => $label], 201);
    }

    public function deleteLabel(Request $request, Label $label): JsonResponse
    {
        if ($label->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $label->delete();

        return response()->json(['success' => true]);
    }

    public function toggleLabel(Request $request, Message $message, Label $label): JsonResponse
    {
        $user = $request->user();

        $existing = MessageLabel::where('message_id', $message->id)
            ->where('label_id', $label->id)
            ->where('user_id', $user->id)
            ->first();

        if ($existing) {
            $existing->delete();

            return response()->json(['success' => true, 'attached' => false]);
        }

        MessageLabel::create([
            'message_id' => $message->id,
            'label_id' => $label->id,
            'user_id' => $user->id,
        ]);

        return response()->json(['success' => true, 'attached' => true]);
    }

    public function users(Request $request): JsonResponse
    {
        $search = $request->query('search', '');
        $currentUserId = $request->user()->id;

        // Search CRM users
        $userQuery = User::query()
            ->select(['id', 'name', 'email'])
            ->where('id', '!=', $currentUserId)
            ->orderBy('name');

        if ($search) {
            $userQuery->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('email', 'ilike', "%{$search}%");
            });
        }

        $users = $userQuery->limit(10)->get()->map(fn ($u) => [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'isExternal' => false,
        ]);

        // Also search leads by name/email (returned as external recipients)
        $leads = collect();
        if ($search) {
            $leads = \App\Models\Lead::query()
                ->select(['id', 'name', 'email'])
                ->where('email', '!=', '')
                ->whereNotNull('email')
                ->where(function ($q) use ($search) {
                    $q->where('name', 'ilike', "%{$search}%")
                        ->orWhere('email', 'ilike', "%{$search}%");
                })
                ->limit(10)
                ->get()
                ->filter(fn ($l) => ! $users->firstWhere('email', $l->email))
                ->values()
                ->map(fn ($l, $i) => [
                    'id' => -($i + 1),  // safe negative placeholder (email is the real identifier)
                    'name' => $l->name,
                    'email' => $l->email,
                    'isExternal' => true,
                ]);
        }

        return response()->json(['users' => $users->merge($leads)->values()]);
    }

    public function counts(Request $request): JsonResponse
    {
        $user = $request->user();

        $unreadInbox = MessageRecipient::where('user_id', $user->id)
            ->where('is_read', false)
            ->whereNull('trashed_at')
            ->whereHas('message', fn ($q) => $q->where('is_draft', false)->whereNull('deleted_at'))
            ->count();

        $drafts = Message::where('sender_id', $user->id)
            ->where('is_draft', true)
            ->count();

        $starred = MessageRecipient::where('user_id', $user->id)
            ->where('is_starred', true)
            ->whereNull('trashed_at')
            ->count();

        return response()->json([
            'inbox' => $unreadInbox,
            'drafts' => $drafts,
            'starred' => $starred,
        ]);
    }

    // Private helpers

    private function getInbox(User $user, ?string $search): \Illuminate\Support\Collection
    {
        $query = Message::query()
            ->whereHas('recipients', fn ($q) => $q->where('user_id', $user->id)->whereNull('trashed_at'))
            ->where('is_draft', false)
            ->with(['sender:id,name,email', 'recipients.user:id,name,email'])
            ->latest('sent_at');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('subject', 'ilike', "%{$search}%")
                    ->orWhere('body', 'ilike', "%{$search}%");
            });
        }

        return $query->limit(100)->get()->map(fn (Message $m) => $this->formatMessage($m, $user));
    }

    private function getSent(User $user, ?string $search): \Illuminate\Support\Collection
    {
        $query = Message::query()
            ->where('sender_id', $user->id)
            ->where('is_draft', false)
            ->with(['sender:id,name,email', 'recipients.user:id,name,email'])
            ->latest('sent_at');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('subject', 'ilike', "%{$search}%")
                    ->orWhere('body', 'ilike', "%{$search}%");
            });
        }

        return $query->limit(100)->get()->map(fn (Message $m) => $this->formatMessage($m, $user));
    }

    private function getDrafts(User $user, ?string $search): \Illuminate\Support\Collection
    {
        $query = Message::query()
            ->where('sender_id', $user->id)
            ->where('is_draft', true)
            ->with(['sender:id,name,email', 'recipients.user:id,name,email'])
            ->latest('updated_at');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('subject', 'ilike', "%{$search}%")
                    ->orWhere('body', 'ilike', "%{$search}%");
            });
        }

        return $query->limit(100)->get()->map(fn (Message $m) => $this->formatMessage($m, $user));
    }

    private function getStarred(User $user, ?string $search): \Illuminate\Support\Collection
    {
        $query = Message::query()
            ->whereHas('recipients', fn ($q) => $q->where('user_id', $user->id)->where('is_starred', true)->whereNull('trashed_at'))
            ->where('is_draft', false)
            ->with(['sender:id,name,email', 'recipients.user:id,name,email'])
            ->latest('sent_at');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('subject', 'ilike', "%{$search}%")
                    ->orWhere('body', 'ilike', "%{$search}%");
            });
        }

        return $query->limit(100)->get()->map(fn (Message $m) => $this->formatMessage($m, $user));
    }

    private function getTrash(User $user, ?string $search): \Illuminate\Support\Collection
    {
        $query = Message::query()
            ->whereHas('recipients', fn ($q) => $q->where('user_id', $user->id)->whereNotNull('trashed_at'))
            ->where('is_draft', false)
            ->with(['sender:id,name,email', 'recipients.user:id,name,email'])
            ->latest('sent_at');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('subject', 'ilike', "%{$search}%")
                    ->orWhere('body', 'ilike', "%{$search}%");
            });
        }

        return $query->limit(100)->get()->map(fn (Message $m) => $this->formatMessage($m, $user));
    }

    private function formatMessage(Message $message, User $currentUser): array
    {
        $recipient = $message->recipients->firstWhere('user_id', $currentUser->id);

        return [
            'id' => $message->id,
            'sender' => $message->sender ? [
                'id' => $message->sender->id,
                'name' => $message->sender->name,
                'email' => $message->sender->email,
                'initials' => $this->getInitials($message->sender->name),
            ] : null,
            'recipients' => $message->recipients->map(fn (MessageRecipient $r) => [
                'id' => $r->user_id,
                'name' => $r->user?->name,
                'email' => $r->user?->email,
                'type' => $r->type,
            ]),
            'subject' => $message->subject,
            'body' => $message->body,
            'preview' => Str::limit(strip_tags($message->body), 120),
            'type' => $message->type,
            'is_draft' => $message->is_draft,
            'is_read' => $recipient?->is_read ?? ($message->sender_id === $currentUser->id),
            'is_starred' => $recipient?->is_starred ?? false,
            'parent_id' => $message->parent_id,
            'thread_id' => $message->thread_id,
            'sent_at' => $message->sent_at?->toIso8601String(),
            'created_at' => $message->created_at->toIso8601String(),
        ];
    }

    private function createRecipients(Message $message, array $data): void
    {
        foreach (['to', 'cc', 'bcc'] as $type) {
            foreach ($data[$type] ?? [] as $recipient) {
                // Negative ID = lead (external), positive = CRM user
                $userId = null;

                if (is_numeric($recipient) && (int) $recipient > 0) {
                    // Internal CRM user ID
                    $userId = (int) $recipient;
                } elseif (is_string($recipient) && filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
                    // External / lead email — match to a CRM user if one exists
                    $user = User::where('email', $recipient)->first();
                    $userId = $user?->id;
                }

                if ($userId) {
                    MessageRecipient::create([
                        'message_id' => $message->id,
                        'user_id' => $userId,
                        'type' => $type,
                    ]);
                }
            }
        }
    }

    private function resolveThreadId(?int $parentId): string
    {
        if ($parentId) {
            $parent = Message::find($parentId);
            if ($parent?->thread_id) {
                return $parent->thread_id;
            }
        }

        return Str::uuid()->toString();
    }

    private function getInitials(string $name): string
    {
        $parts = explode(' ', trim($name));
        $initials = '';
        foreach (array_slice($parts, 0, 2) as $part) {
            $initials .= strtoupper(substr($part, 0, 1));
        }

        return $initials;
    }
}
