import React, { useRef } from 'react';
import { router } from '@inertiajs/react';

interface Props {
    label?: string;
    sublabel?: string;
    imageUrl: string | null;
    routeName: string;
    routeParam: number;
    fileKey: string;
    extraData?: Record<string, string>;
    variant?: 'circle' | 'rect' | 'small';
    placeholder?: string;
    aspectClass?: string;
}

export default function ImageUploadField({
    label,
    sublabel,
    imageUrl,
    routeName,
    routeParam,
    fileKey,
    extraData = {},
    variant = 'rect',
    placeholder = 'Upload',
    aspectClass,
}: Props) {
    const inputRef = useRef<HTMLInputElement>(null);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        const fd = new FormData();
        fd.append(fileKey, file);
        Object.entries(extraData).forEach(([k, v]) => fd.append(k, v));
        router.post(route(routeName, routeParam), fd, { preserveScroll: true, forceFormData: true });
    }

    const baseClasses = 'border border-[#E4E7EB] rounded-lg flex items-center justify-center cursor-pointer hover:border-[#8B9096] hover:shadow-sm transition-all overflow-hidden bg-[#F9FAFB]';

    return (
        <div>
            {label && <p className="text-[11px] font-medium text-[#5F656D] mb-2">{label}</p>}
            <div
                onClick={() => inputRef.current?.click()}
                className={`${baseClasses} ${aspectClass || (variant === 'circle' ? 'h-20 w-20 rounded-full' : variant === 'small' ? 'h-14' : 'h-16')}`}
            >
                {imageUrl ? (
                    <img src={`/storage/${imageUrl}`} className={`${variant === 'circle' ? 'w-full h-full object-cover' : 'max-h-full max-w-full object-contain'} px-3`} alt="" />
                ) : (
                    <div className="flex flex-col items-center justify-center gap-1 text-[#9CA3AF]">
                        <svg className={variant === 'small' ? 'h-4 w-4' : 'h-5 w-5'} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                        </svg>
                        {placeholder && <span className="text-[10px]">{placeholder}</span>}
                    </div>
                )}
            </div>
            {sublabel && <p className="text-[10px] text-[#8B9096] mt-1.5">{sublabel}</p>}
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
        </div>
    );
}
