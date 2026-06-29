import Logo from '@/Components/ui/Logo';
import AuthBrandPanel from '@/Components/ui/AuthBrandPanel';
import { PropsWithChildren, ReactNode } from 'react';

interface Props {
    /** Page heading, e.g. "Welcome back". */
    title: string;
    /** Optional supporting copy under the heading. */
    subtitle?: ReactNode;
    /** Optional footer content (sign-in/up links, legal links) rendered below the form. */
    footer?: ReactNode;
}

/**
 * Split-screen auth layout: the dark brand panel on the left (desktop) and a
 * centered form column on the right. Shared by the login, register, and
 * password screens so they stay visually in sync.
 */
export default function AuthSplitLayout({ title, subtitle, footer, children }: PropsWithChildren<Props>) {
    return (
        <div className="flex min-h-screen w-full bg-white font-sans text-[#111315] antialiased">
            {/* Left — brand panel (no photos, pure CSS/SVG) */}
            <AuthBrandPanel />

            {/* Right — form column */}
            <div className="flex w-full flex-col items-center justify-center px-5 py-10 sm:px-8 lg:w-1/2">
                <div className="w-full max-w-[400px]">
                    {/* Mobile logo */}
                    <div className="mb-8 flex items-center gap-2.5 lg:hidden">
                        <Logo variant="icon" size="default" className="text-[#1693C9]" />
                        <span className="text-lg font-semibold text-[#111315]">BunnyChamp</span>
                    </div>

                    <div className="mb-8">
                        <h1 className="text-2xl font-semibold tracking-tight text-[#111315]">{title}</h1>
                        {subtitle && <p className="mt-2 text-sm text-[#5F656D]">{subtitle}</p>}
                    </div>

                    {children}

                    {footer}
                </div>
            </div>
        </div>
    );
}
