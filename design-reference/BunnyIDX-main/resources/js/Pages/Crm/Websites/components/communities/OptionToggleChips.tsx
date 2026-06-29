import { labelClass } from '../../constants';

/** Multi-select toggle chips (property types, statuses) from taxonomy options. */
export default function OptionToggleChips({
    label,
    help,
    options,
    value,
    onChange,
    emptyHint,
}: {
    label: string;
    help?: string;
    options: { value: string; label: string }[];
    value: string[];
    onChange: (next: string[]) => void;
    emptyHint?: string;
}) {
    function toggle(v: string) {
        onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
    }

    return (
        <div>
            <label className={labelClass}>{label}</label>
            {options.length === 0 ? (
                <p className="text-[12px] text-[#8B9096]">{emptyHint || 'No options available.'}</p>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {options.map((o) => {
                        const on = value.includes(o.value);
                        return (
                            <button
                                key={o.value}
                                type="button"
                                onClick={() => toggle(o.value)}
                                className={`rounded-full border px-3 py-1 text-[12px] font-medium transition-all ${
                                    on
                                        ? 'border-[#1693C9] bg-[#1693C9] text-white'
                                        : 'border-[#E4E7EB] bg-white text-[#5F656D] hover:border-[#1693C9]/50'
                                }`}
                            >
                                {o.label}
                            </button>
                        );
                    })}
                </div>
            )}
            {help && <p className="mt-1 text-[11px] text-[#8B9096]">{help}</p>}
        </div>
    );
}
