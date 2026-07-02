import { Link, router, usePage } from '@inertiajs/react';
import {
    Bell,
    ChevronDown,
    LayoutGrid,
    LogOut,
    Menu,
    Shield,
    SquareArrowOutUpRight,
    Star,
    Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Sheet,
    SheetContent,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';
import { logout } from '@/routes';
import type { Auth, BreadcrumbItem } from '@/types';

type NavLink = { title: string; href: string; icon: LucideIcon };

const NAV: NavLink[] = [
    { title: 'Dashboard', href: '/admin', icon: LayoutGrid },
    { title: 'Leads', href: '/admin/leads', icon: Users },
    {
        title: 'IDX Featured Listings',
        href: '/admin/idx-settings/featured-listings',
        icon: Star,
    },
];

function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const getInitials = useInitials();
    const { isCurrentUrl } = useCurrentUrl();
    const user = auth.user;

    return (
        <div className="flex h-full flex-col bg-navydeep text-white">
            {/* Brand */}
            <div className="flex h-16 items-center gap-3 border-b border-white/10 px-6">
                <span className="flex size-8 items-center justify-center rounded-lg bg-gold/15 text-gold">
                    <Shield className="size-5" />
                </span>
                <span className="text-lg font-semibold tracking-tight">
                    Admin Panel
                </span>
            </div>

            {/* Nav */}
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
                {NAV.map((item) => {
                    const active = isCurrentUrl(item.href);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={onNavigate}
                            className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                                active
                                    ? 'bg-navy text-white shadow-sm'
                                    : 'text-white/65 hover:bg-white/10 hover:text-white',
                            )}
                        >
                            <item.icon className="size-5 shrink-0" />
                            {item.title}
                        </Link>
                    );
                })}
            </nav>

            {/* User + sign out */}
            <div className="border-t border-white/10 p-3">
                <div className="flex items-center gap-3 px-2 py-2">
                    <Avatar className="size-9">
                        <AvatarFallback className="bg-gold/20 text-sm font-semibold text-gold">
                            {getInitials(user?.name ?? '')}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">
                            {user?.name}
                        </p>
                        <p className="truncate text-xs text-white/55">
                            {user?.email}
                        </p>
                    </div>
                </div>
                <Link
                    href={logout()}
                    as="button"
                    onClick={() => router.flushAll()}
                    className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/65 transition-colors hover:bg-white/10 hover:text-white"
                >
                    <LogOut className="size-5" />
                    Sign Out
                </Link>
            </div>
        </div>
    );
}

export default function AdminLayout({
    breadcrumbs = [],
    children,
}: {
    breadcrumbs?: BreadcrumbItem[];
    children: React.ReactNode;
}) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const getInitials = useInitials();
    const [mobileOpen, setMobileOpen] = useState(false);
    const title = breadcrumbs[breadcrumbs.length - 1]?.title ?? 'Dashboard';

    return (
        <div className="min-h-svh bg-sand text-navy [&_input]:text-gray-900 [&_textarea]:text-gray-900">
            {/* Desktop sidebar */}
            <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
                <AdminSidebar />
            </aside>

            <div className="lg:pl-64">
                {/* Top bar */}
                <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 sm:px-6">
                    <div className="flex items-center gap-3">
                        {/* Mobile menu */}
                        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                            <SheetTrigger
                                className="inline-flex size-9 items-center justify-center rounded-lg text-navy hover:bg-gray-100 lg:hidden"
                                aria-label="Open menu"
                            >
                                <Menu className="size-5" />
                            </SheetTrigger>
                            <SheetContent
                                side="left"
                                className="w-64 border-0 bg-navydeep p-0"
                            >
                                <SheetTitle className="sr-only">
                                    Admin navigation
                                </SheetTitle>
                                <AdminSidebar
                                    onNavigate={() => setMobileOpen(false)}
                                />
                            </SheetContent>
                        </Sheet>

                        <h1 className="text-xl font-semibold tracking-tight text-navy">
                            {title}
                        </h1>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2">
                        <a
                            href="/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-navy sm:flex"
                        >
                            <SquareArrowOutUpRight className="size-4" />
                            View Site
                        </a>
                        {/* New-lead notifications live on the Leads screen. */}
                        <Link
                            href="/admin/leads"
                            aria-label="Notifications"
                            className="relative inline-flex size-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-navy"
                        >
                            <Bell className="size-5" />
                            <span className="absolute top-2 right-2 size-2 rounded-full bg-gold ring-2 ring-white" />
                        </Link>

                        <DropdownMenu>
                            <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg p-1 pr-2 transition-colors hover:bg-gray-100">
                                <Avatar className="size-8">
                                    <AvatarFallback className="bg-navy text-xs font-semibold text-white">
                                        {getInitials(auth.user?.name ?? '')}
                                    </AvatarFallback>
                                </Avatar>
                                <ChevronDown className="size-4 text-gray-500" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium">
                                            {auth.user?.name}
                                        </span>
                                        <span className="text-xs font-normal text-muted-foreground">
                                            {auth.user?.email}
                                        </span>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <a
                                        href="/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <SquareArrowOutUpRight className="mr-2 size-4" />
                                        View Site
                                    </a>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link
                                        href={logout()}
                                        as="button"
                                        className="w-full"
                                        onClick={() => router.flushAll()}
                                    >
                                        <LogOut className="mr-2 size-4" />
                                        Sign Out
                                    </Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                <main className="p-4 sm:p-6">{children}</main>
            </div>
        </div>
    );
}
