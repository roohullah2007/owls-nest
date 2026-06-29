<?php

declare(strict_types=1);

namespace App\Services\Email;

/**
 * Professional default templates for every transactional email type. A row in
 * `email_templates` overrides these per type; until the editor ships these are
 * the source of truth. Bodies use `{{ variable }}` placeholders — see each
 * type's variable list in the renderer/callers. Keep them script-free; the
 * renderer sanitises anyway, but defaults must be safe by construction.
 */
class DefaultEmailTemplates
{
    /** Brand accent used across the layouts (matches the app UI). */
    private const ACCENT = '#1693C9';

    /**
     * @return array{subject: string, body_html: string}|null
     */
    public static function get(string $type): ?array
    {
        $templates = self::all();

        return $templates[$type] ?? null;
    }

    /**
     * @return array<string, array{subject: string, body_html: string}>
     */
    public static function all(): array
    {
        return [
            'email_verification' => [
                'subject' => 'Confirm your email for {{ app_name }}',
                'body_html' => self::layout(
                    'Confirm your email',
                    '<p style="margin:0 0 16px">Hi {{ name }},</p>'
                    .'<p style="margin:0 0 16px">Thanks for signing up for {{ app_name }}. Please confirm your email address to activate your account.</p>'
                    .self::button('Confirm email', '{{ action_url }}')
                    .'<p style="margin:24px 0 0;font-size:13px;color:#6b7280">If you didn\'t create this account, you can safely ignore this email.</p>'
                ),
            ],

            'password_reset' => [
                'subject' => 'Reset your {{ app_name }} password',
                'body_html' => self::layout(
                    'Reset your password',
                    '<p style="margin:0 0 16px">Hi {{ name }},</p>'
                    .'<p style="margin:0 0 16px">We received a request to reset the password for your {{ app_name }} account. Click below to choose a new one.</p>'
                    .self::button('Reset password', '{{ action_url }}')
                    .'<p style="margin:24px 0 0;font-size:13px;color:#6b7280">This link expires in {{ expire_minutes }} minutes. If you didn\'t request a reset, no action is needed.</p>'
                ),
            ],

            'new_lead_notification' => [
                'subject' => 'New lead: {{ lead_name }} — {{ app_name }}',
                'body_html' => self::layout(
                    'You have a new lead',
                    '<p style="margin:0 0 16px">Hi {{ agent_name }},</p>'
                    .'<p style="margin:0 0 16px">A new lead came in from <strong>{{ source }}</strong>:</p>'
                    .'<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 8px">'
                    .self::row('Name', '{{ lead_name }}')
                    .self::row('Email', '{{ lead_email }}')
                    .self::row('Phone', '{{ lead_phone }}')
                    .self::row('Interest', '{{ lead_type }}')
                    .self::row('Message', '{{ lead_message }}')
                    .'</table>'
                    .self::button('Open in CRM', '{{ action_url }}')
                ),
            ],

            'saved_search_alert' => [
                'subject' => 'New matches for "{{ search_name }}"',
                'body_html' => self::layout(
                    'New listings match your search',
                    '<p style="margin:0 0 16px">Hi {{ lead_name }},</p>'
                    .'<p style="margin:0 0 16px">We found <strong>{{ match_count }}</strong> new listing(s) matching your saved search <strong>{{ search_name }}</strong>.</p>'
                    .self::button('View matches', '{{ action_url }}')
                    .self::unsubscribe()
                ),
            ],

            'property_price_drop_alert' => [
                'subject' => 'Price drop: {{ property_address }}',
                'body_html' => self::layout(
                    'Price reduced',
                    '<p style="margin:0 0 16px">Hi {{ lead_name }},</p>'
                    .'<p style="margin:0 0 16px">The price dropped on a property you favorited: <strong>{{ property_address }}</strong>.</p>'
                    .'<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 8px">'
                    .self::row('Was', '{{ old_price }}')
                    .self::row('Now', '{{ new_price }}')
                    .self::row('Status', '{{ status }}')
                    .'</table>'
                    .self::button('View property', '{{ action_url }}')
                    .self::unsubscribe()
                ),
            ],

            'property_status_change_alert' => [
                'subject' => 'Status update: {{ property_address }}',
                'body_html' => self::layout(
                    'Listing status changed',
                    '<p style="margin:0 0 16px">Hi {{ lead_name }},</p>'
                    .'<p style="margin:0 0 16px">The status changed on a property you favorited: <strong>{{ property_address }}</strong>.</p>'
                    .'<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 8px">'
                    .self::row('Was', '{{ old_status }}')
                    .self::row('Now', '{{ new_status }}')
                    .self::row('Price', '{{ price }}')
                    .'</table>'
                    .self::button('View property', '{{ action_url }}')
                    .self::unsubscribe()
                ),
            ],

            // Defaults for alert types not yet auto-triggered (open houses,
            // back-on-market) — present so owners can customise them and so a
            // later phase can wire the triggers without a template gap.
            'open_house_alert' => [
                'subject' => 'Open house: {{ property_address }}',
                'body_html' => self::layout(
                    'Upcoming open house',
                    '<p style="margin:0 0 16px">Hi {{ lead_name }},</p>'
                    .'<p style="margin:0 0 16px">There\'s an open house for <strong>{{ property_address }}</strong>: {{ open_house_when }}.</p>'
                    .self::button('View property', '{{ action_url }}')
                    .self::unsubscribe()
                ),
            ],

            'back_on_market_alert' => [
                'subject' => 'Back on market: {{ property_address }}',
                'body_html' => self::layout(
                    'Back on the market',
                    '<p style="margin:0 0 16px">Hi {{ lead_name }},</p>'
                    .'<p style="margin:0 0 16px">A property you favorited is active again: <strong>{{ property_address }}</strong>.</p>'
                    .self::button('View property', '{{ action_url }}')
                    .self::unsubscribe()
                ),
            ],

            // Transactional — sent on visitor sign-up. NOT counted against the
            // property-alert quota.
            'visitor_registration_confirmation' => [
                'subject' => 'Welcome to {{ app_name }}',
                'body_html' => self::layout(
                    'Welcome',
                    '<p style="margin:0 0 16px">Hi {{ lead_name }},</p>'
                    .'<p style="margin:0 0 16px">Thanks for registering. You can now save searches and favorite listings, and we\'ll keep you posted on new matches.</p>'
                    .self::button('Browse listings', '{{ action_url }}')
                ),
            ],

            'property_update_alert' => [
                'subject' => 'Update on {{ property_address }}',
                'body_html' => self::layout(
                    'Property update',
                    '<p style="margin:0 0 16px">Hi {{ name }},</p>'
                    .'<p style="margin:0 0 16px">There\'s an update on a property you\'re following: <strong>{{ property_address }}</strong>.</p>'
                    .'<p style="margin:0 0 16px">{{ update_summary }}</p>'
                    .self::button('View property', '{{ action_url }}')
                ),
            ],

            'action_plan_email' => [
                'subject' => '{{ subject }}',
                'body_html' => self::layout(
                    '{{ app_name }}',
                    '<p style="margin:0 0 16px">Hi {{ name }},</p>'
                    .'<div style="margin:0 0 16px">{{ body }}</div>'
                ),
            ],

            // Team invitation — sent from the platform sender when an owner/admin
            // invites a member. Transactional; never counted against any quota.
            'team_invitation' => [
                'subject' => '{{ inviter_name }} invited you to join {{ team_name }} on {{ app_name }}',
                'body_html' => self::layout(
                    'You\'re invited to join a team',
                    '<p style="margin:0 0 16px">Hi,</p>'
                    .'<p style="margin:0 0 16px"><strong>{{ inviter_name }}</strong> invited you to join the <strong>{{ team_name }}</strong> team on {{ app_name }} as <strong>{{ role }}</strong>.</p>'
                    .'<p style="margin:0 0 16px">{{ app_name }} gives real estate teams a shared workspace — contacts, deals, a shared inbox, and reporting — so the whole team can collaborate in one place.</p>'
                    .self::button('Accept invitation', '{{ accept_url }}')
                    .'<p style="margin:24px 0 0;font-size:13px;color:#6b7280">This invitation expires on {{ expires_at }}. If you weren\'t expecting it, you can safely ignore this email.</p>'
                ),
            ],
        ];
    }

    private static function button(string $label, string $url): string
    {
        return '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px">'
            .'<tr><td style="border-radius:6px;background:'.self::ACCENT.'">'
            .'<a href="'.$url.'" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px">'.$label.'</a>'
            .'</td></tr></table>';
    }

    /** Footer unsubscribe line for property-alert emails (lead-facing). */
    private static function unsubscribe(): string
    {
        return '<p style="margin:24px 0 0;font-size:12px;color:#9ca3af">'
            .'You\'re receiving this because you saved a search or favorited a listing. '
            .'<a href="{{ unsubscribe_url }}" style="color:#9ca3af;text-decoration:underline">Unsubscribe from property alerts</a>.'
            .'</p>';
    }

    private static function row(string $label, string $value): string
    {
        return '<tr>'
            .'<td style="padding:6px 12px 6px 0;font-size:13px;color:#6b7280;white-space:nowrap;vertical-align:top">'.$label.'</td>'
            .'<td style="padding:6px 0;font-size:14px;color:#111827">'.$value.'</td>'
            .'</tr>';
    }

    private static function layout(string $heading, string $inner): string
    {
        return '<!doctype html><html><body style="margin:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif">'
            .'<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#f3f4f6"><tr><td align="center" style="padding:32px 16px">'
            .'<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb">'
            .'<tr><td style="padding:20px 28px;border-bottom:1px solid #eef0f2"><span style="font-size:16px;font-weight:700;color:'.self::ACCENT.'">{{ app_name }}</span></td></tr>'
            .'<tr><td style="padding:28px"><h1 style="margin:0 0 18px;font-size:19px;font-weight:700;color:#111827">'.$heading.'</h1>'.$inner.'</td></tr>'
            .'<tr><td style="padding:18px 28px;border-top:1px solid #eef0f2;font-size:12px;color:#9ca3af">Sent by {{ app_name }}. You can manage email preferences in your account settings.</td></tr>'
            .'</table></td></tr></table></body></html>';
    }
}
