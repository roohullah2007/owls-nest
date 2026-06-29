import { Link } from '@inertiajs/react';
import { getAvatarColor } from '@/utils/avatarColors';
import { formatDate, formatRelative } from '@/utils/dateFormatters';
import { sourceLabels } from '../constants';
import type { Contact, Column, TeamMember, ContactsIndexProps } from '../types';
import ContactChannelCell from './ContactChannelCell';
import InlineStatusCell from './InlineStatusCell';
import InlineTypeCell from './InlineTypeCell';
import InlineTagsCell from './InlineTagsCell';
import InlineAssignCell from './InlineAssignCell';
import { ListingsHoverCell, SearchesHoverCell } from './HoverPreviewCells';

interface ContactCellProps {
    contact: Contact;
    col: Column;
    leadTypes: ContactsIndexProps['leadTypes'];
    contactStatuses: ContactsIndexProps['contactStatuses'];
    allTags: ContactsIndexProps['tags'];
    teamMembers: TeamMember[];
    onCall: (contact: Contact, number: string) => void;
    onEmail: (contact: Contact) => void;
}

/**
 * Renders a single contact table cell for the given column. Extracted verbatim
 * from the Contacts index page's renderCell switch — behaviour is unchanged.
 */
export default function ContactCell({ contact, col, leadTypes, contactStatuses, allTags, teamMembers, onCall, onEmail }: ContactCellProps) {
    if (col.isCustom) {
        const cfKey = col.key.replace('cf_', '');
        const val = contact.custom_fields?.[cfKey];
        return <span className="text-xs text-[#5F656D] truncate">{val || '—'}</span>;
    }

    switch (col.key) {
        case 'first_name': {
            const location = [contact.city, contact.state_province].filter(Boolean).join(', ');
            const score = contact.lead_score;
            const scoreBg = score === null || score === undefined
                ? null
                : score >= 60 ? '#059669' : score >= 30 ? '#D97706' : '#DC2626';
            return (
                <div className="flex items-center min-w-0">
                    <span className="relative shrink-0 mr-2.5">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold text-white" style={{ backgroundColor: getAvatarColor(contact.id) }}>
                            {contact.first_name.charAt(0)}{contact.last_name.charAt(0)}
                        </span>
                        {scoreBg && (
                            <span
                                title={`Lead score ${score}`}
                                className="absolute -bottom-0.5 -right-0.5 inline-flex items-center justify-center min-w-[18px] h-[14px] px-1 text-[9px] font-bold rounded-full text-white ring-2 ring-white"
                                style={{ backgroundColor: scoreBg }}
                            >
                                {score}
                            </span>
                        )}
                    </span>
                    <div className="min-w-0 flex-1">
                        <Link href={route('crm.contacts.show', contact.uuid)} className="block text-[13px] font-medium text-[#111315] hover:text-[#1693C9] truncate leading-tight">
                            {contact.first_name} {contact.last_name}
                        </Link>
                        {location && (
                            <p className="text-[11px] text-[#5F656D] truncate leading-tight mt-0.5">{location}</p>
                        )}
                    </div>
                </div>
            );
        }
        case 'email':
            if (!contact.email) return <span className="text-xs text-[#D1D5DB]">—</span>;
            return <ContactChannelCell value={contact.email} count={contact.email_logs_count ?? 0} verified={!!contact.email_verified_at} kind="email" onClick={() => onEmail(contact)} />;
        case 'phone':
            if (!contact.phone) return <span className="text-xs text-[#D1D5DB]">—</span>;
            return <ContactChannelCell value={contact.phone} count={contact.call_logs_count ?? 0} verified={!!contact.phone_verified_at} kind="phone" onClick={() => onCall(contact, contact.phone!)} />;
        case 'mobile':
            if (!contact.mobile) return <span className="text-xs text-[#D1D5DB]">—</span>;
            return <ContactChannelCell value={contact.mobile} count={contact.sms_logs_count ?? 0} verified={!!contact.phone_verified_at} kind="phone" onClick={() => onCall(contact, contact.mobile!)} />;
        case 'type':
            return <InlineTypeCell contact={contact} types={leadTypes} />;
        case 'status':
            return <InlineStatusCell contact={contact} statuses={contactStatuses} />;
        case 'listings':
            return <ListingsHoverCell contact={contact} />;
        case 'searches':
            return <SearchesHoverCell contact={contact} />;
        case 'source':
            return <span className="text-xs text-[#5F656D]">{sourceLabels[contact.source] || contact.source}</span>;
        case 'city':
            return <span className="text-xs text-[#5F656D] truncate">{[contact.city, contact.state_province].filter(Boolean).join(', ') || '—'}</span>;
        case 'last_contacted_at':
            return <span className="text-xs text-[#5F656D]">{formatRelative(contact.last_contacted_at, '—')}</span>;
        case 'tags':
            return <InlineTagsCell contact={contact} allTags={allTags} />;
        case 'lead_score': {
            const score = contact.lead_score;
            if (score === null || score === undefined) return <span className="text-xs text-[#D1D5DB]">--</span>;
            const scoreColor = score >= 60 ? { bg: '#059669', text: '#FFFFFF' } : score >= 30 ? { bg: '#D97706', text: '#FFFFFF' } : { bg: '#DC2626', text: '#FFFFFF' };
            return (
                <span className="inline-flex items-center justify-center h-5 min-w-[28px] px-1.5 text-[10px] font-bold rounded-full" style={{ backgroundColor: scoreColor.bg, color: scoreColor.text }}>
                    {score}
                </span>
            );
        }
        case 'assigned':
            return <InlineAssignCell contact={contact} teamMembers={teamMembers} />;
        case 'created_at':
            return <span className="text-xs text-[#5F656D]">{formatDate(contact.created_at, '—')}</span>;
        default:
            return null;
    }
}
