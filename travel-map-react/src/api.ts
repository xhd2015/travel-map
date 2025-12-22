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
}

export interface DestinationConfig {
    name: string;
    lat: number;
    lng: number;
}

export interface Config {
    map_image: string;
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

const API_BASE = '/api';

export interface SearchResult {
    place_id?: string;
    display_name: string;
    lat: string | number;
    lon: string | number;
    [key: string]: any;
}

export const api = {
    // Search APIs
    searchGaode: async (query: string, signal?: AbortSignal): Promise<SearchResult[]> => {
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
    getPlans: async (): Promise<Plan[]> => {
        const res = await fetch(`${API_BASE}/plans`);
        if (!res.ok) throw new Error('Failed to fetch plans');
        return res.json();
    },
    createPlan: async (name: string): Promise<Plan> => {
        const res = await fetch(`${API_BASE}/plans`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        });
        if (!res.ok) throw new Error('Failed to create plan');
        return res.json();
    },
    updatePlan: async (id: string, plan: Partial<Plan>): Promise<void> => {
        await fetch(`${API_BASE}/plans?id=${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(plan),
        });
    },
    deletePlan: async (id: string) => {
        const res = await fetch(`${API_BASE}/plans?id=${id}`, {
            method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete plan');
    },

    // Destinations (Sub-plans)
    getDestinations: async (planId: string): Promise<Destination[]> => {
        const res = await fetch(`${API_BASE}/destinations?planId=${planId}`);
        if (!res.ok) throw new Error('Failed to fetch destinations');
        return res.json();
    },
    createDestination: async (planId: string, name: string): Promise<Destination> => {
        const res = await fetch(`${API_BASE}/destinations?planId=${planId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        });
        if (!res.ok) throw new Error('Failed to create destination');
        return res.json();
    },
    updateDestination: async (planId: string, destId: string, dest: Partial<Destination>): Promise<void> => {
        await fetch(`${API_BASE}/destinations?planId=${planId}&id=${destId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dest),
        });
    },
    deleteDestination: async (planId: string, destId: string) => {
        const res = await fetch(`${API_BASE}/destinations?planId=${planId}&id=${destId}`, {
            method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete destination');
    },

    // Destination Specific APIs (Spots, Routes, etc.)
    getSpots: async (planId: string, destId: string): Promise<Spot[]> => {
        const res = await fetch(`${API_BASE}/spots?planId=${planId}&destId=${destId}`);
        if (!res.ok) throw new Error('Failed to fetch spots');
        return res.json();
    },
    saveSpots: async (planId: string, destId: string, spots: Spot[]) => {
        await fetch(`${API_BASE}/spots?planId=${planId}&destId=${destId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(spots),
        });
    },
    getFoods: async (planId: string, destId: string): Promise<Food[]> => {
        const res = await fetch(`${API_BASE}/foods?planId=${planId}&destId=${destId}`);
        if (!res.ok) throw new Error('Failed to fetch foods');
        return res.json();
    },
    saveFoods: async (planId: string, destId: string, foods: Food[]) => {
        await fetch(`${API_BASE}/foods?planId=${planId}&destId=${destId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(foods),
        });
    },
    getRoutes: async (planId: string, destId: string): Promise<Route[]> => {
        const res = await fetch(`${API_BASE}/routes?planId=${planId}&destId=${destId}`);
        if (!res.ok) throw new Error('Failed to fetch routes');
        return res.json();
    },
    saveRoutes: async (planId: string, destId: string, routes: Route[]) => {
        await fetch(`${API_BASE}/routes?planId=${planId}&destId=${destId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(routes),
        });
    },
    getQuestions: async (planId: string, destId: string): Promise<Question[]> => {
        const res = await fetch(`${API_BASE}/questions?planId=${planId}&destId=${destId}`);
        if (!res.ok) throw new Error('Failed to fetch questions');
        return res.json();
    },
    saveQuestions: async (planId: string, destId: string, questions: Question[]) => {
        await fetch(`${API_BASE}/questions?planId=${planId}&destId=${destId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(questions),
        });
    },
    getReferences: async (planId: string, destId: string): Promise<Reference[]> => {
        const res = await fetch(`${API_BASE}/references?planId=${planId}&destId=${destId}`);
        if (!res.ok) throw new Error('Failed to fetch references');
        return res.json();
    },
    saveReferences: async (planId: string, destId: string, references: Reference[]) => {
        await fetch(`${API_BASE}/references?planId=${planId}&destId=${destId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(references),
        });
    },
    getConfig: async (planId: string, destId: string): Promise<Config> => {
        const res = await fetch(`${API_BASE}/config?planId=${planId}&destId=${destId}`);
        if (!res.ok) throw new Error('Failed to fetch config');
        return res.json();
    },
    saveConfig: async (planId: string, destId: string, config: Config) => {
        await fetch(`${API_BASE}/config?planId=${planId}&destId=${destId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config),
        });
    },
    getGuideImages: async (planId: string, destId: string): Promise<GuideImage[]> => {
        const res = await fetch(`${API_BASE}/guide-images?planId=${planId}&destId=${destId}`);
        if (!res.ok) throw new Error('Failed to fetch guide images');
        return res.json();
    },
    saveGuideImages: async (planId: string, destId: string, images: GuideImage[]) => {
        await fetch(`${API_BASE}/guide-images?planId=${planId}&destId=${destId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(images),
        });
    },
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
    getSchedules: async (planId: string, destId: string): Promise<Schedule[]> => {
        const res = await fetch(`${API_BASE}/schedules?planId=${planId}&destId=${destId}`);
        if (!res.ok) throw new Error('Failed to fetch schedules');
        return res.json();
    },
    saveSchedules: async (planId: string, destId: string, schedules: Schedule[]) => {
        await fetch(`${API_BASE}/schedules?planId=${planId}&destId=${destId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(schedules),
        });
    },
    getItineraries: async (planId: string, destId: string): Promise<ItineraryItem[]> => {
        const res = await fetch(`${API_BASE}/itineraries?planId=${planId}&destId=${destId}`);
        if (!res.ok) throw new Error('Failed to fetch itineraries');
        return res.json();
    },
    saveItineraries: async (planId: string, destId: string, itineraries: ItineraryItem[]) => {
        await fetch(`${API_BASE}/itineraries?planId=${planId}&destId=${destId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(itineraries),
        });
    },
};
