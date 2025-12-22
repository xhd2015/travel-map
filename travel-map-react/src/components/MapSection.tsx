import { useState, useEffect } from 'react';
import { Card, Button, Select, Spin, Space } from 'antd';
import { ExpandOutlined, FlagOutlined } from '@ant-design/icons';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import type { Config, Spot } from '../api';
import { MapViewer } from './PlanMap/MapViewer';
import { SpotEditModal } from './PlanMap/SpotEditModal';
import { DestinationEditModal } from './PlanMap/DestinationEditModal';
import { SpotAddModal } from './PlanMap/SpotAddModal';
import { useMapSearch } from '../hooks/useMapSearch';
import { useMapInteractions } from '../hooks/useMapInteractions';

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
    destId: string;
    config: Config;
    spots: Spot[];
    onSaveConfig: (c: Config) => void;
    onSaveSpots: (s: Spot[]) => void;
}

export const MapSection = ({ planId, destId, config, spots, onSaveConfig, onSaveSpots }: MapSectionProps) => {
    const navigate = useNavigate();
    const [mapCenter, setMapCenter] = useState<[number, number]>([39.9042, 116.4074]);
    const [mapZoom, setMapZoom] = useState<number>(13);
    const [searchOptions, setSearchOptions] = useState<{ label: string; value: string; lat: number; lng: number }[]>([]);

    // Map Interactions Hook
    const {
        isAddingSpot, setIsAddingSpot,
        // tempLatLng, setTempLatLng,
        editingSpot, // setEditingSpot,
        isEditModalOpen, setIsEditModalOpen,
        // pickingLocationSpot, setPickingLocationSpot,
        isDestinationModalOpen,
        // pendingDestination, setPendingDestination,
        mapProvider, setMapProvider,

        handleAddSpotRequest,
        handleAddSpotConfirm,
        handleMarkLocation,
        handleEditSpot,
        handleSaveSpot,
        handleDeleteSpot,
        // handlePickLocation,
        // handleMapClick,
        handleSetDestination,
        handleSaveDestination,
        closeDestinationModal
    } = useMapInteractions({
        planId,
        config,
        spots,
        onSaveConfig,
        onSaveSpots
    });

    // Map Search Hook
    const {
        searchResults,
        searchLoading,
        handleSearch
    } = useMapSearch(mapProvider);

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

    // Update search options when results change
    useEffect(() => {
        if (searchResults && Array.isArray(searchResults)) {
            const options = searchResults.map((item: any) => ({
                label: item.display_name,
                value: item.place_id ? String(item.place_id) : Math.random().toString(),
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon),
            }));
            setSearchOptions(options);
        } else {
            setSearchOptions([]);
        }
    }, [searchResults]);

    const handleSelect = (_: string, option: any) => {
        setMapCenter([option.lat, option.lng]);
        setMapZoom(13);
    };

    const title = (
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <span>地图</span>
        </div>
    );

    return (
        <Card
            title={title}
            extra={
                <Space>
                    <Button icon={<ExpandOutlined />} onClick={() => navigate(`/plans/${planId}/destinations/${destId}/map`)}>详情</Button>
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
                    onSearch={(val) => handleSearch(val, false)}
                    onChange={handleSelect}
                    notFoundContent={searchLoading ? <Spin size="small" /> : null}
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
                    onUpdateSpot={handleSaveSpot}
                    onSetDestination={handleSetDestination}
                    showDestinationOverlay={false}
                    style={{ height: '100%', width: '100%' }}
                    provider={mapProvider}
                    onProviderChange={setMapProvider}
                />
            </div>

            <SpotAddModal
                open={isAddingSpot}
                onOk={handleAddSpotConfirm}
                onCancel={() => setIsAddingSpot(false)}
            />

            <SpotEditModal
                open={isEditModalOpen}
                spot={editingSpot}
                onOk={handleSaveSpot}
                onCancel={() => setIsEditModalOpen(false)}
                onDelete={handleDeleteSpot}
            />

            <DestinationEditModal
                open={isDestinationModalOpen}
                initialName={config.destination?.name}
                onOk={handleSaveDestination}
                onCancel={closeDestinationModal}
            />
        </Card>
    );
};
