'use server';

import { cookies } from 'next/headers';
import { refreshTokenAction } from './authActions';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

/**
 * Helper to fetch with token retry logic
 */
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

  // Try once or attempt refresh if no token
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


export async function toggleLikeAction(targetId, targetType = 'Post') {
  try {
    const response = await fetchWithRetry(`${API_URL}/api/posts/${targetId}/likes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetType })
    });

    if (response.status === 401) return { success: false, error: 'Unauthorized' };
    
    const data = await response.json();
    return { success: response.ok, message: data.message, error: data.message };
  } catch (error) {
    return { success: false, error: 'Network error occurred' };
  }
}

export async function getLikersAction(targetId) {
  try {
    // This is Public/Auth route, so token is optional, but we'll try to include it if available
    const response = await fetchWithRetry(`${API_URL}/api/posts/${targetId}/likes`, {
      method: 'GET'
    });

    if (!response.ok) return { success: false, error: 'Failed to fetch likers' };

    const data = await response.json();
    return { success: true, likers: data.likers };
  } catch (error) {
    return { success: false, error: 'Network error occurred' };
  }
}

export async function getCommentsAction(postId) {
  try {
    const response = await fetchWithRetry(`${API_URL}/api/posts/${postId}/comments`, {
       method: 'GET',
       next: { revalidate: 0 }
    });

    if (!response.ok) return { success: false, error: 'Failed to fetch comments' };

    const data = await response.json();
    return { success: true, comments: data.comments };
  } catch (error) {
    return { success: false, error: 'Network error occurred' };
  }
}

export async function addCommentAction(postId, content, parentCommentId = null) {
  try {
    const payload = { content };
    if (parentCommentId) payload.parentCommentId = parentCommentId;

    const response = await fetchWithRetry(`${API_URL}/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) return { success: false, error: data.message || 'Failed to post comment' };

    return { success: true, comment: data.comment };
  } catch (error) {
    return { success: false, error: 'Network error occurred' };
  }
}
