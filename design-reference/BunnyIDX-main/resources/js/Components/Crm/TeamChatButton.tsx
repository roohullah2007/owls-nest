interface Props {
    isOpen: boolean;
    onClick: () => void;
    unreadCount: number;
}

export default function TeamChatButton({ isOpen, onClick, unreadCount }: Props) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex items-center justify-center w-10 sm:w-12 border-l border-white/10 transition-colors relative ${
                isOpen
                    ? 'bg-white/15 text-white'
                    : 'text-white/50 hover:text-white hover:bg-white/10'
            }`}
            title="Team Chat"
        >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
            </svg>
            {unreadCount > 0 && (
                <span className="absolute top-2 right-1.5 sm:right-2.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#059669] px-1 text-[10px] font-bold text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                </span>
            )}
        </button>
    );
}
