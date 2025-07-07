import { browser } from '$app/environment';
import { toast } from 'svelte-sonner';
import { logout } from './auth';

const API_BASE = browser ? 
  import.meta.env.PUBLIC_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api' :
  'http://localhost:8000/api';


  async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      return null;
    }

    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken })
    });

    if (!response.ok) {
      // Refresh token is also expired
      return null;
    }

    const data = await response.json();
    localStorage.setItem('token', data.access_token);
    return data.access_token;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return null;
  }
}

export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const makeRequest = async (token: string | null) => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    });
    return response;
  };

  let token = browser ? localStorage.getItem('token') : null;
  let response = await makeRequest(token);

  // If we get 401, try to refresh the token
  if (response.status === 401 && browser) {
    console.log('Token expired, attempting refresh...');
    
    const newToken = await refreshAccessToken();
    
    if (newToken) {
      console.log('Token refreshed successfully');
      // Optionally show a subtle notification
      toast.success('Session refreshed automatically', { duration: 2000 });
      
      // Retry the original request with new token
      response = await makeRequest(newToken);
    } else {
      console.log('Token refresh failed, logging out');
      
      // Show session expired notification
      toast.error('Session expired. Please login again.', {
        duration: 5000,
        position: 'top-center'
      });
      
      // Refresh failed, logout user
      logout();
      throw new Error('Session expired. Please login again.');
    }
  }

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


export async function uploadFile(file: File): Promise<{ file_url: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const makeUploadRequest = async (token: string | null) => {
    return fetch(`${API_BASE}/files/upload`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData
    });
  };

  let token = browser ? localStorage.getItem('token') : null;
  let response = await makeUploadRequest(token);

  // Handle 401 for file uploads too
  if (response.status === 401 && browser) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      toast.success('Session refreshed automatically', { duration: 2000 });
      response = await makeUploadRequest(newToken);
    } else {
      toast.error('Session expired. Please login again.', {
        duration: 5000,
        position: 'top-center'
      });
      logout();
      throw new Error('Session expired. Please login again.');
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`File upload failed: ${response.status} - ${errorText}`);
  }

  return response.json();
}