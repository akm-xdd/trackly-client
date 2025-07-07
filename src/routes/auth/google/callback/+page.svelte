<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';

  onMount(async () => {
    const code = $page.url.searchParams.get('code');
    const error = $page.url.searchParams.get('error');
    
    if (error) {
      window.opener?.postMessage({
        type: 'GOOGLE_AUTH_ERROR',
        error: error
      }, window.location.origin);
      window.close();
      return;
    }
    
    if (code) {
      try {
        // Call your FastAPI backend directly
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/google/exchange`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to exchange code: ${errorText}`);
        }
        
        const userData = await response.json();
        
        // Send success to parent window
        window.opener?.postMessage({
          type: 'GOOGLE_AUTH_SUCCESS',
          user: userData
        }, window.location.origin);
        
        window.close();
      } catch (error) {
        console.error('OAuth callback error:', error);
        window.opener?.postMessage({
          type: 'GOOGLE_AUTH_ERROR',
          error: 'Failed to complete authentication'
        }, window.location.origin);
        window.close();
      }
    }
  });
</script>

<div class="flex items-center justify-center min-h-screen">
  <div class="text-center">
    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
    <p class="mt-2 text-gray-600">Completing sign in...</p>
  </div>
</div>