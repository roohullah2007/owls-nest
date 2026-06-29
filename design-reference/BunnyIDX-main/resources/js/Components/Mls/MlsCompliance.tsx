/**
 * Canonical compliance renderer. Every MLS surface in the app (CRM listings page,
 * widgets, agent websites, WordPress plugin) MUST render this somewhere on the
 * listing display to stay legally compliant with each MLS's terms.
 *
 * Shape comes straight from `MlsDataService` and the `/api/mls/*` endpoints.
 */

export interface MlsComplianceRules {
    show_updated_at?: boolean;
    link_back_required?: boolean;
    fair_housing_required?: boolean;
    refresh_minutes?: number;
}

export interface MlsComplianceBlock {
    mls_name: string | null;
    mls_logo_url: string | null;
    compliance_logo_url: string | null;
    disclaimer: string | null;
    attribution_template: string | null;
    terms_url: string | null;
    rules: MlsComplianceRules;
}

interface Props {
    compliance: MlsComplianceBlock;
    /** Per-listing context for the attribution template — agent/office/updated_at */
    attributionContext?: { agent?: string; office?: string; updated_at?: string };
    /** Compact = footer line only. Full = stacked card with logo + disclaimer. */
    variant?: 'compact' | 'full';
    className?: string;
}

/**
 * Substitutes {agent}, {office}, {updated_at}, {mls_name} into the template.
 */
function applyTemplate(template: string, ctx: Required<NonNullable<Props['attributionContext']>> & { mls_name: string }): string {
    return template
        .replace(/\{agent\}/g, ctx.agent || '')
        .replace(/\{office\}/g, ctx.office || '')
        .replace(/\{updated_at\}/g, ctx.updated_at || '')
        .replace(/\{mls_name\}/g, ctx.mls_name || '')
        .trim();
}

export default function MlsCompliance({ compliance, attributionContext, variant = 'compact', className = '' }: Props) {
    const { mls_name, mls_logo_url, compliance_logo_url, disclaimer, attribution_template, terms_url, rules } = compliance;

    const logo = compliance_logo_url || mls_logo_url;

    const attribution = attribution_template
        ? applyTemplate(attribution_template, {
            agent: attributionContext?.agent || '',
            office: attributionContext?.office || '',
            updated_at: attributionContext?.updated_at || '',
            mls_name: mls_name || '',
        })
        : null;

    if (variant === 'compact') {
        return (
            <div className={`flex flex-wrap items-center gap-2 text-[10px] text-[#8B9096] ${className}`}>
                {logo && <img src={logo} alt={mls_name || 'MLS'} className="h-4 max-w-[80px] object-contain" />}
                {attribution && <span className="text-[#5F656D]">{attribution}</span>}
                {rules?.show_updated_at && attributionContext?.updated_at && (
                    <span>· Updated {attributionContext.updated_at}</span>
                )}
                {terms_url && (
                    <a href={terms_url} target="_blank" rel="noopener noreferrer" className="hover:text-[#5F656D] underline-offset-2 hover:underline">
                        Terms
                    </a>
                )}
            </div>
        );
    }

    // Full variant: stacked card with disclaimer body.
    return (
        <div className={`bg-[#FAFBFC] border border-[#E4E7EB] rounded-lg p-3 space-y-2 ${className}`}>
            <div className="flex items-center gap-2.5">
                {logo && <img src={logo} alt={mls_name || 'MLS'} className="h-6 max-w-[120px] object-contain" />}
                {mls_name && <span className="text-[11px] font-medium text-[#5F656D]">{mls_name}</span>}
                {rules?.fair_housing_required && (
                    <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-medium text-[#5F656D]" title="Equal Housing Opportunity">
                        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[#5F656D] text-[8px] font-bold">EHO</span>
                    </span>
                )}
            </div>
            {attribution && <p className="text-[11px] text-[#5F656D]">{attribution}</p>}
            {disclaimer && <p className="text-[10px] text-[#8B9096] leading-relaxed whitespace-pre-line">{disclaimer}</p>}
            {(rules?.show_updated_at && attributionContext?.updated_at) || terms_url ? (
                <div className="flex items-center gap-2 text-[10px] text-[#8B9096] pt-1 border-t border-[#F3F4F6]">
                    {rules?.show_updated_at && attributionContext?.updated_at && (
                        <span>Updated {attributionContext.updated_at}</span>
                    )}
                    {terms_url && (
                        <a href={terms_url} target="_blank" rel="noopener noreferrer" className="ml-auto hover:text-[#5F656D] underline-offset-2 hover:underline">
                            Terms of use
                        </a>
                    )}
                </div>
            ) : null}
        </div>
    );
}
