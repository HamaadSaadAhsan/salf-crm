<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTicketCommentRequest;
use App\Models\Ticket;
use App\Models\TicketAttachment;
use App\Models\TicketComment;
use Illuminate\Http\RedirectResponse;

class TicketCommentController extends Controller
{
    public function store(StoreTicketCommentRequest $request, Ticket $ticket): RedirectResponse
    {
        $this->authorize('comment', $ticket);

        $validated = $request->validated();

        $comment = TicketComment::query()->create([
            'ticket_id' => $ticket->id,
            'user_id' => auth()->id(),
            'body' => $validated['body'],
            'is_admin_reply' => auth()->user()->hasRole('super-admin'),
        ]);

        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $path = $file->store('ticket-attachments', 'public');

                TicketAttachment::query()->create([
                    'ticket_id' => $ticket->id,
                    'ticket_comment_id' => $comment->id,
                    'file_path' => $path,
                    'file_name' => $file->getClientOriginalName(),
                    'file_size' => $file->getSize(),
                    'mime_type' => $file->getMimeType(),
                ]);
            }
        }

        return redirect()->back()->with('success', 'Comment added successfully.');
    }
}
