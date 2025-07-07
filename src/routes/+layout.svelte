<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { user, isLoggedIn, authLoading, initAuth, logout } from '$lib/auth';
  import { apiCall } from '$lib/api';
  import { sseClient } from '$lib/sse';
  import { Toaster } from 'svelte-sonner';
  import '../app.css';

  $: currentPath = $page.url.pathname;
  $: isPublicRoute = currentPath === '/login' || currentPath === '/signup';

onMount(async () => {
  
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const userInfo = await apiCall('/auth/me');
      user.set(userInfo);
      isLoggedIn.set(true);
      
      console.log('User role:', userInfo.role);
      
      // Connect SSE for all authenticated users (not just ADMIN)
      console.log('Connecting SSE for user role:', userInfo.role);
      sseClient.connect();
    } catch (err) {
      logout();
    }
  } else {
    isLoggedIn.set(false);
    user.set(null);
  }
  authLoading.set(false);
});

  onDestroy(() => {
    sseClient.disconnect();
  });

  function handleLogout() {
    sseClient.disconnect();
    logout();
  }

  $: {
    if (!$authLoading) {
      if (!$isLoggedIn && !isPublicRoute) {
        goto('/login');
      } else if ($isLoggedIn && isPublicRoute) {
        goto('/');
      }
    }
  }

  function isActive(path: string) {
    return currentPath === path;
  }
</script>

{#if $authLoading}
  <div class="min-h-screen flex items-center justify-center">
    <div class="text-gray-500">Loading...</div>
  </div>
{:else}
  <div class="min-h-screen bg-gray-50">
    <nav class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4">
        <div class="flex justify-between h-16">
          <div class="flex items-center">
            <a href="/" class="text-xl font-bold">Trackly</a>
          </div>
          
          {#if $isLoggedIn}
            <div class="flex items-center space-x-4">
              <a 
                href="/" 
                class="px-3 py-2 rounded-md text-sm font-medium {isActive('/') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-700 hover:text-gray-900'}"
              >
                Dashboard
              </a>
              <a 
                href="/issues" 
                class="px-3 py-2 rounded-md text-sm font-medium {isActive('/issues') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-700 hover:text-gray-900'}"
              >
                Issues
              </a>
              {#if $user?.role === 'ADMIN'}
                <a 
                  href="/users" 
                  class="px-3 py-2 rounded-md text-sm font-medium {isActive('/users') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-700 hover:text-gray-900'}"
                >
                  Users
                </a>
              {/if}
              <span class="text-sm text-gray-500">Hello, {$user?.full_name || 'User'}</span>
              <button on:click={handleLogout} class="text-red-600 hover:text-red-800">Logout</button>
            </div>
          {/if}
        </div>
      </div>
    </nav>

    <main class="max-w-7xl mx-auto py-6 px-4">
      <slot />
    </main>
  </div>

  <!-- Svelte Sonner Toaster -->
  <Toaster 
    position="top-right"
    richColors={true}
    closeButton={true}
    theme="light"
    duration={4000}
  />
{/if}