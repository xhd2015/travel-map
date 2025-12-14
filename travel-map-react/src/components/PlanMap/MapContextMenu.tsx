import React from 'react';
import { createPortal } from 'react-dom';

export interface ContextMenuProps {
    position: { x: number; y: number } | null;
    latLng: { lat: number; lng: number } | null;
    onClose: () => void;
    onAddSpot: (lat: number, lng: number) => void;
    onMarkLocation: (lat: number, lng: number) => void;
    onSetDestination: (lat: number, lng: number) => void;
    hasDestination: boolean;
}

export const MapContextMenu: React.FC<ContextMenuProps> = ({ position, latLng, onClose, onAddSpot, onMarkLocation, onSetDestination, hasDestination }) => {
    // We use a Portal to render outside the MapContainer so events don't bubble to the map.
    // This solves the issue of map clicks firing when clicking the menu.

    if (!position || !latLng) return null;

    return createPortal(
        <div
            style={{
                position: 'fixed', // Use fixed positioning relative to viewport
                top: position.y,
                left: position.x,
                backgroundColor: 'white',
                border: '1px solid #ccc',
                boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                zIndex: 2000, // Higher than Leaflet map
                borderRadius: '4px',
                padding: '4px 0',
                minWidth: '150px',
            }}
            onClick={(e) => {
                // Stop propagation just in case, though Portal events bubble by default in React tree.
                // But since it's outside Map DOM, Leaflet won't catch native events.
                e.stopPropagation();
            }}
        >
            <div
                style={{ padding: '8px 16px', cursor: 'pointer' }}
                onClick={() => {
                    onMarkLocation(latLng.lat, latLng.lng);
                    onClose();
                }}
                className="menu-item"
            >
                标记地点
            </div>
            <div
                style={{ padding: '8px 16px', cursor: 'pointer' }}
                onClick={() => {
                    onAddSpot(latLng.lat, latLng.lng);
                    onClose();
                }}
                className="menu-item"
            >
                添加景点
            </div>
            {/* 
                Set Destination should always be the last item in the menu.
                This ensures consistency and prevents accidental clicks when quickly interacting.
            */}
            <div
                style={{ padding: '8px 16px', cursor: 'pointer', borderTop: '1px solid #eee' }}
                onClick={() => {
                    onSetDestination(latLng.lat, latLng.lng);
                    onClose();
                }}
                className="menu-item"
            >
                {hasDestination ? '更新目的地' : '设置为目的地'}
            </div>
            <style>{`
                .menu-item:hover { background-color: #f5f5f5; }
            `}</style>
        </div>,
        document.body
    );
};
