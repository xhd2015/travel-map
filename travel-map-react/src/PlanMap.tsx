import { useEffect, useState } from 'react';
import { Layout, message, Spin } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { api } from './api';
import type { Spot, Config } from './api';
import { PlanMapSidebar } from './components/PlanMap/PlanMapSidebar';
import { MapViewer } from './components/PlanMap/MapViewer';
import { SpotEditModal } from './components/PlanMap/SpotEditModal';
import { DestinationEditModal } from './components/PlanMap/DestinationEditModal';
import { SpotAddModal } from './components/PlanMap/SpotAddModal';
import { useMapSearch } from './hooks/useMapSearch';
import { useMapInteractions } from './hooks/useMapInteractions';

// Fix leaflet marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = DefaultIcon;

const { Content } = Layout;

export default function PlanMap() {
    const { planId } = useParams<{ planId: string }>();
    const navigate = useNavigate();
    const [spots, setSpots] = useState<Spot[]>([]);
    const [config, setConfig] = useState<Config>({ map_image: '' });
    const [loading, setLoading] = useState(true);
    const [mapCenter, setMapCenter] = useState<[number, number]>([39.9042, 116.4074]);
    const [mapZoom, setMapZoom] = useState<number>(13);
    const [searchText, setSearchText] = useState('');

    // Map Interactions Hook
    const {
        isAddingSpot, setIsAddingSpot,
        // tempLatLng, setTempLatLng, // internal to hook, not needed here unless exposed
        editingSpot, // setEditingSpot,
        isEditModalOpen, setIsEditModalOpen,
        pickingLocationSpot, // setPickingLocationSpot,
        isDestinationModalOpen,
        mapProvider, setMapProvider,

        handleAddSpotRequest,
        handleAddSpotConfirm,
        handleMarkLocation,
        handleEditSpot,
        handleSaveSpot,
        handleDeleteSpot,
        handleReorderSpots,
        handlePickLocation,
        handleCancelPickLocation,
        handleMapClick,
        handleSetDestination,
        handleSaveDestination,
        closeDestinationModal
    } = useMapInteractions({
        planId: planId || '',
        config,
        spots,
        onSaveConfig: async (newConfig) => {
            setConfig(newConfig);
            try {
                await api.saveConfig(planId!, newConfig);
            } catch (e) {
                console.error(e);
                message.error("保存配置失败");
            }
        },
        onSaveSpots: async (newSpots) => {
            setSpots(newSpots);
            try {
                await api.saveSpots(planId!, newSpots);
            } catch (e) {
                console.error(e);
                message.error("保存地点失败");
            }
        }
    });

    // Map Search Hook
    const {
        searchResults,
        searchLoading,
        handleSearch: hookHandleSearch
    } = useMapSearch(mapProvider);

    const handleSearch = (value: string, immediate?: boolean) => {
        setSearchText(value);
        hookHandleSearch(value, immediate);
    };

    useEffect(() => {
        if (planId) {
            loadData(planId);
        }
    }, [planId]);

    const loadData = async (id: string) => {
        try {
            const [s, c] = await Promise.all([
                api.getSpots(id),
                api.getConfig(id),
            ]);
            setSpots(s || []);
            setConfig(c || { map_image: '' });

            // Restore map state if exists
            if (c && c.map_state) {
                setMapCenter([c.map_state.lat, c.map_state.lng]);
                setMapZoom(c.map_state.zoom);
            } else if (s && s.length > 0) {
                // Fallback to first spot
                const first = s.find(spot => spot.lat && spot.lng);
                if (first && first.lat && first.lng) {
                    setMapCenter([first.lat, first.lng]);
                }
            }
        } catch (e) {
            console.error("Failed to load data", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectResult = (item: any) => {
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        setMapCenter([lat, lng]);
        setMapZoom(13); // Reset zoom on search
    };

    const handleSelectSpot = (spot: Spot) => {
        if (spot.lat && spot.lng) {
            setMapCenter([spot.lat, spot.lng]);
            setMapZoom(15);
        }
    };

    const handleLocateDestination = () => {
        if (config.destination) {
            setMapCenter([config.destination.lat, config.destination.lng]);
            if (config.map_state) {
                setMapZoom(config.map_state.zoom);
            }
        }
    };

    if (!planId) return <div>Invalid Plan ID</div>;
    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" /></div>;

    return (
        <Layout style={{ height: '100vh' }} hasSider>
            <PlanMapSidebar
                onBack={() => navigate(`/plan/${planId}`)}
                searchText={searchText}
                onSearch={handleSearch}
                searchLoading={searchLoading}
                searchResults={searchResults}
                onSelectResult={handleSelectResult}
                spots={spots}
                onSelectSpot={handleSelectSpot}
                onReorderSpots={handleReorderSpots}
                onPickLocation={handlePickLocation}
                pickingLocationSpot={pickingLocationSpot}
                onCancelPickLocation={handleCancelPickLocation}
            />
            <Content style={{ position: 'relative' }}>
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
                    onLocateDestination={handleLocateDestination}
                    showDestinationOverlay={true}
                    style={{ height: '100%', width: '100%' }}
                    isPickingLocation={!!pickingLocationSpot}
                    onMapClick={handleMapClick}
                    provider={mapProvider}
                    onProviderChange={setMapProvider}
                />
            </Content>

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
        </Layout>
    );
}
