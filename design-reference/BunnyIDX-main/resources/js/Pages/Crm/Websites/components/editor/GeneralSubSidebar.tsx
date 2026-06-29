import React from 'react';
import { AgentWebsite } from '../../types';
import { ActiveSection, SUB_NAV_ITEMS, NavIcon, NavItem } from './navConfig';

interface Props {
    items?: NavItem[];
    website: AgentWebsite;
    active: ActiveSection;
    onSelect: (section: ActiveSection) => void;
}

/**
 * Inner sub-sidebar for the "General" tab — mirrors the Settings → Profile
 * sub-sidebar (identity header + sub-nav with brand-colored active state).
 */
export default function GeneralSubSidebar({ website, active, onSelect, items = SUB_NAV_ITEMS }: Props) {
    const siteUrl = `${window.location.origin}/site/${website.slug}`;

    return (
        <aside className="hidden md:flex w-[220px] shrink-0 flex-col border-r border-[#E4E7EB] bg-[#F7F8FB] min-h-[calc(100vh-56px)]">
            <div className="px-5 py-5 border-b border-[#E4E7EB] min-w-0">
                <div className="font-normal truncate" style={{ fontSize: '18px', lineHeight: '22px', fontWeight: 500, color: 'rgb(7, 9, 15)' }}>
                    {website.agent_name || 'Website'}
                </div>
                <a
                    href={siteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mt-0.5 text-[12px] text-[#1693C9] hover:underline truncate"
                >
                    {siteUrl.replace(/^https?:\/\//, '')}
                </a>
            </div>
            <nav className="py-2">
                {items.map((t) => {
                    const isActive = active === t.key;
                    return (
                        <button
                            key={t.key}
                            type="button"
                            onClick={() => onSelect(t.key)}
                            className={`group flex items-center gap-2.5 w-full h-9 px-5 text-[14px] transition-colors [&_svg]:h-4 [&_svg]:w-4 ${
                                isActive ? 'text-[#1693C9] font-medium' : 'text-[#374151] hover:text-[#1693C9] font-normal'
                            }`}
                        >
                            <span className={`shrink-0 ${isActive ? 'text-[#1693C9]' : 'text-[#374151] group-hover:text-[#1693C9]'}`}>
                                <NavIcon name={t.icon} />
                            </span>
                            <span className="flex-1 text-left truncate">{t.label}</span>
                        </button>
                    );
                })}
            </nav>
        </aside>
    );
}
