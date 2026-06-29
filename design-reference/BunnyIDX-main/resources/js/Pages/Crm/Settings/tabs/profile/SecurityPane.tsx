import { useState } from 'react';
import { SettingsPane } from '@/Components/Crm/SettingsPane';
import SimpleTabs from '@/Components/Crm/SimpleTabs';
import ChangePasswordPanel from './security/ChangePasswordPanel';
import ActiveDevicesPanel from './security/ActiveDevicesPanel';
import AccessHistoryPanel from './security/AccessHistoryPanel';
import TwoFactorPanel from './security/TwoFactorPanel';

type SecuritySub = 'password' | 'devices' | 'history' | '2fa';

const SECURITY_TABS: { key: SecuritySub; label: string }[] = [
    { key: 'password', label: 'Change Password' },
    { key: 'devices', label: 'Active Devices' },
    { key: 'history', label: 'Access History' },
    { key: '2fa', label: '2FA' },
];

export default function SecurityPane() {
    const [sub, setSub] = useState<SecuritySub>('password');

    return (
        <SettingsPane>
            <h2 className="font-normal mb-4" style={{ fontSize: '20px', lineHeight: '30px', fontWeight: 500, color: 'rgb(7, 9, 15)' }}>
                Security
            </h2>
            <SimpleTabs tabs={SECURITY_TABS} active={sub} onChange={setSub} className="mb-5" />

            {sub === 'password' && <ChangePasswordPanel />}
            {sub === 'devices' && <ActiveDevicesPanel />}
            {sub === 'history' && <AccessHistoryPanel />}
            {sub === '2fa' && <TwoFactorPanel />}
        </SettingsPane>
    );
}
