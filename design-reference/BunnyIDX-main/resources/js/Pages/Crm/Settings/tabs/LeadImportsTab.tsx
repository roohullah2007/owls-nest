import PrimaryButton from '@/Components/Crm/PrimaryButton';
import { formatDateTime } from '@/utils/dateFormatters';
import { Link, router } from '@inertiajs/react';
import { useRef, useState } from 'react';

interface LeadImportRow {
    id: number;
    original_filename: string;
    row_count: number;
    imported_count: number;
    skipped_count: number;
    status: 'pending' | 'mapped' | 'processing' | 'completed' | 'failed';
    error: string | null;
    created_at: string;
    completed_at: string | null;
}

interface Props {
    leadImports: LeadImportRow[];
}

function statusStyles(status: LeadImportRow['status']): { bg: string; color: string; label: string } {
    switch (status) {
        case 'completed':
            return { bg: '#ECFDF5', color: '#059669', label: 'Completed' };
        case 'failed':
            return { bg: '#FEF2F2', color: '#DC2626', label: 'Failed' };
        case 'processing':
            return { bg: '#EFF6FF', color: '#2563EB', label: 'Processing' };
        case 'mapped':
        case 'pending':
            return { bg: '#FFFBEB', color: '#D97706', label: 'Pending' };
        default:
            return { bg: '#F3F4F6', color: '#5F656D', label: status };
    }
}

export default function LeadImportsTab({ leadImports }: Props) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    function pickFile() {
        fileRef.current?.click();
    }

    function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        router.post(
            route('crm.lead-imports.upload'),
            { file },
            {
                forceFormData: true,
                onFinish: () => {
                    setUploading(false);
                    if (fileRef.current) fileRef.current.value = '';
                },
            },
        );
    }

    function handleDelete(row: LeadImportRow) {
        if (!confirm(`Delete the import "${row.original_filename}"? This won't remove imported contacts.`)) return;
        router.delete(route('crm.lead-imports.destroy', row.id), { preserveScroll: true });
    }

    return (
        <div className="max-w-4xl space-y-6">
            <div>
                <h2 className="text-base font-semibold text-[#111315]">Lead Imports</h2>
                <p className="mt-1 text-[13px] text-[#5F656D]">
                    Upload a CSV file to bulk-import contacts. After upload you'll map columns to contact fields and confirm.
                </p>
            </div>

            <div className="bg-white border border-[#E4E7EB] rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-sm font-semibold text-[#111315]">Import a CSV</h3>
                        <p className="mt-1 text-xs text-[#5F656D]">
                            Accepted file type: <span className="font-medium text-[#111315]">.csv</span> · Max 5 MB.
                            Not sure about the format? Start from the sample.
                        </p>
                    </div>
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".csv,text/csv"
                        onChange={handleFile}
                        className="hidden"
                    />
                    <div className="flex shrink-0 items-center gap-2">
                        <a
                            href={route('crm.lead-imports.sample')}
                            className="inline-flex h-9 items-center px-4 text-xs font-medium text-[#1693C9] border border-[#1693C9] rounded-full hover:bg-[#EFF6FF] transition-colors"
                        >
                            Download Sample CSV
                        </a>
                        <PrimaryButton
                            onClick={pickFile}
                            disabled={uploading}
                            label={uploading ? 'Uploading…' : 'Upload CSV'}
                        />
                    </div>
                </div>

                <ul className="mt-4 space-y-1.5 border-t border-[#F0F1F3] pt-4 text-xs text-[#5F656D]">
                    <li>• Use the sample CSV layout. Common columns (First/Last Name, Email, Phone, Source, Status, City, State, Notes) are mapped automatically — you confirm the mapping after upload.</li>
                    <li>• Each row needs at least an <span className="font-medium text-[#111315]">email or phone</span> (a name alone also works).</li>
                    <li>• Duplicates are skipped automatically — matched by email first, then phone.</li>
                    <li>• Rows with an invalid email or no usable data are skipped and reported in the result; one bad row won't stop the rest.</li>
                </ul>
            </div>

            <div className="bg-white border border-[#E4E7EB] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-[#E4E7EB]">
                    <h3 className="text-sm font-semibold text-[#111315]">Recent Imports</h3>
                </div>
                {leadImports.length === 0 ? (
                    <div className="px-5 py-12 text-center text-sm text-[#8B9096]">
                        No imports yet. Upload a CSV to get started.
                    </div>
                ) : (
                    <div className="divide-y divide-[#E4E7EB]">
                        {leadImports.map((row) => {
                            const style = statusStyles(row.status);
                            const isPending = row.status === 'pending' || row.status === 'mapped';
                            return (
                                <div key={row.id} className="flex items-center gap-4 px-5 py-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[13px] font-medium text-[#111315] truncate">
                                                {row.original_filename}
                                            </span>
                                            <span
                                                className="shrink-0 px-2 py-0.5 text-[10px] font-medium rounded-full"
                                                style={{ backgroundColor: style.bg, color: style.color }}
                                            >
                                                {style.label}
                                            </span>
                                        </div>
                                        <div className="mt-0.5 text-xs text-[#8B9096]">
                                            {row.row_count} rows · imported {row.imported_count}
                                            {row.skipped_count > 0 && ` · skipped ${row.skipped_count}`} ·{' '}
                                            {formatDateTime(row.created_at, '—')}
                                        </div>
                                        {row.error && (
                                            <div className="mt-1 text-xs text-[#DC2626]">{row.error}</div>
                                        )}
                                    </div>
                                    {isPending && (
                                        <Link
                                            href={route('crm.lead-imports.show', row.id)}
                                            className="shrink-0 inline-flex items-center h-8 px-3 text-xs font-medium text-[#1693C9] hover:bg-[#EFF6FF] rounded-full transition-colors"
                                        >
                                            Continue
                                        </Link>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(row)}
                                        className="shrink-0 p-2 text-[#8B9096] hover:text-[#DC2626] transition-colors"
                                        title="Delete"
                                    >
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                        </svg>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
