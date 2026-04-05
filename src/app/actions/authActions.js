'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export async function loginAction(prevState, formData) {
  const email = formData.get('email');
  const password = formData.get('password');

  const validatedFields = loginSchema.safeParse({ email, password });

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        error: data.message || 'Invalid credentials',
      };
    }

    // 1. Extract tokens from JSON response
    const { token, refreshToken } = data;

    if (token && refreshToken) {
      const cookieStore = await cookies();
      
      // Set Access Token
      cookieStore.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60, // 15 minutes
        path: '/',
      });

      // Set Refresh Token
      cookieStore.set('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
      });
    }

    return { success: true };

  } catch (error) {
    return {
      error: 'An error occurred. Please try again.',
    };
  }
}


export async function registerAction(prevState, formData) {
  const username = formData.get('username');
  const email = formData.get('email');
  const password = formData.get('password');
  const confirmPassword = formData.get('confirmPassword');

  const validatedFields = registerSchema.safeParse({ 
    username, 
    email, 
    password, 
    confirmPassword 
  });

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        error: data.message || 'Registration failed',
      };
    }

    // 1. Extract tokens from JSON response
    const { token, refreshToken } = data;

    if (token && refreshToken) {
      const cookieStore = await cookies();
      
      cookieStore.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60,
        path: '/',
      });

      cookieStore.set('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      });
    }
    return { success: true };

  } catch (error) {
    return {
      error: 'An error occurred. Please try again.',
    };
  }
}


export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.set('token', '', { maxAge: 0, path: '/' });
  cookieStore.set('refreshToken', '', { maxAge: 0, path: '/' });
  return { success: true };
}

export async function getMeAction() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) return { error: 'Not authenticated' };

    const response = await fetch(`${API_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!response.ok) return { error: data.message || 'Failed to fetch profile' };

    return { user: data.user };
  } catch (error) {
    console.error('[Server Action] Exception in getMeAction:', error);
    return { error: 'Network error occurred while fetching user profile' };
  }
}

/**
 * Attempts to refresh the access token using the refresh token stored in cookies.
 */
export async function refreshTokenAction() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refreshToken')?.value;

    if (!refreshToken) return { success: false, error: 'No refresh token' };

    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Cookie': `refreshToken=${refreshToken}`
      }
    });

    const data = await response.json();

    if (response.ok && data.token) {
      cookieStore.set('token', data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60,
        path: '/',
      });
      return { success: true, token: data.token };
    }

    return { success: false, error: data.message || 'Refresh failed' };
  } catch (error) {
    console.error('[Server Action] Refresh Token Error:', error);
    return { success: false, error: 'Network error during refresh' };
  }
}


export async function updateProfileAction(prevState, formData) {
  try {
    const cookieStore = await cookies();
    let token = cookieStore.get('token')?.value;

    const performUpdate = (authToken) => {
      return fetch(`${API_URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': authToken ? `Bearer ${authToken}` : '',
        },
        body: formData, // Sending FormData directly to support file uploads
      });
    };

    if (!token) {
        const refreshResult = await refreshTokenAction();
        if (refreshResult.success) {
            token = refreshResult.token;
        } else {
            return { error: 'Not authenticated' };
        }
    }

    let response = await performUpdate(token);

    if (response.status === 401) {
        const refreshResult = await refreshTokenAction();
        if (refreshResult.success) {
            response = await performUpdate(refreshResult.token);
        }
    }

    const data = await response.json();
    if (!response.ok) return { error: data.message || 'Failed to update profile' };

    return { success: true, user: data };
  } catch (error) {
    console.error('[Server Action] Exception in updateProfileAction:', error);
    return { error: 'Network error occurred while updating profile' };
  }
}
