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


export async function toggleLikeAction(targetId, targetType = 'Post', reactionType = 'Like') {
  try {
    const response = await fetchWithRetry(`${API_URL}/api/posts/${targetId}/likes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetType, reactionType })
    });

    if (response.status === 401) return { success: false, error: 'Unauthorized' };
    
    const data = await response.json();
    return { success: response.ok, message: data.message, error: data.message };
  } catch (error) {
    return { success: false, error: 'Network error occurred' };
  }
}

export async function getLikersAction(targetId, targetType = null) {
  try {
    let url = `${API_URL}/api/posts/${targetId}/likes`;
    if (targetType) {
      url += `?targetType=${encodeURIComponent(targetType)}`;
    }

    const response = await fetchWithRetry(url, {
      method: 'GET'
    });

    if (!response.ok) return { success: false, error: 'Failed to fetch likers' };

    const data = await response.json();
    return { 
      success: true, 
      likers: data.likers, 
      countsByReaction: data.countsByReaction 
    };
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

    const contentType = response.headers.get('content-type');
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      return { success: false, error: 'Server returned a non-JSON response.' };
    }

    if (!response.ok) return { success: false, error: data.message || 'Failed to post comment' };

    return { success: true, comment: data.comment };
  } catch (error) {
    return { success: false, error: 'Network error occurred' };
  }
}

export async function deleteCommentAction(commentId) {
  try {
    const response = await fetchWithRetry(`${API_URL}/api/posts/comments/${commentId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const data = await response.json();
      return { success: false, error: data.message || 'Failed to delete comment' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Network error occurred' };
  }
}

export async function updateCommentAction(commentId, content) {
  try {
    const response = await fetchWithRetry(`${API_URL}/api/posts/comments/${commentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });

    const contentType = response.headers.get('content-type');
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      return { success: false, error: 'Server returned a non-JSON response.' };
    }

    if (!response.ok) return { success: false, error: data.message || 'Failed to update comment' };

    return { success: true, comment: data.comment };
  } catch (error) {
    return { success: false, error: 'Network error occurred' };
  }
}
