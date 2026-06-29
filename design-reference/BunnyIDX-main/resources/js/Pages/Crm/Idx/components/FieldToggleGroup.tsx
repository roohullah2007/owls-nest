interface FieldDef {
    key: string;
    label: string;
}

interface Props {
    fields: FieldDef[];
    values: Record<string, boolean>;
    onChange: (key: string, value: boolean) => void;
}

export default function FieldToggleGroup({ fields, values, onChange }: Props) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {fields.map((f) => (
                <label key={f.key} className="flex items-center gap-2 cursor-pointer group">
                    <button
                        type="button"
                        onClick={() => onChange(f.key, !values[f.key])}
                        className={`relative h-5 w-9 rounded-full transition-colors ${values[f.key] ? 'bg-[#0f172a]' : 'bg-[#cbd5e1]'}`}
                    >
                        <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${values[f.key] ? 'translate-x-4' : ''}`} />
                    </button>
                    <span className="text-[11px] text-[#475569] group-hover:text-[#0f172a]">{f.label}</span>
                </label>
            ))}
        </div>
    );
}
