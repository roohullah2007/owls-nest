import { Link } from '@inertiajs/react';
import Avatar from '@/Components/Crm/Avatar';
import { formatPhone } from '@/utils/phone';
import type { ContactDto, CurrentCall } from './types';
import { capitalize, elapsedSince, formatCurrency, summarizeFilters } from './utils';

/**
 * Right column lead card — teal header (mirrors the contact-show LeftCard) +
 * contact info rows + quick-view tabs (Searches / Properties / Deals).
 */

interface Props {
    contact: ContactDto | null;
    current: CurrentCall | null;
    activeTab: 'searches' | 'properties' | 'deals';
    onTabChange: (tab: 'searches' | 'properties' | 'deals') => void;
}

export default function LeadContextCard({ contact, current, activeTab, onTabChange }: Props) {
    if (!contact) {
        return (
            <div className="border border-[#E4E7EB] bg-white rounded-xl p-5 text-center">
                <p className="text-[12px] text-[#8B9096] italic">Queue exhausted — no current lead.</p>
            </div>
        );
    }
    return (
        <div className="border border-[#E4E7EB] bg-white rounded-xl overflow-hidden">
            <LeadHeader contact={contact} />
            <ContactInfo contact={contact} />
            <QuickViewTabs contact={contact} current={current} activeTab={activeTab} onTabChange={onTabChange} />
        </div>
    );
}

function LeadHeader({ contact }: { contact: ContactDto }) {
    return (
        <div className="bg-[#0B577A] px-5 py-4 space-y-3">
            <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-white/15 text-white">
                    {contact.type ? capitalize(contact.type) : 'Lead'}
                </span>
                {contact.status && (
                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-white/15 text-white">
                        {capitalize(contact.status)}
                    </span>
                )}
                {contact.dnd_mode === 'all' && (
                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#DC2626] text-white">DNC</span>
                )}
                <Link
                    href={route('crm.contacts.show', contact.uuid)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open full lead profile"
                    className="ml-auto h-7 w-7 inline-flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-colors"
                >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                </Link>
            </div>
            <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                    <Avatar id={contact.id} name={`${contact.first_name} ${contact.last_name}`} size="xl" />
                    {contact.lead_score !== null && contact.lead_score !== undefined && (
                        <span
                            className="absolute -bottom-1 -right-1 inline-flex items-center justify-center h-5 min-w-[20px] px-1 text-[10px] font-bold rounded-full text-white ring-2 ring-white"
                            style={{ backgroundColor: contact.lead_score >= 60 ? '#059669' : contact.lead_score >= 30 ? '#D97706' : '#DC2626' }}
                        >
                            {contact.lead_score}
                        </span>
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <Link
                        href={route('crm.contacts.show', contact.uuid)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-[15px] font-semibold text-white hover:underline leading-tight truncate"
                    >
                        {contact.first_name} {contact.last_name}
                    </Link>
                    {contact.last_contacted_at ? (
                        <p className="text-[11px] text-white/80 mt-0.5">Active {elapsedSince(contact.last_contacted_at)}</p>
                    ) : (
                        <p className="text-[11px] text-white/80 mt-0.5">Never contacted</p>
                    )}
                </div>
            </div>
        </div>
    );
}

function ContactInfo({ contact }: { contact: ContactDto }) {
    return (
        <div className="px-5 py-4 space-y-3">
            <p className="text-[10px] font-semibold text-[#8B9096] tracking-wider">Contact Info</p>
            {contact.email && (
                <Row
                    iconBg="#1693C9"
                    icon="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                >
                    <a href={`mailto:${contact.email}`} className="text-[13px] text-[#1693C9] hover:underline break-all">{contact.email}</a>
                </Row>
            )}
            {contact.phone && (
                <Row
                    iconBg="#059669"
                    icon="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
                >
                    <span className="text-[13px] text-[#111315] tabular-nums">{formatPhone(contact.phone)}</span>
                </Row>
            )}
            {contact.mobile && contact.mobile !== contact.phone && (
                <Row
                    iconBg="#0891B2"
                    icon="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
                >
                    <span className="text-[13px] text-[#111315] tabular-nums">{formatPhone(contact.mobile)}</span>
                </Row>
            )}
        </div>
    );
}

function Row({ icon, iconBg, children }: { icon: string; iconBg: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-2.5">
            <span className="shrink-0 h-7 w-7 flex items-center justify-center rounded-full" style={{ backgroundColor: iconBg }}>
                <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                </svg>
            </span>
            {children}
        </div>
    );
}

function QuickViewTabs({ contact, current, activeTab, onTabChange }: Props) {
    return (
        <div className="border-t border-[#E4E7EB]">
            <div className="flex items-center px-3 pt-2">
                <TabButton active={activeTab === 'searches'} onClick={() => onTabChange('searches')} count={current?.lead_searches?.length ?? 0}>Searches</TabButton>
                <TabButton active={activeTab === 'properties'} onClick={() => onTabChange('properties')} count={current?.lead_listings?.length ?? 0}>Properties</TabButton>
                <TabButton active={activeTab === 'deals'} onClick={() => onTabChange('deals')} count={current?.lead_deals?.length ?? 0}>Deals</TabButton>
            </div>

            {activeTab === 'searches' && (
                <List
                    empty="No saved searches."
                    items={current?.lead_searches ?? []}
                    footerLink={route('crm.contacts.tab', { contact: contact!.uuid, tab: 'searches' })}
                    footerLabel="View all searches"
                    render={(s) => (
                        <Link
                            href={route('crm.contacts.tab', { contact: contact!.uuid, tab: 'searches' })}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block hover:bg-[#F9FAFB]"
                        >
                            <p className="text-[12px] text-[#111315] truncate font-medium">{s.name || 'Untitled search'}</p>
                            <p className="text-[10px] text-[#8B9096] truncate">{summarizeFilters(s.filters)}</p>
                        </Link>
                    )}
                />
            )}

            {activeTab === 'properties' && (
                <List
                    empty="No properties on this lead."
                    items={current?.lead_listings ?? []}
                    footerLink={route('crm.contacts.tab', { contact: contact!.uuid, tab: 'properties' })}
                    footerLabel="View all properties"
                    render={(l) => (
                        <Link
                            href={route('crm.contacts.tab', { contact: contact!.uuid, tab: 'properties' })}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block hover:bg-[#F9FAFB]"
                        >
                            <p className="text-[12px] text-[#111315] truncate font-medium">{l.title || l.address || `Listing #${l.id}`}</p>
                            <p className="text-[10px] text-[#8B9096] truncate">
                                {[l.city, l.state_province].filter(Boolean).join(', ')}
                                {l.price ? ` · ${formatCurrency(l.price)}` : ''}
                                {l.bedrooms ? ` · ${l.bedrooms}bd` : ''}
                                {l.bathrooms ? `/${l.bathrooms}ba` : ''}
                            </p>
                        </Link>
                    )}
                />
            )}

            {activeTab === 'deals' && (
                <List
                    empty="No deals linked."
                    items={current?.lead_deals ?? []}
                    footerLink={route('crm.contacts.tab', { contact: contact!.uuid, tab: 'deals' })}
                    footerLabel="View all deals"
                    render={(d) => (
                        <Link
                            href={route('crm.contacts.tab', { contact: contact!.uuid, tab: 'deals' })}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block hover:bg-[#F9FAFB]"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-[12px] text-[#111315] truncate font-medium flex-1">{d.title}</p>
                                {d.value != null && <span className="text-[11px] text-[#059669] font-semibold shrink-0">{formatCurrency(d.value)}</span>}
                            </div>
                            {d.pipeline_stage && (
                                <p className="text-[10px] mt-0.5" style={{ color: d.pipeline_stage.color ?? '#8B9096' }}>{d.pipeline_stage.name}</p>
                            )}
                        </Link>
                    )}
                />
            )}
        </div>
    );
}

function TabButton({ active, onClick, count, children }: { active: boolean; onClick: () => void; count?: number; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={`relative px-3 py-2 text-[12px] font-medium transition-colors ${
                active ? 'text-[#111315]' : 'text-[#5F656D] hover:text-[#111315]'
            }`}
        >
            <span>{children}</span>
            {typeof count === 'number' && count > 0 && (
                <span className="ml-1 text-[10px] text-[#8B9096]">({count})</span>
            )}
            {active && <span className="absolute left-2 right-2 -bottom-px h-0.5 bg-[#1693C9] rounded-full" />}
        </button>
    );
}

function List<T extends { id: number }>({ items, render, empty, footerLink, footerLabel }: { items: T[]; render: (item: T) => React.ReactNode; empty: string; footerLink?: string; footerLabel?: string }) {
    if (items.length === 0) {
        return <p className="text-[11px] text-[#8B9096] italic text-center px-4 py-5">{empty}</p>;
    }
    return (
        <>
            <ul className="max-h-56 overflow-y-auto">
                {items.map((item) => (
                    <li key={item.id} className="px-4 py-2 border-b border-[#F3F4F6] last:border-b-0">{render(item)}</li>
                ))}
            </ul>
            {footerLink && footerLabel && (
                <Link
                    href={footerLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-4 py-2 text-[11px] font-medium text-[#1693C9] hover:bg-[#F9FAFB] border-t border-[#F3F4F6] text-center"
                >
                    {footerLabel} →
                </Link>
            )}
        </>
    );
}
