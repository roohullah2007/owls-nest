import { useCallback, useEffect, useRef, useState } from 'react';

interface TypingUser {
    user_id: number;
    user_name: string;
    timestamp: number;
}

export default function useTypingIndicator(teamId: number | undefined, currentUserId: number) {
    const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
    const lastSentRef = useRef(0);
    const cleanupRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const csrfToken = () =>
        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '';

    // Listen for typing events via Echo
    useEffect(() => {
        if (!teamId || !window.Echo) return;

        const channel = window.Echo.private(`team.${teamId}`);

        channel.listen('.App\\Events\\UserTyping', (data: { user_id: number; user_name: string }) => {
            if (data.user_id === currentUserId) return;

            setTypingUsers((prev) => {
                const filtered = prev.filter((u) => u.user_id !== data.user_id);
                return [...filtered, { ...data, timestamp: Date.now() }];
            });
        });

        // Clean up stale typing indicators every 2s
        cleanupRef.current = setInterval(() => {
            setTypingUsers((prev) => prev.filter((u) => Date.now() - u.timestamp < 4000));
        }, 2000);

        return () => {
            channel.stopListening('.App\\Events\\UserTyping');
            if (cleanupRef.current) clearInterval(cleanupRef.current);
        };
    }, [teamId, currentUserId]);

    // Throttled send typing event
    const sendTyping = useCallback(() => {
        if (!teamId) return;
        const now = Date.now();
        if (now - lastSentRef.current < 3000) return;
        lastSentRef.current = now;

        fetch('/crm/team-chat/typing', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken(),
                Accept: 'application/json',
                'X-Socket-ID': window.Echo?.socketId?.() || '',
            },
        }).catch(() => {});
    }, [teamId]);

    const typingText =
        typingUsers.length === 0
            ? null
            : typingUsers.length === 1
              ? `${typingUsers[0].user_name} is typing...`
              : typingUsers.length === 2
                ? `${typingUsers[0].user_name} and ${typingUsers[1].user_name} are typing...`
                : 'Several people are typing...';

    return { sendTyping, typingText };
}
