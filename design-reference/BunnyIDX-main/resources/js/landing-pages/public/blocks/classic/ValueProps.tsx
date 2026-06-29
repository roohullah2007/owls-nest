import type { BlockProps } from '../../types';
import './ValueProps.css';

const ICONS: Record<string, string> = {
    search: 'M21 21l-4.35-4.35M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14z',
    handshake: 'M8 11l2.5 2.5a2 2 0 0 0 2.8 0l4.7-4.7M3 8l4-4 5 4 4-3 5 4M3 8v6l5 5',
    'map-pin': 'M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z M12 10.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
    chart: 'M3 3v18h18 M7 15l3-4 3 2 4-6',
    shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z',
    home: 'M3 11l9-8 9 8 M5 10v10h14V10',
};

export default function ValueProps({ data }: BlockProps) {
    return (
        <section className="lp-section">
            <div className="lp-container">
                {data.title && <h2>{data.title}</h2>}
                <div className="lp-vp-grid">
                    {(data.items ?? []).map((item: any, idx: number) => (
                        <div className="lp-vp-card" key={idx}>
                            <div className="lp-vp-icon">
                                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d={ICONS[item.icon ?? 'home'] ?? ICONS.home} />
                                </svg>
                            </div>
                            <h3>{item.title ?? ''}</h3>
                            <p>{item.text ?? ''}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
