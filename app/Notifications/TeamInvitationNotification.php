<?php

namespace App\Notifications;

use App\Models\TeamInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TeamInvitationNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public TeamInvitation $invitation) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $team = $this->invitation->team;
        $url = route('invitations.accept', ['token' => $this->invitation->token]);

        return (new MailMessage)
            ->subject("You've been invited to join {$team->name}")
            ->greeting("You're invited!")
            ->line("You have been invited to join **{$team->name}**.")
            ->action('Accept Invitation', $url)
            ->line('This invitation link expires in 7 days.')
            ->line('If you did not expect this invitation, you may ignore this email.');
    }

    public function toArray(object $notifiable): array
    {
        return [];
    }
}
