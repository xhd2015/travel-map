// Default map center (Beijing)
export const DEFAULT_MAP_CENTER: [number, number] = [39.9042, 116.4074];

export const isDefaultMapCenter = (lat: number, lng: number): boolean => {
    return lat === DEFAULT_MAP_CENTER[0] && lng === DEFAULT_MAP_CENTER[1];
};

export const isDefaultMapCenterArray = (center: [number, number]): boolean => {
    return isDefaultMapCenter(center[0], center[1]);
};

