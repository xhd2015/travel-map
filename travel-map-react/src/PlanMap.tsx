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
import { useDebounce } from './hooks/useDebounce';
import { DEFAULT_MAP_CENTER } from './utils/mapConstants';

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
    const { planId, destId } = useParams<{ planId: string; destId: string }>();
    const navigate = useNavigate();
    const [spots, setSpots] = useState<Spot[]>([]);
    const [config, setConfig] = useState<Config>({ map_image: '' });
    const [loading, setLoading] = useState(true);
    const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_MAP_CENTER);
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
                if (planId && destId) {
                    await api.saveConfig(planId, destId, newConfig);
                }
            } catch (e) {
                console.error(e);
                message.error("保存配置失败");
            }
        },
        onSaveSpots: async (newSpots) => {
            setSpots(newSpots);
            try {
                if (planId && destId) {
                    await api.saveSpots(planId, destId, newSpots);
                }
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

    // Debounced save
    const debouncedSaveConfig = useDebounce((newConfig: Config) => {
        if (planId && destId) {
            api.saveConfig(planId, destId, newConfig).catch(console.error);
        }
    }, 1000);

    useEffect(() => {
        if (planId && destId) {
            loadData(planId, destId);
        }
    }, [planId, destId]);

    const loadData = async (pId: string, dId: string) => {
        try {
            const [s, c] = await Promise.all([
                api.getSpots(pId, dId),
                api.getConfig(pId, dId),
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

    const handleMapStateChange = (center: { lat: number, lng: number }, zoom: number) => {
        // Update local state immediately for responsiveness
        setMapCenter([center.lat, center.lng]);
        setMapZoom(zoom);

        const newConfig = {
            ...config,
            map_state: {
                lat: center.lat,
                lng: center.lng,
                zoom: zoom
            }
        };

        // Optimistically update local config to avoid stale state in next timeout
        setConfig(newConfig);

        // Trigger debounced save
        debouncedSaveConfig(newConfig);
    };

    if (!planId || !destId) return <div>Invalid URL</div>;
    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" /></div>;

    return (
        <Layout style={{ height: '100vh' }} hasSider>
            <PlanMapSidebar
                onBack={() => navigate(`/plans/${planId}/destinations/${destId}`)}
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
                    onMapStateChange={handleMapStateChange}
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
