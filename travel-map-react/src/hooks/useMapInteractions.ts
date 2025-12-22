import { useState, useEffect } from 'react';
import { message } from 'antd';
import L from 'leaflet';
import type { Spot, Config, DestinationConfig, MapState } from '../api';

interface UseMapInteractionsProps {
    planId: string;
    config: Config;
    spots: Spot[];
    onSaveConfig: (c: Config) => void;
    onSaveSpots: (s: Spot[]) => void;
}

export const useMapInteractions = ({
    planId,
    config,
    spots,
    onSaveConfig,
    onSaveSpots
}: UseMapInteractionsProps) => {
    // Adding spot state
    const [isAddingSpot, setIsAddingSpot] = useState(false);
    const [tempLatLng, setTempLatLng] = useState<{ lat: number; lng: number } | null>(null);

    // Editing state
    const [editingSpot, setEditingSpot] = useState<Spot | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Picking location state
    const [pickingLocationSpot, setPickingLocationSpot] = useState<Spot | null>(null);

    // Destination editing state
    const [isDestinationModalOpen, setIsDestinationModalOpen] = useState(false);
    const [pendingDestination, setPendingDestination] = useState<{ lat: number, lng: number, zoom: number, center: { lat: number, lng: number } } | null>(null);

    // Map Provider
    const [mapProvider, _setMapProvider] = useState('gaode');

    // Sync map provider from config
    useEffect(() => {
        if (config.map_provider) {
            _setMapProvider(config.map_provider);
        }
    }, [config.map_provider]);

    const setMapProvider = (provider: string) => {
        _setMapProvider(provider);
        if (planId) {
            onSaveConfig({
                ...config,
                map_provider: provider
            });
        }
    };


    // Handlers
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

        onSaveSpots([...spots, newSpot]);
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
        onSaveSpots([...spots, newSpot]);
        message.success("已标记位置");
    };

    const handleEditSpot = (spot: Spot) => {
        setEditingSpot(spot);
        setIsEditModalOpen(true);
    };

    const handleSaveSpot = (updatedSpot: Spot) => {
        if (!planId) return;
        const newSpots = spots.map(s => s.id === updatedSpot.id ? updatedSpot : s);
        onSaveSpots(newSpots);
        setIsEditModalOpen(false);
        setEditingSpot(null);
    };

    const handleDeleteSpot = (spot: Spot) => {
        if (!planId) return;
        const newSpots = spots.filter(s => s.id !== spot.id);
        onSaveSpots(newSpots);
        setIsEditModalOpen(false);
        setEditingSpot(null);
        message.success("已删除地点");
    };

    const handleReorderSpots = (fromIndex: number, toIndex: number) => {
        if (!planId) return;
        if (fromIndex < 0 || fromIndex >= spots.length || toIndex < 0 || toIndex >= spots.length) return;

        const newSpots = Array.from(spots);
        const [movedSpot] = newSpots.splice(fromIndex, 1);
        newSpots.splice(toIndex, 0, movedSpot);

        onSaveSpots(newSpots);
    };

    const handlePickLocation = (spot: Spot) => {
        setPickingLocationSpot(spot);
        message.info(`请在地图上点击为"${spot.name}"选择位置`);
    };

    const handleCancelPickLocation = () => {
        setPickingLocationSpot(null);
        message.info("已取消选择位置");
    };

    const handleMapClick = (lat: number, lng: number) => {
        if (pickingLocationSpot) {
            const updatedSpot = { ...pickingLocationSpot, lat, lng };
            handleSaveSpot(updatedSpot);
            setPickingLocationSpot(null);
            message.success(`已更新"${updatedSpot.name}"的位置`);
        }
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

    const handleSaveDestination = (name: string) => {
        if (!planId || !pendingDestination) return;

        const newDestination: DestinationConfig = {
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

    const closeDestinationModal = () => {
        setIsDestinationModalOpen(false);
        setPendingDestination(null);
    };

    return {
        isAddingSpot, setIsAddingSpot,
        tempLatLng, setTempLatLng,
        editingSpot, setEditingSpot,
        isEditModalOpen, setIsEditModalOpen,
        pickingLocationSpot, setPickingLocationSpot,
        isDestinationModalOpen, setIsDestinationModalOpen,
        pendingDestination, setPendingDestination,
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
    };
};

