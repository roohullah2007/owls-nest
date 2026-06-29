interface InputErrorProps {
    message?: string;
    className?: string;
}

export default function InputError({ message, className = '' }: InputErrorProps) {
    return message ? (
        <p className={'text-sm text-red-600 mt-1.5 animate-in ' + className}>
            {message}
        </p>
    ) : null;
}
