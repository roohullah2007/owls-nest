import { StepProps } from '../types';
import StepShell from '../components/StepShell';

/** Final step — pick the website design. */
export default function TemplateStep({ data, set, page }: StepProps) {
    const templates = Object.entries(page.templates);

    return (
        <StepShell
            title="Choose your design"
            subtitle="This is the look of your website. Pick a template to start with — you can switch designs or restyle colors anytime in the editor."
            maxWidth="max-w-3xl"
        >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {templates.map(([key, t]) => {
                    const selected = data.template === key;
                    const bg = t.preview?.bg || '#0A0A0A';
                    const accent = t.preview?.accent || '#C9A96E';

                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() => set('template', key)}
                            className={`text-left rounded-xl border p-3 transition-all ${
                                selected ? 'border-[#1693C9] ring-1 ring-[#1693C9]' : 'border-[#E4E7EB] hover:border-[#1693C9]/50'
                            }`}
                        >
                            {/* Preview — a tiny browser mock using the template colors */}
                            <div className="overflow-hidden rounded-lg border border-[#E4E7EB]">
                                <div className="flex items-center gap-1.5 bg-[#F3F4F6] px-2.5 py-1.5">
                                    <span className="h-2 w-2 rounded-full bg-[#D1D5DB]" />
                                    <span className="h-2 w-2 rounded-full bg-[#D1D5DB]" />
                                    <span className="h-2 w-2 rounded-full bg-[#D1D5DB]" />
                                </div>
                                <div className="px-5 py-7" style={{ backgroundColor: bg }}>
                                    <div className="h-2.5 w-1/3 rounded-full mb-2.5" style={{ backgroundColor: accent }} />
                                    <div className="h-1.5 w-3/4 rounded-full mb-1.5 opacity-50" style={{ backgroundColor: accent }} />
                                    <div className="h-1.5 w-2/3 rounded-full opacity-30" style={{ backgroundColor: accent }} />
                                </div>
                            </div>

                            <div className="mt-3 flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-[14px] font-semibold text-[#111315]">{t.name}</p>
                                    <p className="text-[12px] leading-[16px] text-[#8B9096] mt-0.5">{t.description}</p>
                                </div>
                                {selected && (
                                    <svg className="h-5 w-5 shrink-0 text-[#1693C9]" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.5 7.6a1 1 0 0 1-1.42.006l-3.5-3.5a1 1 0 1 1 1.414-1.414l2.79 2.79 6.796-6.886a1 1 0 0 1 1.414-.006Z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </StepShell>
    );
}
