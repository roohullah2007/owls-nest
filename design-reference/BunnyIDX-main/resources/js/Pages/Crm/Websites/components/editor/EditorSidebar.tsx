import React from 'react';
import { router } from '@inertiajs/react';
import { AgentWebsite } from '../../types';
import { ActiveSection, MAIN_NAV_GROUPS, GENERAL_GROUP, IDX_GROUP, LISTINGS_GROUP, NavIcon } from './navConfig';
import CrmSidebar, {
    CrmSidebarSection,
    CrmSidebarNav,
    SidebarNavItem,
    useSidebarContext,
} from '@/Components/Crm/CrmSidebar';

interface Props {
    website: AgentWebsite;
    activeSection: ActiveSection;
    onNavigate: (section: ActiveSection) => void;
}

export default function EditorSidebar({ website, activeSection, onNavigate }: Props) {
    // Sub-grouped sections highlight their single main entry.
    const mainActiveKey: ActiveSection = GENERAL_GROUP.includes(activeSection) ? 'general'
        : IDX_GROUP.includes(activeSection) ? 'idx-settings'
        : LISTINGS_GROUP.includes(activeSection) ? 'website-listings'
        : activeSection;

    return (
        <CrmSidebar>
            <CrmSidebarSection
                title={website.agent_name || 'Website'}
                onBack={() => router.visit(route('crm.websites.index'))}
                border={false}
            >
                {MAIN_NAV_GROUPS.map((group, i) => {
                    const items: SidebarNavItem<ActiveSection>[] = group.items.map((it) => ({
                        key: it.key,
                        label: it.label,
                        icon: <NavIcon name={it.icon} />,
                    }));
                    return (
                        <div key={group.label || i} className={i > 0 ? 'mt-4' : ''}>
                            {group.label && <GroupLabel>{group.label}</GroupLabel>}
                            <CrmSidebarNav items={items} activeKey={mainActiveKey} onSelect={onNavigate} />
                        </div>
                    );
                })}
            </CrmSidebarSection>
        </CrmSidebar>
    );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
    const { collapsed } = useSidebarContext();
    if (collapsed) {
        return <div className="my-2 mx-auto h-px w-6 bg-[#E4E7EB]" />;
    }
    return (
        <div className="px-2 mb-1 text-[10px] font-semibold text-[#8B9096] uppercase tracking-wider">
            {children}
        </div>
    );
}
