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

    // Extract JWT from backend Set-Cookie header if present
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      // The backend sets a 'jwt' cookie. We'll set it here too.
      // Basic parsing of the JWT from the Set-Cookie header
      const jwtMatch = setCookieHeader.match(/jwt=([^;]+)/);
      if (jwtMatch) {
        const cookieStore = await cookies();
        cookieStore.set('jwt', jwtMatch[1], {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 30 * 24 * 60 * 60, // 30 days
          path: '/',
        });
      }
    }

    // fallback: if backend didn't set cookie but we have success
    // (though our backend definitely sets it)
  } catch (error) {
    return {
      error: 'An error occurred. Please try again.',
    };
  }

  redirect('/');
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

    // Extract JWT from backend Set-Cookie header
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      const jwtMatch = setCookieHeader.match(/jwt=([^;]+)/);
      if (jwtMatch) {
         const cookieStore = await cookies();
         cookieStore.set('jwt', jwtMatch[1], {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 30 * 24 * 60 * 60,
          path: '/',
        });
      }
    }
  } catch (error) {
    return {
      error: 'An error occurred. Please try again.',
    };
  }

  redirect('/');
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('jwt');
  redirect('/login');
}
