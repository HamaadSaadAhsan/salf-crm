<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\BroadcastMessage;

class FacebookIntegrationAlert extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public string $title,
        public string $message,
        public string $level = 'info'
    ) {}

    /**
     * Get the notification's delivery channels.
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'database', 'broadcast'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $mailMessage = (new MailMessage)
            ->subject($this->title)
            ->greeting("Hello {$notifiable->name},");

        if ($this->level === 'error') {
            $mailMessage->error()
                ->line('We detected an issue with your Facebook integration:')
                ->line($this->message)
                ->line('Please check your Facebook integration settings and resolve the issue as soon as possible.')
                ->action('View Integration', url('/integrations/facebook'));
        } elseif ($this->level === 'warning') {
            $mailMessage->line('We noticed an issue with your Facebook integration:')
                ->line($this->message)
                ->line('You may want to check your integration settings.')
                ->action('View Integration', url('/integrations/facebook'));
        } else {
            $mailMessage->line($this->message)
                ->action('View Integration', url('/integrations/facebook'));
        }

        return $mailMessage->line('Thank you for using our application!');
    }

    /**
     * Get the array representation of the notification.
     */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => $this->title,
            'message' => $this->message,
            'level' => $this->level,
            'timestamp' => now()->toISOString(),
            'type' => 'facebook_integration',
            'action_url' => url('/integrations/facebook')
        ];
    }

    /**
     * Get the broadcastable representation of the notification.
     */
    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage([
            'id' => $this->id,
            'title' => $this->title,
            'message' => $this->message,
            'level' => $this->level,
            'timestamp' => now()->toISOString(),
            'type' => 'facebook_integration',
            'action_url' => url('/integrations/facebook'),
            'read_at' => null
        ]);
    }

    /**
     * Get the notification's broadcast channel name.
     */
    public function broadcastOn(): array
    {
        return ['user.' . $this->notifiable->id];
    }
}