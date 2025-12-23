import React, { useEffect, useState, useMemo } from 'react';
import { Button, Popconfirm, Select, message } from 'antd';
import { DeleteOutlined, EditOutlined, CloseOutlined } from '@ant-design/icons';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { Spot, Config } from '../../api';
import { api } from '../../api';
import type { SearchResult } from '../../api';
import { MapContextMenu } from './MapContextMenu';
import { DestinationOverlay } from './DestinationOverlay';

// Fix leaflet marker icons imports
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Icons
const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});

const FlagIcon = L.divIcon({
    className: 'custom-flag-icon',
    html: `<div style="font-size: 24px; line-height: 1;">🚩</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24]
});

const DestinationIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: #1890ff; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
});

const createNumberedIcon = (num: number) => L.divIcon({
    className: 'custom-number-icon',
    html: `<div style="background-color: #1890ff; width: 32px; height: 32px; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5); font-weight: bold;">${num}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
});

// Pre-generate numbered icons for stability
const NumberedIcons: Record<number, L.DivIcon> = {};
for (let i = 1; i <= 50; i++) {
    NumberedIcons[i] = createNumberedIcon(i);
}

const LOCATION_CURSOR = `url('data:image/svg+xml;utf8,<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M16 0C9.373 0 4 5.373 4 12c0 9 12 20 12 20s12-11 12-20c0-6.627-5.373-12-12-12z" fill="%231890ff" stroke="white" stroke-width="2"/><circle cx="16" cy="12" r="4" fill="white"/></svg>') 16 32, crosshair`;

// Tile Providers
const TileProviders: Record<string, { name: string, url: string, attribution: string }> = {
    'osm': {
        name: 'OpenStreetMap',
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    'carto_light': {
        name: 'CartoDB Light',
        url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    },
    'carto_dark': {
        name: 'CartoDB Dark',
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    },
    'esri_satellite': {
        name: 'Esri Satellite',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    },
    'gaode': {
        name: '高德地图 (偏移)',
        url: 'https://webrd02.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
        attribution: '&copy; 高德地图'
    }
};

const MapUpdater = ({ center, zoom }: { center: [number, number], zoom?: number }) => {
    const map = useMap();

    // Invalidate size once on mount to handle initial layout settlement
    useEffect(() => {
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 100);
        return () => clearTimeout(timer);
    }, [map]);

    useEffect(() => {
        const currentCenter = map.getCenter();
        const dist = currentCenter.distanceTo(L.latLng(center[0], center[1]));
        const currentZoom = map.getZoom();

        // Only flyTo if distance is meaningful (> 500 meters) or zoom is different
        // This prevents loops when the update comes from the map itself
        // Increased threshold to avoid fighting with small drags
        if (dist > 500 || (zoom !== undefined && zoom !== currentZoom)) {
            if (zoom) {
                map.flyTo(center, zoom);
            } else {
                map.flyTo(center);
            }
        }
    }, [center, zoom, map]);
    return null;
};

// Interaction Bridge
const InteractionBridge = ({
    onAddSpot,
    onMarkLocation,
    onSetDestination,
    hasDestination,
    isPickingLocation,
    onMapClick
}: {
    onAddSpot: (lat: number, lng: number) => void,
    onMarkLocation: (lat: number, lng: number) => void,
    onSetDestination: (center: L.LatLng, zoom: number, destLat: number, destLng: number) => void,
    hasDestination: boolean,
    isPickingLocation?: boolean,
    onMapClick?: (lat: number, lng: number) => void
}) => {
    const map = useMap();
    const [menu, setMenu] = useState<{ x: number, y: number, lat: number, lng: number } | null>(null);

    useEffect(() => {
        if (isPickingLocation) {
            map.getContainer().style.cursor = LOCATION_CURSOR;
        } else {
            map.getContainer().style.cursor = '';
        }
        return () => {
            map.getContainer().style.cursor = '';
        };
    }, [isPickingLocation, map]);

    useMapEvents({
        click: (e) => {
            if (isPickingLocation && onMapClick) {
                onMapClick(e.latlng.lat, e.latlng.lng);
                return;
            }

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

    if (isPickingLocation) return null;

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

// SearchResult interface imported from api

const MapSearchHandler = ({ query, onResults, provider }: { query: string, onResults: (results: SearchResult[]) => void, provider: string }) => {
    const map = useMap();
    useEffect(() => {
        if (!query) {
            onResults([]);
            return;
        }

        if (provider === 'gaode') {
            api.searchGaode(query)
                .then(onResults)
                .catch(err => {
                    if (err.message === 'AMAP_KEY_MISSING') {
                        message.error('未配置高德API Key');
                        onResults([]);
                        return;
                    }
                    console.error("Search failed", err);
                });
        } else {
            const bounds = map.getBounds();
            const boundParams = {
                west: bounds.getWest(),
                north: bounds.getNorth(),
                east: bounds.getEast(),
                south: bounds.getSouth()
            };
            api.searchNominatim(query, boundParams)
                .then(onResults)
                .catch(err => console.error("Search failed", err));
        }
    }, [query, map, onResults, provider]);

    return null;
};

const MapResultFlier = ({ target }: { target: SearchResult | null }) => {
    const map = useMap();
    useEffect(() => {
        if (target) {
            map.flyTo([parseFloat(String(target.lat)), parseFloat(String(target.lon))], 16);
        }
    }, [target, map]);
    return null;
};

const SearchResultsList = ({ results, onSelect, onDismiss }: { results: SearchResult[], onSelect: (r: SearchResult) => void, onDismiss: () => void }) => {
    if (results.length === 0) return null;
    return (
        <div style={{
            position: 'absolute',
            top: 20,
            right: 20,
            width: 250,
            maxHeight: 400,
            overflowY: 'auto',
            backgroundColor: 'white',
            zIndex: 1000,
            borderRadius: 4,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            padding: 8
        }}>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>搜索结果</span>
                <Button size="small" type="text" icon={<CloseOutlined />} onClick={onDismiss} />
            </div>
            {results.map((r, i) => (
                <div
                    key={r.place_id}
                    style={{
                        padding: '8px',
                        borderBottom: '1px solid #f0f0f0',
                        cursor: 'pointer',
                        display: 'flex',
                        gap: 8,
                        alignItems: 'start'
                    }}
                    onClick={() => onSelect(r)}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                    <div style={{
                        minWidth: 20, height: 20, borderRadius: '50%', backgroundColor: '#1890ff', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, marginTop: 2
                    }}>
                        {i + 1}
                    </div>
                    <div style={{ fontSize: 12 }}>
                        {r.display_name}
                    </div>
                </div>
            ))}
        </div>
    );
};

// IconSelector Component
const IconSelector = ({ value, onChange }: { value?: string, onChange: (val: string) => void }) => {
    return (
        <Select
            value={value || ""}
            onChange={onChange}
            size="small"
            style={{ width: 100 }}
            // Use document.body to ensure dropdown is not clipped by map container overflow
            getPopupContainer={() => document.body}
            dropdownMatchSelectWidth={false}
            onMouseDown={(e) => e.stopPropagation()} // Prevent map drag/click
        >
            <Select.Option value="">默认</Select.Option>
            <Select.Option value="flag">旗帜</Select.Option>
            <Select.OptGroup label="序号">
                {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                    <Select.Option key={num} value={`number-${num}`}>
                        {num}
                    </Select.Option>
                ))}
            </Select.OptGroup>
        </Select>
    );
};

// SpotMarker Component
const SpotMarker = ({ spot, onEditSpot, onDeleteSpot, onUpdateSpot }: {
    spot: Spot,
    onEditSpot: (s: Spot) => void,
    onDeleteSpot: (s: Spot) => void,
    onUpdateSpot?: (s: Spot) => void
}) => {
    if (!spot.lat || !spot.lng) return null;

    let markerIcon: L.Icon | L.DivIcon = DefaultIcon;
    if (spot.icon === 'flag') {
        markerIcon = FlagIcon;
    } else if (spot.icon && spot.icon.startsWith('number-')) {
        const num = parseInt(spot.icon.split('-')[1], 10);
        if (num && NumberedIcons[num]) {
            markerIcon = NumberedIcons[num];
        }
    }

    return (
        <Marker
            position={[spot.lat, spot.lng]}
            icon={markerIcon}
        >
            <Popup>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontWeight: 'bold' }}>{spot.name}</div>
                        {onUpdateSpot && (
                            <IconSelector
                                value={spot.icon}
                                onChange={(val) => onUpdateSpot({ ...spot, icon: val })}
                            />
                        )}
                    </div>
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
};

// SearchResultMarker Component
const SearchResultMarker = ({ result, index }: { result: SearchResult, index: number }) => {
    // For search results, we can rely on index being stable for the list
    const icon = useMemo(() => {
        // Use pre-generated if available (up to 50), else generate
        if (index + 1 <= 50) return NumberedIcons[index + 1];
        return createNumberedIcon(index + 1);
    }, [index]);

    return (
        <Marker
            position={[parseFloat(String(result.lat)), parseFloat(String(result.lon))]}
            icon={icon}
        >
            <Popup>{result.display_name}</Popup>
        </Marker>
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
    onUpdateSpot?: (spot: Spot) => void;
    onSetDestination: (center: L.LatLng, zoom: number, destLat: number, destLng: number) => void;
    onLocateDestination?: () => void;
    showDestinationOverlay?: boolean;
    style?: React.CSSProperties;
    isPickingLocation?: boolean;
    onMapClick?: (lat: number, lng: number) => void;
    provider?: string;
    onProviderChange?: (provider: string) => void;
    onMapStateChange?: (center: { lat: number, lng: number }, zoom: number) => void;
}

const MapStateTracker = ({ onMapStateChange }: { onMapStateChange?: (center: { lat: number, lng: number }, zoom: number) => void }) => {
    const map = useMapEvents({
        moveend: () => {
            if (onMapStateChange) {
                const center = map.getCenter();
                onMapStateChange({ lat: center.lat, lng: center.lng }, map.getZoom());
            }
        },
        zoomend: () => {
            if (onMapStateChange) {
                const center = map.getCenter();
                onMapStateChange({ lat: center.lat, lng: center.lng }, map.getZoom());
            }
        }
    });
    return null;
};

export const MapViewer: React.FC<MapViewerProps> = ({
    config,
    mapCenter,
    mapZoom,
    spots,
    onAddSpot,
    onMarkLocation,
    onEditSpot,
    onDeleteSpot,
    onUpdateSpot,
    onSetDestination,
    onLocateDestination,
    showDestinationOverlay = true,
    style,
    isPickingLocation,
    onMapClick,
    provider,
    onProviderChange,
    onMapStateChange
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
    const [localProvider, setLocalProvider] = useState('gaode');

    const currentProvider = provider || localProvider;
    const handleProviderChange = onProviderChange || setLocalProvider;

    const handleSelectResult = (result: SearchResult) => {
        setSelectedResult(result);
    };

    const handleDismissResults = () => {
        setSearchResults([]);
    };

    return (
        <div style={{ position: 'relative', ...style }}>
            <div style={{
                position: 'absolute',
                bottom: 24,
                left: 24,
                zIndex: 1000,
                backgroundColor: 'white',
                padding: 4,
                borderRadius: 4,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}>
                <Select
                    value={currentProvider}
                    onChange={handleProviderChange}
                    size="small"
                    style={{ width: 140 }}
                    getPopupContainer={(trigger) => trigger.parentElement || document.body}
                >
                    {Object.entries(TileProviders).map(([key, provider]) => (
                        <Select.Option key={key} value={key}>{provider.name}</Select.Option>
                    ))}
                </Select>
            </div>
            {showDestinationOverlay && onLocateDestination && (
                <DestinationOverlay
                    config={config}
                    onLocate={onLocateDestination}
                    onSearch={setSearchQuery}
                />
            )}
            <SearchResultsList results={searchResults} onSelect={handleSelectResult} onDismiss={handleDismissResults} />
            <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution={TileProviders[currentProvider].attribution}
                    url={TileProviders[currentProvider].url}
                />
                <MapUpdater center={mapCenter} zoom={mapZoom} />
                <MapStateTracker onMapStateChange={onMapStateChange} />
                <MapResultFlier target={selectedResult} />
                <InteractionBridge
                    onAddSpot={onAddSpot}
                    onMarkLocation={onMarkLocation}
                    onSetDestination={onSetDestination}
                    hasDestination={!!config.destination}
                    isPickingLocation={isPickingLocation}
                    onMapClick={onMapClick}
                />
                <MapSearchHandler query={searchQuery} onResults={setSearchResults} provider={currentProvider} />
                {spots.map((spot) => (
                    <SpotMarker
                        key={spot.id}
                        spot={spot}
                        onEditSpot={onEditSpot}
                        onDeleteSpot={onDeleteSpot}
                        onUpdateSpot={onUpdateSpot}
                    />
                ))}
                {searchResults.map((r, i) => (
                    <SearchResultMarker
                        key={`search-${r.place_id}`}
                        result={r}
                        index={i}
                    />
                ))}
                {config.destination && (
                    <Marker
                        position={[config.destination.lat, config.destination.lng]}
                        icon={DestinationIcon}
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
