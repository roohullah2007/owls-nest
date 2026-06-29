interface Props {
    label: string;
    value: string;
    onChange: (value: string) => void;
}

export default function ColorPicker({ label, value, onChange }: Props) {
    return (
        <div className="flex items-center gap-2">
            <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-7 w-7 border border-[#E4E7EB] cursor-pointer p-0 bg-transparent"
            />
            <div className="flex-1 min-w-0">
                <p className="text-[11px] text-[#5F656D] leading-tight">{label}</p>
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="text-[11px] font-mono text-[#5F656D] bg-transparent border-none p-0 w-full focus:outline-none focus:ring-0"
                    maxLength={7}
                />
            </div>
        </div>
    );
}
