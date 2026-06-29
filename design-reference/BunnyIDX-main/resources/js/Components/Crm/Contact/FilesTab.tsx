import { useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { Contact } from './types';
import Avatar from '@/Components/Crm/Avatar';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import { FieldLabel, formInputClass as inputClass } from '@/Components/Crm/FormField';

interface ContactFile {
    id: number;
    original_name: string;
    path: string;
    mime_type: string | null;
    size: number;
    description: string | null;
    created_at: string;
    user?: { id: number; name: string } | null;
}

interface Props {
    contact: Contact & { files?: ContactFile[] };
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(d: string): string {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fileIcon(mime: string | null) {
    if (!mime) return 'M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z';
    if (mime.startsWith('image/')) return 'm2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3 19.5h18M3 19.5V4.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 4.5v15';
    if (mime === 'application/pdf') return 'M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z';
    return 'M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z';
}

export default function FilesTab({ contact }: Props) {
    const [showUpload, setShowUpload] = useState(false);

    const files = (contact.files || []) as ContactFile[];
    const storageUrl = (path: string) => `/storage/${path}`;

    function destroy(f: ContactFile) {
        if (!confirm(`Delete "${f.original_name}"?`)) return;
        router.delete(route('crm.contacts.files.destroy', [contact.uuid, f.id]), { preserveScroll: true });
    }

    return (
        <div className="p-3 sm:p-4 lg:p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-[15px] font-semibold text-[#111315]">Files</h2>
                    <p className="text-[13px] text-[#111315] mt-0.5">Documents, contracts, photos and anything else linked to this lead.</p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowUpload(true)}
                    className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold text-white bg-[#1693C9] rounded-[4px] hover:bg-[#1380AF] transition-colors"
                >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                    Upload file
                </button>
            </div>

            <div className="bg-white border border-[#E4E7EB] rounded-[4px] overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-[#F3F4F6] text-[11px] font-semibold text-[#5F656D] tracking-wider">
                        <tr>
                            <th className="text-left px-4 py-2.5">File</th>
                            <th className="text-left px-4 py-2.5 w-40">Uploaded by</th>
                            <th className="text-left px-4 py-2.5 w-32">Date</th>
                            <th className="text-left px-4 py-2.5 w-24">Size</th>
                            <th className="text-right px-4 py-2.5 w-24">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F3F4F6]">
                        {files.length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-10 text-center text-xs text-[#8B9096]">No files yet. Click <strong>Upload file</strong> to add one.</td></tr>
                        ) : files.map((f) => (
                            <tr key={f.id} className="hover:bg-[#FAFBFC] transition-colors">
                                <td className="px-4 py-3">
                                    <a href={storageUrl(f.path)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 group">
                                        <span className="h-8 w-8 inline-flex items-center justify-center rounded-[4px] bg-[#EBF5FF] text-[#1693C9]">
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d={fileIcon(f.mime_type)} />
                                            </svg>
                                        </span>
                                        <span className="text-[13px] font-medium text-[#111315] group-hover:text-[#1693C9] transition-colors">{f.original_name}</span>
                                    </a>
                                </td>
                                <td className="px-4 py-3">
                                    {f.user ? (
                                        <span className="inline-flex items-center gap-2">
                                            <Avatar id={f.user.id} name={f.user.name} size="sm" />
                                            <span className="text-[12px] text-[#5F656D] truncate">{f.user.name}</span>
                                        </span>
                                    ) : <span className="text-[12px] text-[#8B9096]">—</span>}
                                </td>
                                <td className="px-4 py-3 text-[12px] text-[#5F656D]">{formatDate(f.created_at)}</td>
                                <td className="px-4 py-3 text-[12px] text-[#5F656D]">{formatBytes(f.size)}</td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center justify-end gap-1">
                                        <a
                                            href={storageUrl(f.path)}
                                            download={f.original_name}
                                            className="h-7 w-7 inline-flex items-center justify-center rounded-[4px] text-[#8B9096] hover:text-[#1693C9] hover:bg-[#EBF5FF] transition-colors"
                                            title="Download"
                                        >
                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                                        </a>
                                        <button onClick={() => destroy(f)} className="h-7 w-7 inline-flex items-center justify-center rounded-[4px] text-[#8B9096] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors" title="Delete">
                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showUpload && (
                <UploadFileModal
                    contactUuid={contact.uuid}
                    onClose={() => setShowUpload(false)}
                />
            )}
        </div>
    );
}

function formatPickedSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function UploadFileModal({ contactUuid, onClose }: { contactUuid: string; onClose: () => void }) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [description, setDescription] = useState('');
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    function pickFile() { inputRef.current?.click(); }

    function onChange(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0];
        if (f) setFile(f);
    }

    function onDrop(e: React.DragEvent) {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) setFile(f);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!file) return;
        const data = new FormData();
        data.append('file', file);
        if (description.trim()) data.append('description', description.trim());
        setUploading(true);
        router.post(route('crm.contacts.files.upload', contactUuid), data, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => onClose(),
            onFinish: () => setUploading(false),
        });
    }

    const formId = 'contact-upload-file-form';

    const footer = (
        <>
            <button
                type="button"
                onClick={onClose}
                className="h-8 px-4 text-[12px] font-medium text-[#5F656D] hover:text-[#111315] rounded transition-colors"
            >
                Cancel
            </button>
            <button
                type="submit"
                form={formId}
                disabled={!file || uploading}
                className="h-8 px-5 bg-[#1693C9] text-white text-[12px] font-medium rounded hover:bg-[#1380AF] disabled:opacity-30 transition-colors"
            >
                {uploading ? 'Uploading…' : 'Upload'}
            </button>
        </>
    );

    return (
        <SlideOverModal title="Upload File" onClose={onClose} footer={footer}>
            <form id={formId} onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-4">
                    <div>
                        <FieldLabel>File <span className="text-[#DC2626]">*</span></FieldLabel>
                        <input ref={inputRef} type="file" hidden onChange={onChange} />
                        <div
                            onClick={pickFile}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={onDrop}
                            className={`flex flex-col items-center justify-center px-4 py-8 border-2 border-dashed rounded-[4px] cursor-pointer transition-colors ${
                                dragOver ? 'border-[#1693C9] bg-[#EBF5FF]' : 'border-[#D1D5DB] bg-[#FAFBFC] hover:border-[#1693C9] hover:bg-[#F9FAFB]'
                            }`}
                        >
                            {file ? (
                                <div className="text-center">
                                    <svg className="h-7 w-7 text-[#1693C9] mx-auto mb-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                    </svg>
                                    <p className="text-[13px] font-medium text-[#111315] truncate max-w-full">{file.name}</p>
                                    <p className="text-[11px] text-[#8B9096] mt-0.5">{formatPickedSize(file.size)}</p>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setFile(null); if (inputRef.current) inputRef.current.value = ''; }}
                                        className="mt-2 text-[11px] font-medium text-[#DC2626] hover:underline"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <svg className="h-8 w-8 text-[#8B9096] mb-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                                    </svg>
                                    <p className="text-[13px] font-medium text-[#111315]">Drop a file here</p>
                                    <p className="text-[11px] text-[#8B9096] mt-0.5">or click to browse · up to 20 MB</p>
                                </>
                            )}
                        </div>
                    </div>

                    <div>
                        <FieldLabel htmlFor="file_description">Description</FieldLabel>
                        <textarea
                            id="file_description"
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional note about this file"
                            className={inputClass + ' resize-none'}
                        />
                    </div>
                </div>
            </form>
        </SlideOverModal>
    );
}
