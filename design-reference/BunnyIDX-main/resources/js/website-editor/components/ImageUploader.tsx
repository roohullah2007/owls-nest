import React, { useRef, useState } from 'react';

interface ImageUploaderProps {
    currentUrl: string | null;
    maxSizeMb: number;
    onUpload: (file: File) => Promise<void>;
    label?: string;
}

export default function ImageUploader({ currentUrl, maxSizeMb, onUpload, label }: ImageUploaderProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const displayUrl = preview || (currentUrl ? `/storage/${currentUrl}` : null);

    const handleFile = async (file: File) => {
        setError(null);

        if (!file.type.startsWith('image/')) {
            setError('Please select an image file.');
            return;
        }

        if (file.size > maxSizeMb * 1024 * 1024) {
            setError(`File must be under ${maxSizeMb}MB.`);
            return;
        }

        // Show local preview immediately
        const reader = new FileReader();
        reader.onload = () => setPreview(reader.result as string);
        reader.readAsDataURL(file);

        setUploading(true);
        try {
            await onUpload(file);
        } catch {
            setError('Upload failed. Try again.');
            setPreview(null);
        } finally {
            setUploading(false);
        }
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    return (
        <div className="we-uploader">
            {label && <label className="we-label">{label}</label>}
            <div
                className="we-uploader-zone"
                onClick={() => inputRef.current?.click()}
                onDrop={onDrop}
                onDragOver={(e) => e.preventDefault()}
            >
                {displayUrl ? (
                    <img src={displayUrl} alt="Preview" className="we-uploader-preview" />
                ) : (
                    <div className="we-uploader-placeholder">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm12.75-11.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                        </svg>
                        <span>Click or drop image here</span>
                        <span className="we-uploader-hint">Max {maxSizeMb}MB</span>
                    </div>
                )}
                {uploading && (
                    <div className="we-uploader-loading">Uploading...</div>
                )}
            </div>
            {error && <p className="we-field-error">{error}</p>}
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                }}
                style={{ display: 'none' }}
            />
        </div>
    );
}
