import { LabelHTMLAttributes } from 'react';

interface InputLabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
    value?: string;
}

export default function InputLabel({
    value,
    className = '',
    children,
    ...props
}: InputLabelProps) {
    return (
        <label
            {...props}
            className={
                'block text-sm font-medium text-[#303030] mb-2 ' + className
            }
        >
            {value ? value : children}
        </label>
    );
}
