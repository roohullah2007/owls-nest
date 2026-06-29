// Alternating image/text team member row (Tom / Dawn / Mattie / Enzo on the
// About page). Rows alternate navy/white backgrounds (`tone`) and image side
// (`reverse`). Data-driven from a typed TeamMember object.
import { cn } from '@/lib/utils';
import type { TeamMember } from '@/data/team';

interface TeamMemberRowProps {
    member: TeamMember;
    /** Place the photo on the right (text on the left) instead of left/right default. */
    reverse?: boolean;
    /** Background + text color scheme. */
    tone?: 'navy' | 'white';
    className?: string;
}

export function TeamMemberRow({
    member,
    reverse = false,
    tone = 'white',
    className,
}: TeamMemberRowProps) {
    const isNavy = tone === 'navy';

    const figure = (
        <div className={cn('overflow-hidden', reverse && 'order-1 lg:order-2')}>
            <img
                src={member.photo}
                alt={member.photoAlt}
                className={cn(
                    'h-[400px] w-full object-cover sm:h-[480px] lg:h-[560px]',
                    member.imageClassName,
                )}
            />
        </div>
    );

    return (
        <section
            className={cn(
                'py-16 md:py-20',
                isNavy ? 'bg-navy' : 'bg-white',
                className,
            )}
        >
            <div
                className={cn(
                    'mx-auto grid w-full max-w-[1290px] items-center gap-10 px-6 lg:gap-16 lg:px-8',
                    reverse
                        ? 'lg:grid-cols-[minmax(0,1fr)_465px]'
                        : 'lg:grid-cols-[465px_minmax(0,1fr)]',
                )}
            >
                {reverse && figure}
                <div className={cn(reverse && 'order-2 lg:order-1')}>
                    <h2
                        className={cn(
                            'text-[clamp(24px,3.8vw,35px)] leading-[clamp(31px,4.6vw,42px)] font-semibold',
                            isNavy ? 'text-white' : 'text-navy',
                        )}
                    >
                        {member.name}
                    </h2>
                    <p
                        className={cn(
                            'mt-2 text-[14px] leading-[17px] font-normal tracking-wide uppercase',
                            isNavy ? 'text-white' : 'text-navy',
                        )}
                    >
                        {member.role}
                    </p>
                    <div
                        className={cn(
                            'mt-6 space-y-5 text-[16px] leading-[26px] font-normal',
                            isNavy ? 'text-white/90' : 'text-[#282828]',
                        )}
                    >
                        {member.bio.map((paragraph, i) => (
                            <p key={i}>{paragraph}</p>
                        ))}
                    </div>
                </div>
                {!reverse && figure}
            </div>
        </section>
    );
}
