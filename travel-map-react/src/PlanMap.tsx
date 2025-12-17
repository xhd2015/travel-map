import { useEffect, useState, useRef } from 'react';
import { Layout, message, Spin } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { api } from './api';
import type { Spot, Config, Destination, MapState } from './api';
import { PlanMapSidebar } from './components/PlanMap/PlanMapSidebar';
import { MapViewer } from './components/PlanMap/MapViewer';
import { SpotEditModal } from './components/PlanMap/SpotEditModal';
import { DestinationEditModal } from './components/PlanMap/DestinationEditModal';
import { SpotAddModal } from './components/PlanMap/SpotAddModal';

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

    // Editing state
    const [editingSpot, setEditingSpot] = useState<Spot | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Adding spot state
    const [isAddingSpot, setIsAddingSpot] = useState(false);
    const [tempLatLng, setTempLatLng] = useState<{ lat: number; lng: number } | null>(null);

    // Destination editing state
    const [isDestinationModalOpen, setIsDestinationModalOpen] = useState(false);
    const [pendingDestination, setPendingDestination] = useState<{ lat: number, lng: number, zoom: number, center: { lat: number, lng: number } } | null>(null);

    // Search state
    const [searchText, setSearchText] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const searchTimeoutRef = useRef<number | null>(null);

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

    const handleSearch = (value: string) => {
        setSearchText(value);
        if (searchTimeoutRef.current) {
            window.clearTimeout(searchTimeoutRef.current);
        }
        if (!value) {
            setSearchResults([]);
            return;
        }
        searchTimeoutRef.current = window.setTimeout(() => {
            fetchSearchResults(value);
        }, 800);
    };

    const fetchSearchResults = async (value: string) => {
        setSearchLoading(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}`);
            const data = await response.json();
            setSearchResults(data || []);
        } catch (error) {
            console.error("Search failed", error);
            message.error('搜索失败');
        } finally {
            setSearchLoading(false);
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

    const handleAddSpotRequest = (lat: number, lng: number) => {
        setTempLatLng({ lat, lng });
        setIsAddingSpot(true);
    };

    const handleAddSpotConfirm = (name: string) => {
        if (!planId || !tempLatLng) return;

        const newSpot: Spot = {
            id: Date.now().toString(),
            name: name,
            time: '',
            interior: '',
            story: '',
            lat: tempLatLng.lat,
            lng: tempLatLng.lng,
        };

        setSpots(prev => {
            const newSpots = [...prev, newSpot];
            api.saveSpots(planId, newSpots);
            return newSpots;
        });

        setIsAddingSpot(false);
        setTempLatLng(null);
    };

    const handleMarkLocation = (lat: number, lng: number) => {
        if (!planId) return;
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
        setSpots(prev => {
            const newSpots = [...prev, newSpot];
            api.saveSpots(planId, newSpots);
            return newSpots;
        });
        message.success("已标记位置");
    };

    const handleEditSpot = (spot: Spot) => {
        setEditingSpot(spot);
        setIsEditModalOpen(true);
    };

    const handleSaveSpot = (updatedSpot: Spot) => {
        if (!planId) return;
        setSpots(prev => {
            const newSpots = prev.map(s => s.id === updatedSpot.id ? updatedSpot : s);
            api.saveSpots(planId, newSpots);
            return newSpots;
        });
        setIsEditModalOpen(false);
        setEditingSpot(null);
    };

    const handleDeleteSpot = (spot: Spot) => {
        if (!planId) return;
        setSpots(prev => {
            const newSpots = prev.filter(s => s.id !== spot.id);
            api.saveSpots(planId, newSpots);
            return newSpots;
        });
        setIsEditModalOpen(false);
        setEditingSpot(null);
        message.success("已删除地点");
    };

    const handleSetDestination = (center: L.LatLng, zoom: number, destLat: number, destLng: number) => {
        setPendingDestination({
            lat: destLat,
            lng: destLng,
            zoom: zoom,
            center: { lat: center.lat, lng: center.lng }
        });
        setIsDestinationModalOpen(true);
    };

    const handleSaveDestination = async (name: string) => {
        if (!planId || !pendingDestination) return;

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

        setConfig(newConfig);
        try {
            await api.saveConfig(planId, newConfig);
            message.success("目的地已设置");
        } catch (e) {
            console.error(e);
            message.error("保存失败");
        } finally {
            setIsDestinationModalOpen(false);
            setPendingDestination(null);
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
        <Layout style={{ height: '100vh' }}>
            <PlanMapSidebar
                onBack={() => navigate(`/plan/${planId}`)}
                searchText={searchText}
                onSearch={handleSearch}
                searchLoading={searchLoading}
                searchResults={searchResults}
                onSelectResult={handleSelectResult}
                spots={spots}
                onSelectSpot={handleSelectSpot}
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
                onCancel={() => {
                    setIsDestinationModalOpen(false);
                    setPendingDestination(null);
                }}
            />
        </Layout>
    );
}
