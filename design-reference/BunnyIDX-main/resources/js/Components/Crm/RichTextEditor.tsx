import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

interface Props {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    minHeight?: number;
}

export interface RichTextEditorHandle {
    focus: () => void;
    insertHtml: (html: string) => void;
}

/**
 * Minimal contenteditable rich-text editor.
 * Toolbar lives outside this component and calls execCommand via `RichTextEditorHandle`.
 */
const RichTextEditor = forwardRef<RichTextEditorHandle, Props>(function RichTextEditor(
    { value, onChange, placeholder, minHeight = 140 },
    ref,
) {
    const editorRef = useRef<HTMLDivElement>(null);

    // Sync external value into the editor only when it doesn't match (avoids
    // wiping the user's selection while they're typing).
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value;
        }
    }, [value]);

    useImperativeHandle(ref, () => ({
        focus: () => editorRef.current?.focus(),
        insertHtml: (html: string) => {
            editorRef.current?.focus();
            document.execCommand('insertHTML', false, html);
            // Sync state after manual mutation
            if (editorRef.current) onChange(editorRef.current.innerHTML);
        },
    }));

    function handleInput() {
        if (editorRef.current) onChange(editorRef.current.innerHTML);
    }

    return (
        <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onBlur={handleInput}
            data-placeholder={placeholder}
            className="w-full text-sm border border-[#E4E7EB] rounded-xl px-4 py-3 text-[#111315] bg-white focus:outline-none focus:ring-2 focus:ring-[#1693C9]/20 focus:border-[#1693C9] shadow-sm max-w-none [&_p]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-[#1693C9] [&_a]:underline [&_h2]:text-[17px] [&_h2]:font-semibold [&_h2]:text-[#111315] [&_h2]:mt-4 [&_h2]:mb-1.5 [&_h3]:text-[15px] [&_h3]:font-semibold [&_h3]:text-[#111315] [&_h3]:mt-4 [&_h3]:mb-1.5 [&_h4]:text-[13.5px] [&_h4]:font-semibold [&_h4]:mt-3 [&_h4]:mb-1 [&_blockquote]:border-l-2 [&_blockquote]:border-[#E4E7EB] [&_blockquote]:pl-3 [&_blockquote]:italic empty:before:content-[attr(data-placeholder)] empty:before:text-[#8B9096]"
            style={{ minHeight }}
            suppressContentEditableWarning
        />
    );
});

export default RichTextEditor;

/** Toolbar button helper for execCommand-based actions. */
export function FormatButton({ command, value, icon, title, active }: { command: string; value?: string; icon: React.ReactNode; title: string; active?: boolean }) {
    return (
        <button
            type="button"
            onMouseDown={(e) => {
                e.preventDefault();
                document.execCommand(command, false, value);
            }}
            title={title}
            className={`inline-flex items-center justify-center h-7 w-7 rounded-md transition-colors ${
                active ? 'bg-[#E6F0FF] text-[#1693C9]' : 'text-[#5F656D] hover:text-[#111315] hover:bg-[#F3F4F6]'
            }`}
        >
            {icon}
        </button>
    );
}
