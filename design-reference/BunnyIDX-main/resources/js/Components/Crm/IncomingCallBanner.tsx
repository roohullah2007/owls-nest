import { formatPhone } from '@/utils/phone';

interface IncomingCallData {
    callControlId: string;
    fromNumber: string;
    toNumber: string;
    contact: { id: number; uuid: string; name: string; type: string } | null;
}

interface Props {
    call: IncomingCallData;
    onAnswer: () => void;
    onDecline: () => void;
}

export default function IncomingCallBanner({ call, onAnswer, onDecline }: Props) {
    return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-[#059669] text-white shadow-lg animate-pulse">
            <div className="flex items-center justify-between px-4 py-3 max-w-screen-xl mx-auto">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm font-semibold">Incoming Call</p>
                        <p className="text-xs text-white/80">
                            {call.contact ? call.contact.name : formatPhone(call.fromNumber)}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={onAnswer}
                        className="flex items-center gap-2 h-9 px-4 bg-white text-[#059669] text-xs font-semibold rounded-lg hover:bg-green-50 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        Answer
                    </button>
                    <button
                        onClick={onDecline}
                        className="flex items-center gap-2 h-9 px-4 bg-[#DC2626] text-white text-xs font-semibold rounded-lg hover:bg-[#B91C1C] transition-colors"
                    >
                        <svg className="w-4 h-4 rotate-[135deg]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        Decline
                    </button>
                </div>
            </div>
        </div>
    );
}
