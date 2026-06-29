/**
 * Marketing-consent checkbox + disclosure for guest lead forms (save search,
 * showing requests). Text comes from the site config (editor-overridable,
 * TCPA-style default). Uses native `required` validation — the browser blocks
 * submit until checked.
 */
export default function ConsentCheck({ text }: { text?: string }) {
    if (!text) return null;
    return (
        <label className="ps-consent">
            <input type="checkbox" required />
            <span><strong>Agree to Privacy Policy</strong><br />{text}</span>
        </label>
    );
}
