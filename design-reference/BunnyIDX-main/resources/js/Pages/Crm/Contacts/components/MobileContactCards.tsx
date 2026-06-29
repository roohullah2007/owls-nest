import { Link } from '@inertiajs/react';
import { getAvatarColor } from '@/utils/avatarColors';
import { formatRelative } from '@/utils/dateFormatters';
import { Contact, PaginatedContacts } from './types';
import { typeColors, defaultTypeColor } from './constants';
import { capitalize } from './utils';
import EmptyContacts from './EmptyContacts';

/**
 * Mobile-only card list (md:hidden). Each row shows checkbox + avatar + name +
 * type pill + email/phone + tag chips, with a last-activity hint on the right.
 *
 * Renders the empty state when there are no contacts and the page-level pagination
 * footer underneath.
 */
interface Props {
    contacts: PaginatedContacts;
    selectedIds: number[];
    onToggleSelect: (id: number) => void;
    onAddFirstContact: () => void;
    filtered: boolean;
    onClearFilters: () => void;
}

export default function MobileContactCards({ contacts, selectedIds, onToggleSelect, onAddFirstContact, filtered, onClearFilters }: Props) {
    return (
        <div className="md:hidden space-y-2">
            {contacts.data.length === 0 ? (
                <div className="bg-white border border-[#E4E7EB] rounded-xl">
                    <EmptyContacts filtered={filtered} onAddFirstContact={onAddFirstContact} onClearFilters={onClearFilters} />
                </div>
            ) : (
                contacts.data.map((contact: Contact) => {
                    const isSelected = selectedIds.includes(contact.id);
                    const colors = typeColors[contact.type] || defaultTypeColor;
                    return (
                        <div key={contact.id} className={`bg-white border border-[#E4E7EB] rounded-[4px] shadow-sm p-3 transition-colors ${isSelected ? 'bg-[#E6F0FF] border-[#1693C9]/30' : ''}`}>
                            <div className="flex items-start gap-3">
                                <input type="checkbox" checked={isSelected} onChange={() => onToggleSelect(contact.id)} className="h-[18px] w-[18px] mt-0.5 rounded-[4px] border-[#D1D5DB] text-[#1693C9] focus:ring-0 focus:ring-offset-0 cursor-pointer shrink-0" />
                                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white" style={{ backgroundColor: getAvatarColor(contact.id) }}>
                                    {contact.first_name.charAt(0)}{contact.last_name.charAt(0)}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <Link href={route('crm.contacts.show', contact.uuid)} className="text-[13px] font-medium text-[#1693C9] hover:underline truncate">
                                            {contact.first_name} {contact.last_name}
                                        </Link>
                                        <span className="inline-flex px-2 py-0.5 text-[10px] font-medium whitespace-nowrap rounded-full shrink-0" style={{ backgroundColor: colors.bg, color: colors.text }}>
                                            {capitalize(contact.type)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-[11px] text-[#5F656D]">
                                        {contact.email && <span className="truncate">{contact.email}</span>}
                                        {contact.phone && <span className="shrink-0">{contact.phone}</span>}
                                    </div>
                                    {contact.tags.length > 0 && (
                                        <div className="flex gap-1 mt-1.5 overflow-hidden">
                                            {contact.tags.map((tag) => (
                                                <span key={tag.id} className="inline-flex shrink-0 items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-semibold rounded-full text-white" style={{ backgroundColor: tag.color }}>
                                                    {tag.name.toLowerCase() === 'hot lead' && <span className="text-[9px] leading-none">🔥</span>}
                                                    {tag.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <span className="text-[10px] text-[#8B9096] shrink-0 mt-0.5">{formatRelative(contact.last_contacted_at, '—')}</span>
                            </div>
                        </div>
                    );
                })
            )}

            {/* Mobile pagination */}
            {contacts.last_page > 1 && (
                <div className="flex items-center justify-between bg-white border border-[#E4E7EB] rounded-[4px] px-3 py-2">
                    <span className="text-[10px] text-[#5F656D] font-medium">Page {contacts.current_page} / {contacts.last_page}</span>
                    <div className="flex gap-1">
                        {contacts.links.filter(l => l.label.includes('Previous') || l.label.includes('Next')).map((link, i) => (
                            <Link key={i} href={link.url || '#'} className={`px-3 py-1 text-xs font-medium rounded transition-colors ${link.url ? 'text-[#111315] bg-[#F3F4F6] hover:bg-[#E4E7EB]' : 'text-[#D1D5DB] cursor-not-allowed'}`} dangerouslySetInnerHTML={{ __html: link.label }} />
                        ))}
                    </div>
                    <span className="text-[10px] text-[#5F656D] font-medium">{contacts.total} total</span>
                </div>
            )}
        </div>
    );
}
