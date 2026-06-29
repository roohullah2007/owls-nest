import { useRef, useState, useCallback, useEffect } from 'react';

interface TeamMember {
    id: number;
    user_id: number;
    user: { id: number; name: string; email: string };
}

interface Props {
    value: string;
    onChange: (value: string) => void;
    teamMembers: TeamMember[];
    placeholder?: string;
    rows?: number;
    className?: string;
    required?: boolean;
}

export default function MentionInput({ value, onChange, teamMembers, placeholder, rows = 3, className, required }: Props) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [mentionStart, setMentionStart] = useState<number | null>(null);

    const filtered = teamMembers.filter(m =>
        m.user.name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 6);

    const checkForMention = useCallback(() => {
        const el = textareaRef.current;
        if (!el) return;
        const pos = el.selectionStart;
        const textBefore = value.slice(0, pos);
        const atIndex = textBefore.lastIndexOf('@');

        if (atIndex === -1 || (atIndex > 0 && /\w/.test(textBefore[atIndex - 1]))) {
            setShowDropdown(false);
            setMentionStart(null);
            return;
        }

        const afterAt = textBefore.slice(atIndex + 1);
        if (/\s{2,}/.test(afterAt) || afterAt.includes('\n')) {
            setShowDropdown(false);
            setMentionStart(null);
            return;
        }

        setQuery(afterAt);
        setMentionStart(atIndex);
        setShowDropdown(true);
        setSelectedIndex(0);
    }, [value]);

    function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
        onChange(e.target.value);
    }

    useEffect(() => {
        checkForMention();
    }, [value, checkForMention]);

    function selectMember(member: TeamMember) {
        if (mentionStart === null) return;
        const el = textareaRef.current;
        const pos = el?.selectionStart || value.length;
        const before = value.slice(0, mentionStart);
        const after = value.slice(pos);
        const mention = `@[${member.user.name}](${member.user.id})`;
        const newValue = before + mention + ' ' + after;
        onChange(newValue);
        setShowDropdown(false);
        setMentionStart(null);

        requestAnimationFrame(() => {
            if (el) {
                const newPos = before.length + mention.length + 1;
                el.selectionStart = newPos;
                el.selectionEnd = newPos;
                el.focus();
            }
        });
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (!showDropdown || filtered.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(i => (i + 1) % filtered.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(i => (i - 1 + filtered.length) % filtered.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            selectMember(filtered[selectedIndex]);
        } else if (e.key === 'Escape') {
            setShowDropdown(false);
        }
    }

    return (
        <div className="relative">
            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                rows={rows}
                className={className}
                required={required}
            />
            {showDropdown && filtered.length > 0 && (
                <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-[#E4E7EB] rounded shadow-lg max-h-40 overflow-y-auto">
                    {filtered.map((m, i) => (
                        <li
                            key={m.id}
                            onMouseDown={(e) => { e.preventDefault(); selectMember(m); }}
                            className={`px-3 py-2 text-xs cursor-pointer flex items-center gap-2 ${
                                i === selectedIndex ? 'bg-[#EDE9FE] text-[#7C3AED]' : 'hover:bg-[#F3F4F6] text-[#5F656D]'
                            }`}
                        >
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#7C3AED] text-white text-[9px] font-bold shrink-0">
                                {m.user.name.charAt(0).toUpperCase()}
                            </span>
                            <span className="font-medium">{m.user.name}</span>
                            <span className="text-[#8B9096] ml-auto">{m.user.email}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
