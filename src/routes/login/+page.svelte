<script lang="ts">
  import { login } from '$lib/api';
  import { setAuth } from '$lib/auth';
  import { goto } from '$app/navigation';
  import { apiCall } from '$lib/api';

  let email = '';
  let password = '';
  let error = '';
  let loading = false;
  let googleLoading = false;

  async function handleLogin() {
    loading = true;
    error = '';
    
    try {
      const response = await login(email, password);
      setAuth(response.user, response.tokens.access_token);
      goto('/');
    } catch (err) {
      error = 'Login failed. Please check your credentials.';
    }
    
    loading = false;
  }

  async function handleGoogleLogin() {
    googleLoading = true;
    error = '';

    try {
      // Create Google OAuth URL
      const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      const redirectUri = `${window.location.origin}/auth/google/callback`;
      const scope = 'openid email profile';
      
      const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${googleClientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(scope)}&` +
        `access_type=offline&` +
        `prompt=select_account`;

      // Open popup window
      const popup = window.open(
        googleAuthUrl,
        'google-login',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      // Listen for the popup to send us the user data
      const handleMessage = async (event) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
          try {
            console.log('Received user data:', event.data.user);
            
            const result = await apiCall('/auth/google', {
              method: 'POST',
              body: JSON.stringify({
                email: event.data.user.email,
                name: event.data.user.name
              })
            });

            setAuth(result.user, result.tokens.access_token);
            popup?.close();
            goto('/');
          } catch (err) {
            console.error('Backend auth error:', err);
            error = 'Login failed. Please contact admin if your account exists.';
            popup?.close();
          }
        } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
          error = 'Google authentication failed. Please try again.';
          popup?.close();
        }
        
        googleLoading = false;
        window.removeEventListener('message', handleMessage);
      };

      window.addEventListener('message', handleMessage);

      // Check if popup was closed manually
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          googleLoading = false;
          window.removeEventListener('message', handleMessage);
        }
      }, 1000);

    } catch (err) {
      error = 'Failed to open Google login window.';
      googleLoading = false;
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50">
  <div class="max-w-md w-full space-y-8">
    <div>
      <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
        Sign in to Trackly
      </h2>
    </div>
    
    <!-- Google Login Button -->
    <button
      on:click={handleGoogleLogin}
      disabled={googleLoading || loading}
      class="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 mb-4"
    >
      <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      {googleLoading ? 'Signing in with Google...' : 'Continue with Google'}
    </button>

    <div class="relative">
      <div class="absolute inset-0 flex items-center">
        <div class="w-full border-t border-gray-300" />
      </div>
      <div class="relative flex justify-center text-sm">
        <span class="px-2 bg-gray-50 text-gray-500">Or continue with email</span>
      </div>
    </div>
    
    <!-- Email/Password Form -->
    <form on:submit|preventDefault={handleLogin} class="mt-8 space-y-6">
      <div>
        <input
          bind:value={email}
          type="email"
          required
          class="relative block w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="Email address"
        />
      </div>
      
      <div>
        <input
          bind:value={password}
          type="password"
          required
          class="relative block w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="Password"
        />
      </div>

      {#if error}
        <div class="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md p-3">{error}</div>
      {/if}

      <button
        type="submit"
        disabled={loading || googleLoading}
        class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? 'Signing in...' : 'Sign in with Email'}
      </button>
    </form>
  </div>
</div>