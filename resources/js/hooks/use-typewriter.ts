import { useEffect, useState } from 'react';

interface TypewriterOptions {
    typeMs?: number;
    eraseMs?: number;
    holdMs?: number;
}

/**
 * Cycles through `words`, typing then erasing each one — the home hero's
 * rotating subtitle behavior, ported from the original inline script.
 */
export function useTypewriter(
    words: string[],
    { typeMs = 70, eraseMs = 40, holdMs = 1800 }: TypewriterOptions = {},
) {
    const [text, setText] = useState('');
    const [wordIndex, setWordIndex] = useState(0);
    const [phase, setPhase] = useState<'typing' | 'holding' | 'erasing'>(
        'typing',
    );

    useEffect(() => {
        if (words.length === 0) {
            return;
        }

        const word = words[wordIndex % words.length];
        let timer: ReturnType<typeof setTimeout>;

        if (phase === 'typing') {
            if (text.length < word.length) {
                timer = setTimeout(
                    () => setText(word.slice(0, text.length + 1)),
                    typeMs,
                );
            } else {
                timer = setTimeout(() => setPhase('holding'), holdMs);
            }
        } else if (phase === 'holding') {
            timer = setTimeout(() => setPhase('erasing'), holdMs);
        } else {
            if (text.length > 0) {
                timer = setTimeout(
                    () => setText(word.slice(0, text.length - 1)),
                    eraseMs,
                );
            } else {
                setWordIndex((i) => (i + 1) % words.length);
                setPhase('typing');
            }
        }

        return () => clearTimeout(timer);
    }, [text, phase, wordIndex, words, typeMs, eraseMs, holdMs]);

    return text;
}
