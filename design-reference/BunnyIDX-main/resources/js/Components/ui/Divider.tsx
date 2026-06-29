export default function Divider({ text = 'or' }: { text?: string }) {
    return (
        <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E4E7EB]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-[#5F656D]">{text}</span>
            </div>
        </div>
    );
}
