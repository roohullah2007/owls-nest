import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { BreadcrumbItem } from '@/types';

type Settings = {
    search_query: string | null;
    mls_numbers: string[] | null;
    agent_id: string | null;
    office_id: string | null;
    result_limit: number;
    is_active: boolean;
};

type PageProps = {
    settings: Settings;
};

const UPDATE_URL = '/admin/idx-settings/featured-listings';

export default function FeaturedListings({ settings }: PageProps) {
    const mlsNumbersText = (settings.mls_numbers ?? []).join('\n');

    return (
        <>
            <Head title="Featured Listings" />

            <p className="mb-6 max-w-2xl text-sm text-gray-500">
                Curate the public Featured Properties page from PrimeMLS — by
                search query, specific MLS listing numbers, an agent id and an
                office id. When inactive, the page shows the latest general
                PrimeMLS listings.
            </p>

            <div className="max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <Form
                    method="patch"
                    action={UPDATE_URL}
                    options={{ preserveScroll: true }}
                    className="space-y-6"
                >
                    {({ processing, errors, recentlySuccessful }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="search_query">
                                    Search query
                                </Label>
                                <Input
                                    id="search_query"
                                    name="search_query"
                                    defaultValue={settings.search_query ?? ''}
                                    placeholder="e.g. waterfront lakefront"
                                />
                                <InputError message={errors.search_query} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="mls_numbers">
                                    MLS listing IDs
                                </Label>
                                <p className="text-sm text-gray-500">
                                    Pin specific listings by their MLS number.
                                    One per line (or separated by commas). These
                                    are shown even if pending or sold.
                                </p>
                                <Textarea
                                    id="mls_numbers"
                                    name="mls_numbers"
                                    rows={4}
                                    defaultValue={mlsNumbersText}
                                    placeholder={'4912345\n4998765'}
                                />
                                <InputError message={errors.mls_numbers} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="agent_id">Agent ID</Label>
                                <Input
                                    id="agent_id"
                                    name="agent_id"
                                    defaultValue={settings.agent_id ?? ''}
                                    placeholder="MLS agent id"
                                />
                                <InputError message={errors.agent_id} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="office_id">Office ID</Label>
                                <Input
                                    id="office_id"
                                    name="office_id"
                                    defaultValue={settings.office_id ?? ''}
                                    placeholder="MLS office id"
                                />
                                <InputError message={errors.office_id} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="result_limit">
                                    Result limit
                                </Label>
                                <Input
                                    id="result_limit"
                                    name="result_limit"
                                    type="number"
                                    min={1}
                                    max={60}
                                    defaultValue={settings.result_limit ?? 12}
                                    className="max-w-[160px]"
                                />
                                <InputError message={errors.result_limit} />
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Hidden field guarantees an explicit "0" is sent
                                when the toggle is unchecked. */}
                                <input
                                    type="hidden"
                                    name="is_active"
                                    value="0"
                                />
                                <Checkbox
                                    id="is_active"
                                    name="is_active"
                                    value="1"
                                    defaultChecked={settings.is_active}
                                />
                                <Label htmlFor="is_active">
                                    Active (use this configuration on the public
                                    page)
                                </Label>
                                <InputError message={errors.is_active} />
                            </div>

                            <div className="flex items-center gap-4">
                                <Button disabled={processing}>Save</Button>
                                {recentlySuccessful && (
                                    <p className="text-sm text-green-600">
                                        Saved.
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'IDX Featured Listings',
        href: '/admin/idx-settings/featured-listings',
    },
];

FeaturedListings.layout = { breadcrumbs };
