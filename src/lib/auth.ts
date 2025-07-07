import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';

export const user = writable(null);
export const isLoggedIn = writable(false);
export const authLoading = writable(true);

export function initAuth() {
  if (!browser) return;
  
  const token = localStorage.getItem('token');
  const refreshToken = localStorage.getItem('refreshToken');
  
  if (token && refreshToken) {
    // Token exists, but we'll validate it on the first API call
    isLoggedIn.set(true);
  }
  authLoading.set(false);
}

export function setAuth(userData: any, accessToken: string, refreshToken?: string) {
  localStorage.setItem('token', accessToken);
  
  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
  }
  
  user.set(userData);
  isLoggedIn.set(true);
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  user.set(null);
  isLoggedIn.set(false);
  
  // Redirect to login page
  if (browser) {
    goto('/login');
  }
}