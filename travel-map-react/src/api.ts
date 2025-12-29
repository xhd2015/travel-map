export const APP_BASE = (import.meta as any).env?.BASE_URL || '';

const getUrl = (url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    return `${API_BASE}${url}`;
};

export interface Plan {
    id: string;
    name: string;
    created_at: string;
}

export interface Destination {
    id: string;
    name: string;
    created_at: string;
    order?: number;
}

export interface Spot {
    id: string;
    name: string;
    time: string;
    interior: string;
    story: string;
    play_time?: string;
    reservation_required?: boolean;
    reservation_info?: string;
    lat?: number;
    lng?: number;
    icon?: string;
    icon_base64?: string;
    hide_in_list?: boolean;
    website?: string;
    rating?: number;
}

export interface Food {
    id: string;
    name: string;
    time: string;
    type: string;
    rating?: number;
    comment: string;
    recommended_restaurants?: string;
    reservation_required?: boolean;
    reservation_info?: string;
    lat?: number;
    lng?: number;
    website?: string;
}

export interface Route {
    id: string;
    name: string;
    time: string;
    spots: string[];
    duration: string;
    story: string;
    children?: Route[];
}

export interface Question {
    id: string;
    question: string;
    answer: string;
}

export interface Reference {
    id: string;
    description: string;
    link: string;
    link_base64?: string;
}

export interface DestinationConfig {
    name: string;
    lat: number;
    lng: number;
}

export interface Config {
    map_image: string;
    map_image_base64?: string;
    destination?: DestinationConfig;
    map_state?: MapState;
    map_provider?: string;
}

export interface MapState {
    lat: number;
    lng: number;
    zoom: number;
}

export interface GuideImage {
    id: string;
    url: string;
    base64_data?: string;
}

export interface Schedule {
    id: string;
    content: string;
}

export interface ItineraryItem {
    id: string;
    time: string;
    activity: string;
    description: string;
    reference: string;
}

export interface FullDestination {
    destination: Destination;
    spots: Spot[];
    foods: Food[];
    routes: Route[];
    questions: Question[];
    references: Reference[];
    config: Config;
    guide_images: GuideImage[];
    schedules: Schedule[];
    itineraries: ItineraryItem[];
}

export interface FullPlan {
    plan: Plan;
    destinations: FullDestination[];
}

const API_BASE = (import.meta as any).env?.VITE_API_PREFIX || '/api';


export interface SearchResult {
    place_id?: string;
    display_name: string;
    lat: string | number;
    lon: string | number;
    [key: string]: any;
}

// Core API Helpers
export const get = async <T>(url: string, init?: RequestInit): Promise<T> => {
    const res = await fetch(getUrl(url), init);
    if (!res.ok) {
        if (res.status === 401) {
            // Let caller handle 401 if needed, or throw specific error
            // For searchGaode we need to detect 401. 
            // But get() is generic.
            // We'll throw an error with status attached if possible, or just standard Error.
            // But wait, the previous code had specific logic for 401 in searchGaode.
        }
        throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
    }
    return res.json();
};

export const postJSON = async <T>(url: string, data: any, init?: RequestInit): Promise<T> => {
    const res = await fetch(getUrl(url), {
        ...init,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(init?.headers || {})
        },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        throw new Error(`Failed to post to ${url}: ${res.status} ${res.statusText}`);
    }
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
};

export const putJSON = async <T = void>(url: string, data: any, init?: RequestInit): Promise<T> => {
    const res = await fetch(getUrl(url), {
        ...init,
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...(init?.headers || {})
        },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        throw new Error(`Failed to put to ${url}: ${res.status} ${res.statusText}`);
    }
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
};

export const del = async (url: string, init?: RequestInit): Promise<void> => {
    const res = await fetch(getUrl(url), {
        ...init,
        method: 'DELETE',
    });
    if (!res.ok) {
        throw new Error(`Failed to delete ${url}: ${res.status} ${res.statusText}`);
    }
};

export const api = {
    // Search APIs
    searchGaode: async (query: string, signal?: AbortSignal): Promise<SearchResult[]> => {
        // searchGaode has specific error handling for 401, so we might want to keep using fetch
        // or wrap get() and catch the error.
        // But get() throws "Failed to fetch...".
        // Let's keep using fetch directly for searchGaode as it's a proxy call with specific error handling logic 
        // that differs from standard REST API calls. 
        // OR we can make get() take an option to not throw?
        // Simpler: just use fetch here as it was, but use API_BASE.

        const response = await fetch(`${API_BASE}/proxy/search?keywords=${encodeURIComponent(query)}`, {
            signal
        });

        if (response.status === 401) {
            throw new Error('AMAP_KEY_MISSING');
        }

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const json = await response.json();

        if (json.pois && Array.isArray(json.pois)) {
            return json.pois.map((poi: any) => {
                const [lng, lat] = (poi.location || "0,0").split(',');
                return {
                    place_id: poi.id,
                    display_name: `${poi.name} - ${poi.address || ''}`,
                    lat: parseFloat(lat),
                    lon: parseFloat(lng),
                    ...poi
                };
            });
        }
        return [];
    },

    searchNominatim: async (query: string, bounds?: { west: number, north: number, east: number, south: number }, signal?: AbortSignal): Promise<SearchResult[]> => {
        let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
        if (bounds) {
            const viewbox = `${bounds.west},${bounds.north},${bounds.east},${bounds.south}`;
            url += `&viewbox=${viewbox}&bounded=1&limit=10`;
        }

        const response = await fetch(url, { signal });
        const data = await response.json();
        if (Array.isArray(data)) {
            return data; // Nominatim returns array of objects that mostly match SearchResult
        }
        return [];
    },

    // Plans (High Level)
    getPlans: () => get<Plan[]>(`/plans`),
    createPlan: (name: string) => postJSON<Plan>(`/plans`, { name }),
    updatePlan: (id: string, plan: Partial<Plan>) => putJSON(`/plans?id=${id}`, plan),
    deletePlan: (id: string) => del(`/plans?id=${id}`),

    // Destinations (Sub-plans)
    getDestinations: (planId: string) => get<Destination[]>(`/destinations?planId=${planId}`),
    createDestination: (planId: string, name: string) => postJSON<Destination>(`/destinations?planId=${planId}`, { name }),
    updateDestination: (planId: string, destId: string, dest: Partial<Destination>) => putJSON(`/destinations?planId=${planId}&id=${destId}`, dest),
    deleteDestination: (planId: string, destId: string) => del(`/destinations?planId=${planId}&id=${destId}`),

    // Destination Specific APIs (Spots, Routes, etc.)
    getSpots: (planId: string, destId: string) => get<Spot[]>(`/spots?planId=${planId}&destId=${destId}`),
    saveSpots: (planId: string, destId: string, spots: Spot[]) => postJSON(`/spots?planId=${planId}&destId=${destId}`, spots),

    getFoods: (planId: string, destId: string) => get<Food[]>(`/foods?planId=${planId}&destId=${destId}`),
    saveFoods: (planId: string, destId: string, foods: Food[]) => postJSON(`/foods?planId=${planId}&destId=${destId}`, foods),

    getRoutes: (planId: string, destId: string) => get<Route[]>(`/routes?planId=${planId}&destId=${destId}`),
    saveRoutes: (planId: string, destId: string, routes: Route[]) => postJSON(`/routes?planId=${planId}&destId=${destId}`, routes),

    getQuestions: (planId: string, destId: string) => get<Question[]>(`/questions?planId=${planId}&destId=${destId}`),
    saveQuestions: (planId: string, destId: string, questions: Question[]) => postJSON(`/questions?planId=${planId}&destId=${destId}`, questions),

    getReferences: (planId: string, destId: string) => get<Reference[]>(`/references?planId=${planId}&destId=${destId}`),
    saveReferences: (planId: string, destId: string, references: Reference[]) => postJSON(`/references?planId=${planId}&destId=${destId}`, references),

    getConfig: (planId: string, destId: string) => get<Config>(`/config?planId=${planId}&destId=${destId}`),
    saveConfig: (planId: string, destId: string, config: Config) => postJSON(`/config?planId=${planId}&destId=${destId}`, config),

    getGuideImages: (planId: string, destId: string) => get<GuideImage[]>(`/guide-images?planId=${planId}&destId=${destId}`),
    saveGuideImages: (planId: string, destId: string, images: GuideImage[]) => postJSON(`/guide-images?planId=${planId}&destId=${destId}`, images),

    uploadGuideImage: async (planId: string, destId: string, file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('planId', planId);
        formData.append('destId', destId);
        const res = await fetch(`${API_BASE}/upload-guide-image`, {
            method: 'POST',
            body: formData,
        });
        if (!res.ok) throw new Error('Failed to upload image');
        const data = await res.json();
        return data.url;
    },

    getSchedules: (planId: string, destId: string) => get<Schedule[]>(`/schedules?planId=${planId}&destId=${destId}`),
    saveSchedules: (planId: string, destId: string, schedules: Schedule[]) => postJSON(`/schedules?planId=${planId}&destId=${destId}`, schedules),

    getItineraries: (planId: string, destId: string) => get<ItineraryItem[]>(`/itineraries?planId=${planId}&destId=${destId}`),
    saveItineraries: (planId: string, destId: string, itineraries: ItineraryItem[]) => postJSON(`/itineraries?planId=${planId}&destId=${destId}`, itineraries),

    // Import/Export
    exportPlans: async (planIds?: string[]) => {
        let url = `/export`;
        if (planIds && planIds.length > 0) {
            url += `?planIds=${planIds.join(',')}`;
        }

        const res = await fetch(getUrl(url));
        if (!res.ok) {
            throw new Error(`Failed to export plans: ${res.status} ${res.statusText}`);
        }

        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = 'travel-map-export.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
    },
    importPlans: (plans: FullPlan[]) => postJSON(`/import`, plans),
};
