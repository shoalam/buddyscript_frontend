'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { refreshTokenAction } from './authActions';


const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';


/**
 * Fetch all posts from the backend.
 * @returns {Promise<{success: boolean, posts?: Array, error?: string}>}
 */
export async function getPostsAction() {
  const cookieStore = await cookies();
  let token = cookieStore.get('token')?.value;

  async function performFetch(authToken) {
    return fetch(`${API_URL}/api/posts`, {
      method: 'GET',
      headers: {
        'Authorization': authToken ? `Bearer ${authToken}` : '',
      },
      next: { revalidate: 0 }, 
    });
  }

  try {
    let response = await performFetch(token);

    // If unauthorized, try to refresh
    if (response.status === 401) {
      console.log('[getPostsAction] Token expired, attempting refresh...');
      const refreshResult = await refreshTokenAction();
      
      if (refreshResult.success) {
        console.log('[getPostsAction] Refresh successful, retrying...');
        response = await performFetch(refreshResult.token);
      }
    }

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.message || 'Failed to fetch posts' };
    }

    return { success: true, posts: data.posts };
  } catch (error) {
    console.error('[getPostsAction] Error:', error);
    return { success: false, error: 'Network error occurred' };
  }
}


/**
 * Create a new post.
 * @param {any} prevState 
 * @param {FormData} formData 
 * @returns {Promise<{success?: boolean, error?: string}>}
 */
export async function createPostAction(prevState, formData) {
  const cookieStore = await cookies();
  let token = cookieStore.get('token')?.value;

  async function performPost(authToken) {
    return fetch(`${API_URL}/api/posts`, {
      method: 'POST',
      headers: {
        'Authorization': authToken ? `Bearer ${authToken}` : '',
      },
      body: formData,
    });
  }

  try {
    if (!token) {
       // Try refresh once if token is missing
       const refreshResult = await refreshTokenAction();
       if (refreshResult.success) {
         token = refreshResult.token;
       } else {
         return { error: 'You must be logged in to post' };
       }
    }

    let response = await performPost(token);

    // If unauthorized, try to refresh
    if (response.status === 401) {
      console.log('[createPostAction] Token expired, attempting refresh...');
      const refreshResult = await refreshTokenAction();
      
      if (refreshResult.success) {
        console.log('[createPostAction] Refresh successful, retrying...');
        response = await performPost(refreshResult.token);
      }
    }

    const data = await response.json();

    if (!response.ok) {
      console.error(`[Server Action] Backend error (${response.status}):`, data);
      return { error: data?.message || `Backend error: ${response.statusText}` };
    }

    // Revalidate the feed path to show the new post
    revalidatePath('/feed');
    return { success: true };
  } catch (error) {
    console.error('[Server Action] Exception in createPostAction:', error);
    return { error: 'Network error occurred while connecting to the backend' };
  }
}


/**
 * Delete a post.
 * @param {string} postId 
 * @returns {Promise<{success?: boolean, error?: string}>}
 */
export async function deletePostAction(postId) {
  const cookieStore = await cookies();
  let token = cookieStore.get('token')?.value;

  async function performDelete(authToken) {
    return fetch(`${API_URL}/api/posts/${postId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': authToken ? `Bearer ${authToken}` : '',
      },
    });
  }

  try {
    let response = await performDelete(token);

    if (response.status === 401) {
      const refreshResult = await refreshTokenAction();
      if (refreshResult.success) {
        response = await performDelete(refreshResult.token);
      }
    }

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.message || 'Failed to delete post' };
    }

    revalidatePath('/feed');
    return { success: true };
  } catch (error) {
    console.error('[deletePostAction] Error:', error);
    return { success: false, error: 'Network error occurred' };
  }
}

/**
 * Update post visibility.
 * @param {string} postId 
 * @param {string} visibility 
 * @returns {Promise<{success?: boolean, error?: string}>}
 */
export async function updatePostVisibilityAction(postId, visibility) {
  const cookieStore = await cookies();
  let token = cookieStore.get('token')?.value;

  async function performUpdate(authToken) {
    return fetch(`${API_URL}/api/posts/${postId}`, {
      method: 'PUT',
      headers: {
        'Authorization': authToken ? `Bearer ${authToken}` : '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ visibility }),
    });
  }

  try {
    let response = await performUpdate(token);

    if (response.status === 401) {
      const refreshResult = await refreshTokenAction();
      if (refreshResult.success) {
        response = await performUpdate(refreshResult.token);
      }
    }

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.message || 'Failed to update visibility' };
    }

    revalidatePath('/feed');
    return { success: true };
  } catch (error) {
    console.error('[updatePostVisibilityAction] Error:', error);
    return { success: false, error: 'Network error occurred' };
  }
}


