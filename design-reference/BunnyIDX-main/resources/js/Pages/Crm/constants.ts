// Shared CRM design-system Tailwind classes
// Use these across all CRM pages for visual consistency.

const CHEVRON_DOWN =
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyMCAyMCI+PHBhdGggc3Ryb2tlPSIjOUNBM0FGIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41IiBkPSJNNiA4bDQgNCA0LTQiLz48L3N2Zz4=';

export const inputClass =
    'block w-full h-9 px-3 text-[13px] border border-[#D1D5DB] bg-white text-[#111315] placeholder-[#9CA3AF] rounded-lg focus:outline-none focus:border-[#111315] focus:ring-2 focus:ring-[#111315]/5 transition-all';

export const textareaClass =
    'block w-full px-3 py-2 text-[13px] border border-[#D1D5DB] bg-white text-[#111315] placeholder-[#9CA3AF] rounded-lg focus:outline-none focus:border-[#111315] focus:ring-2 focus:ring-[#111315]/5 resize-none transition-all';

export const labelClass = 'block text-[12px] font-medium text-[#374151] mb-1.5';

export const selectClass =
    `block w-full h-9 pl-3 pr-10 text-[13px] border border-[#D1D5DB] bg-white text-[#111315] rounded-lg focus:outline-none focus:border-[#111315] focus:ring-2 focus:ring-[#111315]/5 transition-all appearance-none py-0 bg-[url('${CHEVRON_DOWN}')] bg-[right_0.5rem_center] bg-no-repeat bg-[length:1.5em_1.5em]`;

export const cardTitleClass = 'text-[12px] font-semibold text-[#111315]';

export const sectionTitleClass = 'text-sm font-semibold text-[#111315]';

export const mutedTextClass = 'text-[13px] text-[#5F656D]';

export const smallMutedTextClass = 'text-[11px] text-[#8B9096]';

// Buttons
export const btnPrimary =
    'h-9 px-5 bg-[#111315] text-white text-[13px] font-medium rounded-lg hover:bg-[#2a2d30] disabled:opacity-30 transition-colors inline-flex items-center justify-center';

export const btnSecondary =
    'h-9 px-4 text-[13px] font-medium text-[#5F656D] hover:text-[#111315] transition-colors inline-flex items-center justify-center';

export const btnDanger =
    'h-9 px-4 text-[13px] font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center justify-center';

export const btnSmall =
    'h-7 px-3 text-[11px] font-medium text-[#5F656D] hover:text-[#111315] hover:bg-[#F3F4F6] rounded transition-colors inline-flex items-center justify-center';

export const btnPrimarySmall =
    'h-7 px-3 bg-[#111315] text-white text-[11px] font-medium rounded-lg hover:bg-[#2a2d30] disabled:opacity-30 transition-colors inline-flex items-center justify-center';

// Badges
export const badgeClass = (color: 'green' | 'yellow' | 'red' | 'gray' | 'blue' | 'purple') => {
    const map: Record<string, string> = {
        green: 'bg-[#DCFCE7] text-[#166534]',
        yellow: 'bg-[#FEF3C7] text-[#92400E]',
        red: 'bg-[#FEE2E2] text-[#991B1B]',
        gray: 'bg-[#F3F4F6] text-[#5F656D]',
        blue: 'bg-[#E6F0FF] text-[#1693C9]',
        purple: 'bg-[#EEF2FF] text-[#4F46E5]',
    };
    return `inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${map[color] || map.gray}`;
};

// Table / list row
export const listRowClass =
    'flex items-center gap-4 px-4 py-3 hover:bg-[#FAFAFA] transition-colors';

export const dividerClass = 'border-b border-[#E4E7EB] last:border-0';
