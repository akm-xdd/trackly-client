import { browser } from '$app/environment';

const API_BASE = browser ? 
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api' :
  'http://localhost:8000/api';
  
export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = browser ? localStorage.getItem('token') : null;
  
  console.log('Making API call to:', `${API_BASE}${endpoint}`);
  console.log('Request options:', options);
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  });
  
  console.log('Response status:', response.status);
  console.log('Response headers:', Object.fromEntries(response.headers.entries()));
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('API Error Response:', errorText);
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }
  
  return response.json();
}

export async function login(email: string, password: string) {
  return apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}

export async function getIssues() {
  return apiCall('/issues');
}

export async function createIssue(issueData: any) {
  return apiCall('/issues', {
    method: 'POST',
    body: JSON.stringify(issueData)
  });
}

export async function updateIssue(issueId: string, updateData: any) {
  return apiCall(`/issues/${issueId}`, {
    method: 'PUT',
    body: JSON.stringify(updateData)
  });
}

export async function deleteIssue(issueId: string) {
  return apiCall(`/issues/${issueId}`, {
    method: 'DELETE'
  });
}

export async function getIssueById(issueId: string) {
  return apiCall(`/issues/${issueId}`);
}

export async function getUsers() {
  return apiCall('/users');
}

export async function createUser(userData: any) {
  return apiCall('/users', {
    method: 'POST',
    body: JSON.stringify(userData)
  });
}

export async function updateUser(userId: string, userData: any) {
  return apiCall(`/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(userData)
  });
}

export async function deleteUser(userId: string) {
  return apiCall(`/users/${userId}`, {
    method: 'DELETE'
  });
}