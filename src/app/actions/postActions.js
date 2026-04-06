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

    const contentType = response.headers.get('content-type');
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      return { success: false, error: 'Server returned a non-JSON response. It might be overloaded.' };
    }

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

  // Strip empty file field — when no image is selected the browser still
  // includes a File object with size 0 which triggers multer's type check.
  const imageFile = formData.get('image');
  if (!imageFile || typeof imageFile === 'string' || imageFile.size === 0) {
    formData.delete('image');
  }

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

    const contentType = response.headers.get('content-type');
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      return { error: 'Server returned a non-JSON response. It might be overloaded.' };
    }

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
 * Update a post (content, visibility, or image).
 * @param {string} postId 
 * @param {object|FormData} data - plain object for text/visibility or FormData for image uploads
 * @returns {Promise<{success?: boolean, mediaUrl?: string, error?: string}>}
 */
export async function updatePostAction(postId, data) {
  const cookieStore = await cookies();
  let token = cookieStore.get('token')?.value;

  const isFormData = data instanceof FormData;

  // Strip empty image field to prevent multer's type check error
  if (isFormData) {
    const imgFile = data.get('image');
    if (!imgFile || typeof imgFile === 'string' || imgFile.size === 0) {
      data.delete('image');
    }
  }

  async function performUpdate(authToken) {
    const options = {
      method: 'PUT',
      headers: {
        'Authorization': authToken ? `Bearer ${authToken}` : '',
      },
    };

    if (isFormData) {
      options.body = data; // Let browser set multipart Content-Type with boundary
    } else {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(data);
    }

    return fetch(`${API_URL}/api/posts/${postId}`, options);
  }

  try {
    let response = await performUpdate(token);

    if (response.status === 401) {
      const refreshResult = await refreshTokenAction();
      if (refreshResult.success) {
        response = await performUpdate(refreshResult.token);
      }
    }

    const contentType = response.headers.get('content-type');
    let resData;
    if (contentType && contentType.includes('application/json')) {
      resData = await response.json();
    } else {
      return { success: false, error: 'Server returned a non-JSON response.' };
    }

    if (!response.ok) {
      return { success: false, error: resData.message || 'Failed to update post' };
    }

    revalidatePath('/feed');
    return { 
      success: true, 
      mediaUrl: resData.post?.mediaUrl || null 
    };
  } catch (error) {
    console.error('[updatePostAction] Error:', error);
    return { success: false, error: 'Network error occurred' };
  }
}


