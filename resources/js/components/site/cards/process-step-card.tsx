// White seller-process card: a large translucent step number above a title and
// description. Rendered inside the navy "Our Seller Process" CardRail.
import { cn } from '@/lib/utils';
import type { ProcessStep } from '@/data/seller-process';

interface ProcessStepCardProps {
    step: ProcessStep;
    className?: string;
}

export function ProcessStepCard({ step, className }: ProcessStepCardProps) {
    return (
        <div
            className={cn(
                'group relative flex h-[460px] w-[330px] flex-shrink-0 flex-col justify-between bg-white p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl sm:w-[400px] lg:p-10',
                className,
            )}
        >
            <span className="font-display text-[72px] leading-none font-semibold text-navy/15">
                {step.number}
            </span>
            <div>
                <h3 className="font-display text-[24px] leading-[30px] font-semibold text-navy">
                    {step.title}
                </h3>
                <p className="font-body mt-5 text-[15px] leading-[24px] font-normal text-gray-600">
                    {step.description}
                </p>
            </div>
        </div>
    );
}
