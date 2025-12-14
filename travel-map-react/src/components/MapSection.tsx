import { useState, useEffect, useRef } from 'react';
import { Card, Button, Modal, Input, message, Select, Spin, Space } from 'antd';
import { ExpandOutlined, FlagOutlined } from '@ant-design/icons';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import type { Config, Spot, Destination, MapState } from '../api';
import { MapViewer } from './PlanMap/MapViewer';
import { SpotEditModal } from './PlanMap/SpotEditModal';
import { DestinationEditModal } from './PlanMap/DestinationEditModal';

// Fix leaflet marker icons (ensure loaded)
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapSectionProps {
    planId: string;
    config: Config;
    spots: Spot[];
    onSaveConfig: (c: Config) => void;
    onSaveSpots: (s: Spot[]) => void;
}

export const MapSection = ({ planId, config, spots, onSaveConfig, onSaveSpots }: MapSectionProps) => {
    const navigate = useNavigate();
    const [isAddingSpot, setIsAddingSpot] = useState(false);
    const [newSpotName, setNewSpotName] = useState('');
    // Temp coords for adding spot via modal
    const [tempLatLng, setTempLatLng] = useState<{ lat: number; lng: number } | null>(null);

    // Editing state
    const [editingSpot, setEditingSpot] = useState<Spot | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Destination editing state
    const [isDestinationModalOpen, setIsDestinationModalOpen] = useState(false);
    const [pendingDestination, setPendingDestination] = useState<{ lat: number, lng: number, zoom: number, center: { lat: number, lng: number } } | null>(null);

    const [mapCenter, setMapCenter] = useState<[number, number]>([39.9042, 116.4074]);
    const [mapZoom, setMapZoom] = useState<number>(13);

    const [searchOptions, setSearchOptions] = useState<{ label: string; value: string; lat: number; lng: number }[]>([]);
    const [searchFetching, setSearchFetching] = useState(false);
    const searchTimeoutRef = useRef<number | null>(null);

    // Initialize map state from config
    useEffect(() => {
        if (config.map_state) {
            setMapCenter([config.map_state.lat, config.map_state.lng]);
            setMapZoom(config.map_state.zoom);
        } else if (config.destination) {
            setMapCenter([config.destination.lat, config.destination.lng]);
            setMapZoom(13); // Default zoom if no map_state
        }
    }, [config]);

    // Handler for MapViewer's onAddSpot
    const handleAddSpotRequest = (lat: number, lng: number) => {
        setTempLatLng({ lat, lng });
        setIsAddingSpot(true);
        setNewSpotName('');
    };

    const handleAddSpotConfirm = () => {
        if (tempLatLng && newSpotName) {
            const newSpot: Spot = {
                id: Date.now().toString(),
                name: newSpotName,
                time: '',
                interior: '',
                story: '',
                lat: tempLatLng.lat,
                lng: tempLatLng.lng,
            };
            onSaveSpots([...spots, newSpot]);
            setIsAddingSpot(false);
            setTempLatLng(null);
        }
    };

    const handleMarkLocation = (lat: number, lng: number) => {
        const newSpot: Spot = {
            id: Date.now().toString(),
            name: '标记位置',
            time: '',
            interior: '',
            story: '',
            lat: lat,
            lng: lng,
            icon: 'flag',
            hide_in_list: true,
        };
        onSaveSpots([...spots, newSpot]);
        message.success("已标记位置");
    };

    const handleEditSpot = (spot: Spot) => {
        setEditingSpot(spot);
        setIsEditModalOpen(true);
    };

    const handleSaveEditSpot = (updatedSpot: Spot) => {
        const newSpots = spots.map(s => s.id === updatedSpot.id ? updatedSpot : s);
        onSaveSpots(newSpots);
        setIsEditModalOpen(false);
        setEditingSpot(null);
    };

    const handleDeleteSpot = (spot: Spot) => {
        const newSpots = spots.filter(s => s.id !== spot.id);
        onSaveSpots(newSpots);
        setIsEditModalOpen(false);
        setEditingSpot(null);
        message.success("已删除地点");
    };

    // Handler for MapViewer's onSetDestination
    const handleSetDestination = (center: L.LatLng, zoom: number, destLat: number, destLng: number) => {
        setPendingDestination({
            lat: destLat,
            lng: destLng,
            zoom: zoom,
            center: { lat: center.lat, lng: center.lng }
        });
        setIsDestinationModalOpen(true);
    };

    const handleSaveDestination = (name: string) => {
        if (!pendingDestination) return;

        const newDestination: Destination = {
            name: name,
            lat: pendingDestination.lat,
            lng: pendingDestination.lng,
        };

        const newMapState: MapState = {
            lat: pendingDestination.center.lat,
            lng: pendingDestination.center.lng,
            zoom: pendingDestination.zoom,
        };

        const newConfig = {
            ...config,
            destination: newDestination,
            map_state: newMapState,
        };

        onSaveConfig(newConfig);
        message.success("目的地已设置");
        setIsDestinationModalOpen(false);
        setPendingDestination(null);
    };

    const fetchSearchResults = async (value: string) => {
        if (!value) {
            setSearchOptions([]);
            return;
        }
        setSearchFetching(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}`);
            const data = await response.json();
            if (data && Array.isArray(data)) {
                const options = data.map((item: any) => ({
                    label: item.display_name,
                    value: item.place_id ? String(item.place_id) : Math.random().toString(),
                    lat: parseFloat(item.lat),
                    lng: parseFloat(item.lon),
                }));
                setSearchOptions(options);
            } else {
                setSearchOptions([]);
            }
        } catch (error) {
            console.error("Search failed", error);
            message.error('搜索失败');
        } finally {
            setSearchFetching(false);
        }
    };

    const handleSearch = (value: string) => {
        if (searchTimeoutRef.current) {
            window.clearTimeout(searchTimeoutRef.current);
        }
        searchTimeoutRef.current = window.setTimeout(() => {
            fetchSearchResults(value);
        }, 800);
    };

    const handleSelect = (_: string, option: any) => {
        setMapCenter([option.lat, option.lng]);
        setMapZoom(13);
    };

    return (
        <Card
            title="地图"
            extra={
                <Space>
                    <Button icon={<ExpandOutlined />} onClick={() => navigate(`/plan/${planId}/map`)}>详情</Button>
                </Space>
            }
            bordered={false}
        >
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                <Select
                    showSearch
                    placeholder="搜索地点..."
                    style={{ width: '100%', maxWidth: 400 }}
                    filterOption={false}
                    onSearch={handleSearch}
                    onChange={handleSelect}
                    notFoundContent={searchFetching ? <Spin size="small" /> : null}
                    options={searchOptions}
                    size="large"
                />
                {config.destination && (
                    <div style={{ display: 'flex', alignItems: 'center', color: '#1890ff', fontSize: '16px' }}>
                        <FlagOutlined style={{ marginRight: 8 }} />
                        <span style={{ fontWeight: 'bold' }}>目的地: {config.destination.name}</span>
                    </div>
                )}
            </div>
            <div style={{ height: '400px', borderRadius: '8px', overflow: 'hidden' }}>
                <MapViewer
                    config={config}
                    mapCenter={mapCenter}
                    mapZoom={mapZoom}
                    spots={spots}
                    onAddSpot={handleAddSpotRequest}
                    onMarkLocation={handleMarkLocation}
                    onEditSpot={handleEditSpot}
                    onDeleteSpot={handleDeleteSpot}
                    onSetDestination={handleSetDestination}
                    showDestinationOverlay={false}
                    style={{ height: '100%', width: '100%' }}
                />
            </div>

            <Modal
                title="添加景点"
                open={isAddingSpot}
                onOk={handleAddSpotConfirm}
                onCancel={() => setIsAddingSpot(false)}
                okText="添加"
                cancelText="取消"
            >
                <Input
                    placeholder="景点名称"
                    value={newSpotName}
                    onChange={(e) => setNewSpotName(e.target.value)}
                    onPressEnter={handleAddSpotConfirm}
                />
            </Modal>

            <SpotEditModal
                open={isEditModalOpen}
                spot={editingSpot}
                onOk={handleSaveEditSpot}
                onCancel={() => setIsEditModalOpen(false)}
                onDelete={handleDeleteSpot}
            />

            <DestinationEditModal
                open={isDestinationModalOpen}
                initialName={config.destination?.name}
                onOk={handleSaveDestination}
                onCancel={() => {
                    setIsDestinationModalOpen(false);
                    setPendingDestination(null);
                }}
            />
        </Card>
    );
};
