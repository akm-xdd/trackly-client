<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { isLoggedIn } from '$lib/auth';
  import { apiCall } from '$lib/api';

  let title = '';
  let description = '';
  let severity = 'MEDIUM';
  let file: File | null = null;
  let fileInput: HTMLInputElement;
  let loading = false;
  let error = '';

  onMount(() => {
    if (!$isLoggedIn) {
      goto('/login');
    }
  });

  async function handleSubmit() {
    if (!title.trim() || !description.trim()) {
      error = 'Title and description are required';
      return;
    }

    loading = true;
    error = '';

    try {
      let fileUrl = null;

      if (file) {
        const formData = new FormData();
        formData.append('file', file);

        const uploadResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'}/files/upload`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        });

        if (!uploadResponse.ok) {
          throw new Error('File upload failed');
        }

        const uploadResult = await uploadResponse.json();
        fileUrl = uploadResult.file_url;
      }

      const issueData = {
        title: title.trim(),
        description: description.trim(),
        severity,
        file_url: fileUrl
      };

      await apiCall('/issues', {
        method: 'POST',
        body: JSON.stringify(issueData)
      });

      goto('/issues');
    } catch (err) {
      error = 'Failed to create issue. Please try again.';
      console.error(err);
    }

    loading = false;
  }

  function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    file = target.files?.[0] || null;
  }

  function removeFile() {
    file = null;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
</script>

<div class="max-w-2xl mx-auto">
  <div class="mb-6">
    <h1 class="text-3xl font-bold text-gray-900">Create New Issue</h1>
    <p class="mt-2 text-gray-600">Report a bug, request a feature, or describe any issue.</p>
  </div>

  <div class="bg-white shadow rounded-lg p-6">
    <form on:submit|preventDefault={handleSubmit} class="space-y-6">
      <div>
        <label for="title" class="block text-sm font-medium text-gray-700 mb-2">
          Title *
        </label>
        <input
          id="title"
          bind:value={title}
          type="text"
          required
          maxlength="255"
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Brief description of the issue"
        />
      </div>

      <div>
        <label for="description" class="block text-sm font-medium text-gray-700 mb-2">
          Description *
        </label>
        <textarea
          id="description"
          bind:value={description}
          required
          rows="6"
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Provide detailed information about the issue..."
        ></textarea>
      </div>

      <div>
        <label for="severity" class="block text-sm font-medium text-gray-700 mb-2">
          Severity
        </label>
        <select
          id="severity"
          bind:value={severity}
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
      </div>

      <div>
        <label for="file" class="block text-sm font-medium text-gray-700 mb-2">
          Attachment (optional)
        </label>
        
        {#if !file}
          <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
            <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <div class="mt-4">
              <label for="file-upload" class="cursor-pointer">
                <span class="text-indigo-600 hover:text-indigo-500 font-medium">Upload a file</span>
                <span class="text-gray-500"> or drag and drop</span>
              </label>
              <input
                id="file-upload"
                bind:this={fileInput}
                type="file"
                class="sr-only"
                on:change={handleFileChange}
                accept="image/*,.pdf,.doc,.docx,.txt"
              />
            </div>
            <p class="text-xs text-gray-500 mt-2">
              PNG, JPG, PDF, DOC up to 50MB
            </p>
          </div>
        {:else}
          <div class="border border-gray-300 rounded-lg p-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <svg class="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <div>
                  <p class="text-sm font-medium text-gray-900">{file.name}</p>
                  <p class="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <button
                type="button"
                on:click={removeFile}
                class="text-red-600 hover:text-red-800"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        {/if}
      </div>

      {#if error}
        <div class="bg-red-50 border border-red-200 rounded-md p-4">
          <div class="text-red-800 text-sm">{error}</div>
        </div>
      {/if}

      <div class="flex justify-between pt-4">
        <a
          href="/issues"
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          Cancel
        </a>
        <button
          type="submit"
          disabled={loading}
          class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'Create Issue'}
        </button>
      </div>
    </form>
  </div>
</div>