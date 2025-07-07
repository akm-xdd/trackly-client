<script lang="ts">
  import { login } from '$lib/api';
  import { setAuth } from '$lib/auth';
  import { goto } from '$app/navigation';

  let email = '';
  let password = '';
  let error = '';
  let loading = false;

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
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50">
  <div class="max-w-md w-full space-y-8">
    <div>
      <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
        Sign in to Trackly
      </h2>
    </div>
    
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
        <div class="text-red-600 text-sm">{error}</div>
      {/if}

      <button
        type="submit"
        disabled={loading}
        class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  </div>
</div>