'use server';

import { cookies } from 'next/headers';
import { refreshTokenAction } from './authActions';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export async function getUsersAction() {
    try {
        const cookieStore = await cookies();
        let token = cookieStore.get('token')?.value;

        if (!token) {
            const refreshResult = await refreshTokenAction();
            if (refreshResult.success) {
                token = refreshResult.token;
            } else {
                return { error: 'Not authenticated' };
            }
        }

        const response = await fetch(`${API_URL}/api/users`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            next: { revalidate: 60 } // Cache for 60 seconds
        });

        const data = await response.json();

        if (response.status === 401) {
            const refreshResult = await refreshTokenAction();
            if (refreshResult.success) {
                const retryResponse = await fetch(`${API_URL}/api/users`, {
                    headers: {
                        'Authorization': `Bearer ${refreshResult.token}`,
                    },
                });
                const retryData = await retryResponse.json();
                return { users: retryData.users || [] };
            }
        }

        if (!response.ok) {
            return { error: data.message || 'Failed to fetch users' };
        }

        return { users: data.users || [] };
    } catch (error) {
        console.error('[Server Action] getUsersAction Error:', error);
        return { error: 'Network error occurred' };
    }
}
