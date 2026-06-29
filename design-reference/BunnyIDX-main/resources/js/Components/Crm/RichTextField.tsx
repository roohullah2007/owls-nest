import { useRef } from 'react';
import RichTextEditor, { FormatButton, RichTextEditorHandle } from './RichTextEditor';

interface Props {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    minHeight?: number;
}

/**
 * Form-friendly rich-text input: the shared contenteditable RichTextEditor with
 * its own compact formatting toolbar (bold / italic / underline / lists / link).
 * Use anywhere a textarea isn't enough (community descriptions, blog excerpts…).
 */
export default function RichTextField({ value, onChange, placeholder, minHeight = 120 }: Props) {
    const editorRef = useRef<RichTextEditorHandle>(null);

    function addLink() {
        const url = prompt('Link URL (https://…)');
        if (!url) return;
        document.execCommand('createLink', false, url);
        editorRef.current?.focus();
    }

    return (
        <div>
            <div className="flex items-center gap-0.5 border border-b-0 border-[#E4E7EB] rounded-t-xl bg-[#FAFBFC] px-1.5 py-1">
                <FormatButton command="bold" title="Bold (⌘B)" icon={
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3.75v16.5h7.875a4.125 4.125 0 0 0 0-8.25H6.75m0 0h6.375a3.75 3.75 0 0 0 0-7.5H6.75Z" /></svg>
                } />
                <FormatButton command="italic" title="Italic (⌘I)" icon={
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.25 3.75H9.75M14.25 20.25H9.75M14.5 3.75 9.5 20.25" /></svg>
                } />
                <FormatButton command="underline" title="Underline (⌘U)" icon={
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 3.75v9a5.25 5.25 0 0 1-10.5 0v-9M5.25 20.25h13.5" /></svg>
                } />
                <span className="mx-1 h-4 w-px bg-[#E4E7EB]" />
                <FormatButton command="formatBlock" value="h2" title="Heading" icon={
                    <span className="text-[11px] font-bold leading-none">H1</span>
                } />
                <FormatButton command="formatBlock" value="h3" title="Subheading" icon={
                    <span className="text-[11px] font-bold leading-none">H2</span>
                } />
                <FormatButton command="formatBlock" value="p" title="Paragraph" icon={
                    <span className="text-[11px] font-semibold leading-none">¶</span>
                } />
                <span className="mx-1 h-4 w-px bg-[#E4E7EB]" />
                <FormatButton command="insertUnorderedList" title="Bullet list" icon={
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
                } />
                <FormatButton command="insertOrderedList" title="Numbered list" icon={
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.5 5.25l1-1v3.5m-1.5 4.5h2l-2 2.5h2m-2 3h1.5a.75.75 0 0 1 0 1.5H4m.5 1.5H3" /></svg>
                } />
                <span className="mx-1 h-4 w-px bg-[#E4E7EB]" />
                <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); addLink(); }}
                    title="Insert link"
                    className="inline-flex items-center justify-center h-7 w-7 rounded-md text-[#5F656D] hover:text-[#111315] hover:bg-[#F3F4F6] transition-colors"
                >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" /></svg>
                </button>
            </div>
            <div className="[&>div]:rounded-t-none [&>div]:rounded-b-xl [&>div]:shadow-none">
                <RichTextEditor ref={editorRef} value={value} onChange={onChange} placeholder={placeholder} minHeight={minHeight} />
            </div>
        </div>
    );
}
