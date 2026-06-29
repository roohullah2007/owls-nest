<?php

declare(strict_types=1);

namespace App\Notifications\Auth;

use App\Services\Email\EmailTemplateRenderer;
use Illuminate\Auth\Notifications\ResetPassword as BaseResetPassword;
use Illuminate\Notifications\Messages\MailMessage;

/**
 * Password-reset notification rendered through our branded HTML template
 * system. Extends the framework notification so the reset URL and token expiry
 * are computed identically to Laravel's default; only the body is branded.
 */
class ResetPasswordNotification extends BaseResetPassword
{
    public function toMail($notifiable): MailMessage
    {
        $url = $this->resetUrl($notifiable);

        $expire = config('auth.passwords.'.config('auth.defaults.passwords').'.expire', 60);

        $rendered = app(EmailTemplateRenderer::class)->render('password_reset', [
            'name' => $notifiable->name ?? '',
            'action_url' => $url,
            'expire_minutes' => (string) $expire,
        ]);

        return (new MailMessage)
            ->subject($rendered['subject'])
            ->view('emails.html', ['html' => $rendered['html']]);
    }
}
