import React from 'react';
import Modal from '../components/Modal';
import { BLOCK_DEFINITIONS } from '../block-definitions';

interface Props {
    open: boolean;
    onClose: () => void;
    onSelect: (type: string) => void;
}

export default function BlockPickerModal({ open, onClose, onSelect }: Props) {
    return (
        <Modal open={open} onClose={onClose} title="Add Block">
            <div className="we-block-picker-grid">
                {BLOCK_DEFINITIONS.map((def) => (
                    <button
                        key={def.type}
                        type="button"
                        className="we-block-picker-item"
                        onClick={() => onSelect(def.type)}
                    >
                        <div
                            className="we-block-picker-icon"
                            dangerouslySetInnerHTML={{ __html: def.icon }}
                        />
                        <span className="we-block-picker-label">{def.label}</span>
                    </button>
                ))}
            </div>
        </Modal>
    );
}
