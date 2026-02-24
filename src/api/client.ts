
import { Business, User } from '../../types';

const API_BASE = '/api';

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
            'Content-Type': 'application/json',
        },
        ...options,
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
}

export const api = {
    // Businesses
    getBusinesses: () => fetchAPI<Business[]>('/businesses'),
    updateBusiness: (id: string, data: Partial<Business>) =>
        fetchAPI<Business>(`/businesses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

    // Checklists
    createChecklist: (businessId: string, title: string) =>
        fetchAPI(`/businesses/${businessId}/checklists`, { method: 'POST', body: JSON.stringify({ title }) }),
    updateChecklist: (id: string, title: string) =>
        fetchAPI(`/checklists/${id}`, { method: 'PUT', body: JSON.stringify({ title }) }),
    deleteChecklist: (id: string) =>
        fetchAPI(`/checklists/${id}`, { method: 'DELETE' }),

    // Tasks
    createTask: (checklistId: string, text: string) =>
        fetchAPI(`/checklists/${checklistId}/tasks`, { method: 'POST', body: JSON.stringify({ text }) }),
    updateTask: (id: string, data: { completed?: boolean; text?: string }) =>
        fetchAPI(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteTask: (id: string) =>
        fetchAPI(`/tasks/${id}`, { method: 'DELETE' }),

    // Auth
    login: (email: string, password?: string) =>
        fetchAPI<User>('/login', { method: 'POST', body: JSON.stringify({ email, password: password || 'password' }) }),

    // Users
    getUsers: () => fetchAPI<User[]>('/users'),
    createUser: (user: Partial<User>) =>
        fetchAPI<User>('/users', { method: 'POST', body: JSON.stringify(user) }),
    deleteUser: (id: string) =>
        fetchAPI(`/users/${id}`, { method: 'DELETE' }),
    updateUserPermissions: (id: string, permissions: string[]) =>
        fetchAPI<User>(`/users/${id}/permissions`, { method: 'PUT', body: JSON.stringify({ permissions }) }),
    updateUserCredentials: (id: string, data: { email?: string; password?: string }) =>
        fetchAPI<User>(`/users/${id}/credentials`, { method: 'PUT', body: JSON.stringify(data) }),
    /** Reset password by email so login works (CXO sets manager password) */
    resetCredentialsByEmail: (email: string, data: { newEmail?: string; newPassword?: string }) =>
        fetchAPI<User>('/users/reset-credentials', { method: 'POST', body: JSON.stringify({ email, ...data }) }),
};
