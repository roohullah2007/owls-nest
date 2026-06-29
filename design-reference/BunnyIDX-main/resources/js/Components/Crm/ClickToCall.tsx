interface Props {
    phoneNumber: string;
    onCall: (number: string) => void;
    size?: 'sm' | 'md';
}

export default function ClickToCall({ phoneNumber, onCall, size = 'sm' }: Props) {
    return (
        <button
            onClick={() => onCall(phoneNumber)}
            className={`inline-flex items-center justify-center text-[#1693C9] hover:text-[#1380AF] hover:bg-[#E6F0FF] rounded-md transition-colors ${
                size === 'sm' ? 'h-6 w-6' : 'h-7 w-7'
            }`}
            title={`Call ${phoneNumber}`}
        >
            <svg className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
        </button>
    );
}
