'use server';

import { cookies } from 'next/headers';
import { refreshTokenAction } from './authActions';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

async function fetchWithRetry(url, options = {}) {
  const cookieStore = await cookies();
  let token = cookieStore.get('token')?.value;

  const performFetch = (authToken) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': authToken ? `Bearer ${authToken}` : '',
      },
    });
  };

  if (!token) {
    const refreshResult = await refreshTokenAction();
    if (refreshResult.success) {
      token = refreshResult.token;
    } else {
      return { status: 401, error: 'Not authenticated' };
    }
  }

  let response = await performFetch(token);

  if (response.status === 401) {
    const refreshResult = await refreshTokenAction();
    if (refreshResult.success) {
      response = await performFetch(refreshResult.token);
    }
  }

  return response;
}

export async function getNotificationsAction() {
  try {
    const response = await fetchWithRetry(`${API_URL}/api/notifications`, {
      method: 'GET',
      next: { revalidate: 0 } // Always fetch freshest notifications
    });

    if (!response.ok) return { success: false, error: 'Failed to fetch notifications' };

    const data = await response.json();
    return { success: true, notifications: data.notifications, unreadCount: data.unreadCount };
  } catch (error) {
    return { success: false, error: 'Network error occurred' };
  }
}

export async function markAllNotificationsReadAction() {
  try {
    const response = await fetchWithRetry(`${API_URL}/api/notifications/read-all`, {
      method: 'PUT'
    });

    if (!response.ok) return { success: false, error: 'Failed to mark read' };

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Network error occurred' };
  }
}
