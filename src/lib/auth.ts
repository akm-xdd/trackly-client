import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export const user = writable(null);
export const isLoggedIn = writable(false);
export const authLoading = writable(true);

export function initAuth() {
  if (!browser) return;
  
  const token = localStorage.getItem('token');
  if (token) {
    // TODO: Verify token with backend
    // For now, assume valid if exists
    isLoggedIn.set(true);
    // Optionally decode JWT to get user info
  }
  authLoading.set(false);
}

export function setAuth(userData: any, token: string) {
  localStorage.setItem('token', token);
  user.set(userData);
  isLoggedIn.set(true);
}

export function logout() {
  localStorage.removeItem('token');
  user.set(null);
  isLoggedIn.set(false);
}