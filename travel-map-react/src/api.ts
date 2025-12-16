export interface Plan {
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

export interface Config {
    map_image: string;
    destination?: Destination;
    map_state?: MapState;
}

export interface Destination {
    name: string;
    lat: number;
    lng: number;
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

const API_BASE = '/api';

export const api = {
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

    // Plan Specific APIs
    getSpots: async (planId: string): Promise<Spot[]> => {
        const res = await fetch(`${API_BASE}/spots?planId=${planId}`);
        if (!res.ok) throw new Error('Failed to fetch spots');
        return res.json();
    },
    saveSpots: async (planId: string, spots: Spot[]) => {
        await fetch(`${API_BASE}/spots?planId=${planId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(spots),
        });
    },
    getFoods: async (planId: string): Promise<Food[]> => {
        const res = await fetch(`${API_BASE}/foods?planId=${planId}`);
        if (!res.ok) throw new Error('Failed to fetch foods');
        return res.json();
    },
    saveFoods: async (planId: string, foods: Food[]) => {
        await fetch(`${API_BASE}/foods?planId=${planId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(foods),
        });
    },
    getRoutes: async (planId: string): Promise<Route[]> => {
        const res = await fetch(`${API_BASE}/routes?planId=${planId}`);
        if (!res.ok) throw new Error('Failed to fetch routes');
        return res.json();
    },
    saveRoutes: async (planId: string, routes: Route[]) => {
        await fetch(`${API_BASE}/routes?planId=${planId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(routes),
        });
    },
    getQuestions: async (planId: string): Promise<Question[]> => {
        const res = await fetch(`${API_BASE}/questions?planId=${planId}`);
        if (!res.ok) throw new Error('Failed to fetch questions');
        return res.json();
    },
    saveQuestions: async (planId: string, questions: Question[]) => {
        await fetch(`${API_BASE}/questions?planId=${planId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(questions),
        });
    },
    getReferences: async (planId: string): Promise<Reference[]> => {
        const res = await fetch(`${API_BASE}/references?planId=${planId}`);
        if (!res.ok) throw new Error('Failed to fetch references');
        return res.json();
    },
    saveReferences: async (planId: string, references: Reference[]) => {
        await fetch(`${API_BASE}/references?planId=${planId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(references),
        });
    },
    getConfig: async (planId: string): Promise<Config> => {
        const res = await fetch(`${API_BASE}/config?planId=${planId}`);
        if (!res.ok) throw new Error('Failed to fetch config');
        return res.json();
    },
    saveConfig: async (planId: string, config: Config) => {
        await fetch(`${API_BASE}/config?planId=${planId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config),
        });
    },
    getGuideImages: async (planId: string): Promise<GuideImage[]> => {
        const res = await fetch(`${API_BASE}/guide-images?planId=${planId}`);
        if (!res.ok) throw new Error('Failed to fetch guide images');
        return res.json();
    },
    saveGuideImages: async (planId: string, images: GuideImage[]) => {
        await fetch(`${API_BASE}/guide-images?planId=${planId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(images),
        });
    },
    uploadGuideImage: async (planId: string, file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('planId', planId);
        const res = await fetch(`${API_BASE}/upload-guide-image`, {
            method: 'POST',
            body: formData,
        });
        if (!res.ok) throw new Error('Failed to upload image');
        const data = await res.json();
        return data.url;
    },
};
