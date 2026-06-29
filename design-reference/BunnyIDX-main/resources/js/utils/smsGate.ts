/**
 * Shared 10DLC gating helpers for SMS sends.
 *
 * 10DLC is a US/Canada (NANP) regulatory requirement for application-to-person
 * texting. International numbers go through different regimes (UK sender ID,
 * India DLT, etc.) — none of which we enforce here, since they live in the
 * carrier's own pipeline.
 *
 * The backend (`SmsController::send`) gates with the same NANP detection, so
 * the frontend check is purely a UX optimization to avoid a 422.
 */

/**
 * Does this destination phone require US/Canadian 10DLC registration?
 * Accepts loose formats: "+1 (305) 555-0142", "1-305-555-0142", "3055550142",
 * "+44 20 7946 0958", etc.
 */
export function requires10Dlc(phone: string | null | undefined): boolean {
    if (!phone) return false;
    const digits = phone.replace(/\D/g, '');
    // NANP: 10 digits (US/CA local) OR 11 digits starting with 1.
    if (digits.length === 10) return true;
    if (digits.length === 11 && digits.startsWith('1')) return true;
    return false;
}

/**
 * Is the user allowed to send SMS to this destination right now?
 * Combines NANP detection with the user's 10DLC status from shared props.
 */
export function canSendSms(destination: string | null | undefined, tenDlcStatus: 'approved' | 'pending' | 'not_started'): boolean {
    if (!requires10Dlc(destination)) return true; // international — no 10DLC needed
    return tenDlcStatus === 'approved';
}
