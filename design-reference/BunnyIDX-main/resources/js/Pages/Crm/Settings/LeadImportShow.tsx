import CrmLayout from '@/Layouts/CrmLayout';
import PrimaryButton from '@/Components/Crm/PrimaryButton';
import ToolbarSelect from '@/Components/Crm/ToolbarSelect';
import { Head, Link, useForm } from '@inertiajs/react';

interface ImportData {
    id: number;
    original_filename: string;
    headers: string[];
    mapping: Record<string, string>;
    row_count: number;
    status: string;
    default_type: string | null;
    default_source: string | null;
}

interface Props {
    import: ImportData;
    preview: string[][];
    targetFields: Record<string, string>;
    leadTypes: string[];
}

export default function LeadImportShow({ import: imp, preview, targetFields, leadTypes }: Props) {
    const form = useForm({
        mapping: { ...imp.mapping } as Record<string, string>,
        default_type: imp.default_type || '',
        default_source: imp.default_source || 'Import',
    });

    function setMapping(colIndex: number, field: string) {
        form.setData('mapping', { ...form.data.mapping, [String(colIndex)]: field });
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        form.post(route('crm.lead-imports.process', imp.id));
    }

    const mappedCount = Object.values(form.data.mapping).filter((v) => !!v).length;

    const fieldOptions = [
        { value: '', label: 'Skip column' },
        ...Object.entries(targetFields).map(([value, label]) => ({ value, label })),
    ];

    return (
        <CrmLayout>
            <Head title={`Import — ${imp.original_filename}`} />

            <div className="flex-1 overflow-auto p-4 sm:p-5 md:p-6">
                <div className="mx-auto max-w-4xl space-y-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href={route('crm.settings', { tab: 'lead-imports' })}
                            className="text-xs font-medium text-[#5F656D] hover:text-[#111315]"
                        >
                            ← Lead Imports
                        </Link>
                    </div>

                    <div>
                        <h1 className="text-lg font-normal text-[#111315]">{imp.original_filename}</h1>
                        <p className="mt-1 text-xs text-[#5F656D]">
                            {imp.row_count} rows · {mappedCount} of {imp.headers.length} columns mapped
                        </p>
                    </div>

                    <form onSubmit={submit} className="space-y-4">
                        <div className="bg-white border border-[#E4E7EB] rounded-xl p-5 space-y-4">
                            <div>
                                <h2 className="text-sm font-semibold text-[#111315]">Defaults</h2>
                                <p className="mt-1 text-xs text-[#5F656D]">
                                    Applied to every imported contact unless overridden by a mapped column.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-medium text-[#8B9096] tracking-wider mb-1.5">
                                        Default Lead Type
                                    </label>
                                    <ToolbarSelect
                                        width="w-full"
                                        value={form.data.default_type}
                                        onChange={(v) => form.setData('default_type', v)}
                                        options={[
                                            { value: '', label: 'No default' },
                                            ...leadTypes.map((t) => ({ value: t, label: t })),
                                        ]}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-medium text-[#8B9096] tracking-wider mb-1.5">
                                        Source
                                    </label>
                                    <input
                                        type="text"
                                        value={form.data.default_source}
                                        onChange={(e) => form.setData('default_source', e.target.value)}
                                        placeholder="Import"
                                        className="w-full h-9 px-3 text-xs bg-white text-[#303030] placeholder-[#8B9096] border border-[#C8CCD1] rounded-full focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9] transition-colors"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border border-[#E4E7EB] rounded-xl overflow-hidden">
                            <div className="px-5 py-3 border-b border-[#E4E7EB]">
                                <h2 className="text-sm font-semibold text-[#111315]">Map Columns</h2>
                                <p className="mt-0.5 text-xs text-[#5F656D]">
                                    Match each CSV column to a contact field. Map at least one of Email, First Name, or Last Name.
                                </p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead className="bg-[#F9FAFB]">
                                        <tr>
                                            <th className="px-4 py-2.5 text-left font-medium text-[#5F656D] w-1/3">CSV Column</th>
                                            <th className="px-4 py-2.5 text-left font-medium text-[#5F656D] w-1/3">Maps To</th>
                                            <th className="px-4 py-2.5 text-left font-medium text-[#5F656D] w-1/3">Sample</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E4E7EB]">
                                        {imp.headers.map((header, idx) => {
                                            const sample = preview[0]?.[idx] ?? '';
                                            return (
                                                <tr key={idx}>
                                                    <td className="px-4 py-2 font-medium text-[#111315]">{header || `Column ${idx + 1}`}</td>
                                                    <td className="px-4 py-2">
                                                        <ToolbarSelect
                                                            width="w-full"
                                                            value={form.data.mapping[String(idx)] || ''}
                                                            onChange={(v) => setMapping(idx, v)}
                                                            options={fieldOptions}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2 text-[#8B9096] truncate max-w-[200px]">{sample}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {form.errors.mapping && (
                            <div className="text-xs text-[#DC2626]">{form.errors.mapping}</div>
                        )}

                        <div className="bg-white border border-[#E4E7EB] rounded-xl overflow-hidden">
                            <div className="px-5 py-3 border-b border-[#E4E7EB]">
                                <h2 className="text-sm font-semibold text-[#111315]">Preview (first {preview.length} rows)</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead className="bg-[#F9FAFB]">
                                        <tr>
                                            {imp.headers.map((h, i) => (
                                                <th key={i} className="px-3 py-2 text-left font-medium text-[#5F656D] whitespace-nowrap">
                                                    {h || `Column ${i + 1}`}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E4E7EB]">
                                        {preview.map((row, ri) => (
                                            <tr key={ri}>
                                                {imp.headers.map((_, ci) => (
                                                    <td key={ci} className="px-3 py-2 text-[#5F656D] whitespace-nowrap max-w-[160px] truncate">
                                                        {row[ci] ?? ''}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2">
                            <Link
                                href={route('crm.settings', { tab: 'lead-imports' })}
                                className="h-9 px-4 inline-flex items-center text-xs font-medium text-[#5F656D] hover:text-[#111315] border border-[#C8CCD1] rounded-full hover:bg-[#F9FAFB] transition-colors"
                            >
                                Cancel
                            </Link>
                            <PrimaryButton
                                type="submit"
                                label={form.processing ? 'Importing…' : `Import ${imp.row_count} rows`}
                                disabled={form.processing || mappedCount === 0}
                                icon={null}
                                labelClassName=""
                            />
                        </div>
                    </form>
                </div>
            </div>
        </CrmLayout>
    );
}
