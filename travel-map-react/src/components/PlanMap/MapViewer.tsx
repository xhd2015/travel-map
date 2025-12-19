import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Button, Popconfirm, Select } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { Spot, Config } from '../../api';
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
    html: `<div style="background-color: #1890ff; width: 20px; height: 20px; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-size: 12px; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);">${num}</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

// Pre-generate numbered icons for stability
const NumberedIcons: Record<number, L.DivIcon> = {};
for (let i = 1; i <= 50; i++) {
    NumberedIcons[i] = createNumberedIcon(i);
}

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

interface SearchResult {
    place_id: string;
    lat: string;
    lon: string;
    display_name: string;
}

const MapSearchHandler = ({ query, onResults }: { query: string, onResults: (results: SearchResult[]) => void }) => {
    const map = useMap();
    useEffect(() => {
        if (!query) {
            onResults([]);
            return;
        }

        const bounds = map.getBounds();
        const viewbox = `${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()},${bounds.getSouth()}`;

        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&viewbox=${viewbox}&bounded=1&limit=10`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    onResults(data);
                }
            })
            .catch(err => console.error("Search failed", err));
    }, [query, map, onResults]);

    return null;
};

const MapResultFlier = ({ target }: { target: SearchResult | null }) => {
    const map = useMap();
    useEffect(() => {
        if (target) {
            map.flyTo([parseFloat(target.lat), parseFloat(target.lon)], 16);
        }
    }, [target, map]);
    return null;
};

const SearchResultsList = ({ results, onSelect }: { results: SearchResult[], onSelect: (r: SearchResult) => void }) => {
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
            <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>搜索结果</div>
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
            position={[parseFloat(result.lat), parseFloat(result.lon)]}
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
    onUpdateSpot,
    onSetDestination,
    onLocateDestination,
    showDestinationOverlay = true,
    style,
    isPickingLocation,
    onMapClick
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
    const [currentProvider, setCurrentProvider] = useState('gaode');

    const handleSelectResult = (result: SearchResult) => {
        setSelectedResult(result);
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
                    onChange={setCurrentProvider}
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
            <SearchResultsList results={searchResults} onSelect={handleSelectResult} />
            <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution={TileProviders[currentProvider].attribution}
                    url={TileProviders[currentProvider].url}
                    eventHandlers={{
                        tileloadstart: (e: any) => console.log('DEBUG tile load start', e.coords),
                        tileload: (e: any) => console.log('DEBUG tile load success', e.coords),
                        tileerror: (e: any) => console.error('DEBUG tile load error', e.coords, e.error)
                    }}
                />
                <MapUpdater center={mapCenter} zoom={mapZoom} />
                <MapResultFlier target={selectedResult} />
                <InteractionBridge
                    onAddSpot={onAddSpot}
                    onMarkLocation={onMarkLocation}
                    onSetDestination={onSetDestination}
                    hasDestination={!!config.destination}
                    isPickingLocation={isPickingLocation}
                    onMapClick={onMapClick}
                />
                <MapSearchHandler query={searchQuery} onResults={setSearchResults} />
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
