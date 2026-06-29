<?php

declare(strict_types=1);

namespace App\Notifications\Auth;

use App\Services\Email\EmailTemplateRenderer;
use Illuminate\Auth\Notifications\VerifyEmail as BaseVerifyEmail;
use Illuminate\Notifications\Messages\MailMessage;

/**
 * Email-verification notification rendered through our branded HTML template
 * system. Extends the framework notification so the signed verification URL is
 * built exactly the way Laravel expects (throttling, signing, expiry); only the
 * mail body is swapped for the branded template.
 */
class VerifyEmailNotification extends BaseVerifyEmail
{
    public function toMail($notifiable): MailMessage
    {
        $url = $this->verificationUrl($notifiable);

        $rendered = app(EmailTemplateRenderer::class)->render('email_verification', [
            'name' => $notifiable->name,
            'action_url' => $url,
        ]);

        return (new MailMessage)
            ->subject($rendered['subject'])
            ->view('emails.html', ['html' => $rendered['html']]);
    }
}
