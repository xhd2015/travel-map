import React, { useEffect, useState } from 'react';
import { Button, Popconfirm } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { Spot, Config } from '../../api';
import { MapContextMenu } from './MapContextMenu';
import { DestinationOverlay } from './DestinationOverlay';

// Map Updater Helper
const MapUpdater = ({ center, zoom }: { center: [number, number], zoom?: number }) => {
    const map = useMap();
    useEffect(() => {
        if (zoom) {
            map.flyTo(center, zoom);
        } else {
            map.flyTo(center);
        }
    }, [center, zoom, map]);
    return null;
};

// Interaction Bridge
const InteractionBridge = ({
    onAddSpot,
    onMarkLocation,
    onSetDestination,
    hasDestination
}: {
    onAddSpot: (lat: number, lng: number) => void,
    onMarkLocation: (lat: number, lng: number) => void,
    onSetDestination: (center: L.LatLng, zoom: number, destLat: number, destLng: number) => void,
    hasDestination: boolean
}) => {
    const map = useMap();
    const [menu, setMenu] = useState<{ x: number, y: number, lat: number, lng: number } | null>(null);

    useMapEvents({
        click: (e) => {
            if (menu) {
                setMenu(null);
            } else {
                setMenu({
                    x: e.originalEvent.clientX,
                    y: e.originalEvent.clientY,
                    lat: e.latlng.lat,
                    lng: e.latlng.lng
                });
            }
        },
        dragstart: () => setMenu(null),
        zoomstart: () => setMenu(null),
    });

    return (
        <MapContextMenu
            position={menu ? { x: menu.x, y: menu.y } : null}
            latLng={menu ? { lat: menu.lat, lng: menu.lng } : null}
            onClose={() => setMenu(null)}
            onAddSpot={(lat, lng) => onAddSpot(lat, lng)}
            onMarkLocation={(lat, lng) => {
                onMarkLocation(lat, lng);
            }}
            onSetDestination={(lat, lng) => {
                const center = map.getCenter();
                const zoom = map.getZoom();
                onSetDestination(center, zoom, lat, lng);
            }}
            hasDestination={hasDestination}
        />
    );
};

interface MapViewerProps {
    config: Config;
    mapCenter: [number, number];
    mapZoom: number;
    spots: Spot[];
    onAddSpot: (lat: number, lng: number) => void;
    onMarkLocation: (lat: number, lng: number) => void;
    onEditSpot: (spot: Spot) => void;
    onDeleteSpot: (spot: Spot) => void;
    onSetDestination: (center: L.LatLng, zoom: number, destLat: number, destLng: number) => void;
    onLocateDestination?: () => void;
    showDestinationOverlay?: boolean;
    style?: React.CSSProperties;
}

export const MapViewer: React.FC<MapViewerProps> = ({
    config,
    mapCenter,
    mapZoom,
    spots,
    onAddSpot,
    onMarkLocation,
    onEditSpot,
    onDeleteSpot,
    onSetDestination,
    onLocateDestination,
    showDestinationOverlay = true,
    style
}) => {
    return (
        <div style={{ position: 'relative', ...style }}>
            {showDestinationOverlay && onLocateDestination && (
                <DestinationOverlay config={config} onLocate={onLocateDestination} />
            )}
            <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapUpdater center={mapCenter} zoom={mapZoom} />
                <InteractionBridge
                    onAddSpot={onAddSpot}
                    onMarkLocation={onMarkLocation}
                    onSetDestination={onSetDestination}
                    hasDestination={!!config.destination}
                />
                {spots.map((spot) => {
                    let markerIcon: L.Icon | L.DivIcon | undefined;
                    if (spot.icon === 'flag') {
                        markerIcon = L.divIcon({
                            className: 'custom-flag-icon',
                            html: `<div style="font-size: 24px; line-height: 1;">🚩</div>`,
                            iconSize: [24, 24],
                            iconAnchor: [12, 24],
                            popupAnchor: [0, -24]
                        });
                    }

                    return spot.lat && spot.lng && (
                        <Marker
                            key={spot.id}
                            position={[spot.lat, spot.lng]}
                            icon={markerIcon}
                        >
                            <Popup>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <div style={{ fontWeight: 'bold' }}>{spot.name}</div>
                                    {spot.time && <div>{spot.time}</div>}
                                    {spot.interior && <div>{spot.interior}</div>}
                                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                        <Button size="small" type="link" icon={<EditOutlined />} onClick={() => onEditSpot(spot)} style={{ padding: 0 }}>
                                            编辑
                                        </Button>
                                        <Popconfirm
                                            title="确定删除吗？"
                                            onConfirm={() => onDeleteSpot(spot)}
                                            okText="删除"
                                            cancelText="取消"
                                        >
                                            <Button size="small" type="link" danger icon={<DeleteOutlined />} style={{ padding: 0 }}>
                                                删除
                                            </Button>
                                        </Popconfirm>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
                {config.destination && (
                    <Marker
                        position={[config.destination.lat, config.destination.lng]}
                        icon={L.divIcon({
                            className: 'custom-div-icon',
                            html: `<div style="background-color: #1890ff; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
                            iconSize: [12, 12],
                            iconAnchor: [6, 6]
                        })}
                    >
                        <Popup>
                            <b>{config.destination.name}</b> (目的地)
                        </Popup>
                    </Marker>
                )}
            </MapContainer>
        </div>
    );
};
