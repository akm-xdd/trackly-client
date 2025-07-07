<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { user, isLoggedIn } from '$lib/auth';
  import { apiCall } from '$lib/api';

  let issue: any = null;
  let loading = true;
  let error = '';
  let editing = false;
  let saving = false;

  let editTitle = '';
  let editDescription = '';
  let editSeverity = '';
  let editStatus = '';

  $: issueId = $page.params.id;
  $: canEdit = $user && (
    $user.role === 'ADMIN' || 
    $user.role === 'MAINTAINER' 
  );
  $: canChangeStatus = $user && ($user.role === 'ADMIN' || $user.role === 'MAINTAINER');

  onMount(async () => {
    if (!$isLoggedIn) {
      goto('/login');
      return;
    }
    await loadIssue();
  });

  async function loadIssue() {
    try {
      loading = true;
      issue = await apiCall(`/issues/${issueId}`);
    } catch (err: any) {
      if (err.message.includes('403')) {
        error = 'You do not have permission to view this issue';
      } else if (err.message.includes('404')) {
        error = 'Issue not found';
      } else {
        error = 'Failed to load issue';
      }
      console.error(err);
    } finally {
      loading = false;
    }
  }

  function startEdit() {
    editTitle = issue.title;
    editDescription = issue.description;
    editSeverity = issue.severity;
    editStatus = issue.status;
    editing = true;
  }

  function cancelEdit() {
    editing = false;
    error = '';
  }

async function saveChanges() {
  if (!editTitle.trim() || !editDescription.trim()) {
    error = 'Title and description are required';
    return;
  }

  saving = true;
  error = '';

  try {
    const updateData: any = {};

    // Only include fields that actually changed
    if (editTitle.trim() !== issue.title) {
      updateData.title = editTitle.trim();
    }
    
    if (editDescription.trim() !== issue.description) {
      updateData.description = editDescription.trim();
    }

    // Only MAINTAINER+ can change severity/status
    if (canChangeStatus) {
      if (editSeverity !== issue.severity) {
        updateData.severity = editSeverity;
      }
      if (editStatus !== issue.status) {
        updateData.status = editStatus;
      }
    }
    // REPORTER: Don't send severity/status at all

    console.log('📝 Sending update data:', updateData); // Debug log

    const updatedIssue = await apiCall(`/issues/${issueId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });

    issue = updatedIssue;
    editing = false;
  } catch (err) {
    error = 'Failed to update issue';
    console.error(err);
  }

  saving = false;
}

  async function deleteIssue() {
    if (!confirm('Are you sure you want to delete this issue? This action cannot be undone.')) {
      return;
    }

    try {
      await apiCall(`/issues/${issueId}`, { method: 'DELETE' });
      goto('/issues');
    } catch (err) {
      error = 'Failed to delete issue';
      console.error(err);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'OPEN': return 'bg-red-100 text-red-800';
      case 'TRIAGED': return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'DONE': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function getSeverityColor(severity: string) {
    switch (severity) {
      case 'LOW': return 'bg-gray-100 text-gray-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString();
  }

  function canDelete(): boolean {
    if (!$user || !issue) return false;
    return $user.role === 'ADMIN' || 
           ($user.role === 'REPORTER' && issue.created_by === $user.id);
  }

  // Simple markdown-to-HTML converter for basic formatting
  function simpleMarkdown(text: string) {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // **bold**
      .replace(/\*(.*?)\*/g, '<em>$1</em>')              // *italic*
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded">$1</code>')  // `code`
      .replace(/### (.*?)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')  // ### heading
      .replace(/## (.*?)$/gm, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>')   // ## heading
      .replace(/# (.*?)$/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')       // # heading
      .replace(/\n\n/g, '</p><p class="mb-4">')         // paragraphs
      .replace(/\n/g, '<br>');                           // line breaks
  }
</script>

{#if loading}
  <div class="flex justify-center py-8">
    <div class="text-gray-500">Loading issue...</div>
  </div>
{:else if error && !issue}
  <div class="bg-red-50 border border-red-200 rounded-md p-4">
    <div class="text-red-800">{error}</div>
    <div class="mt-4">
      <a href="/issues" class="text-indigo-600 hover:text-indigo-800">← Back to Issues</a>
    </div>
  </div>
{:else if issue}
  <div class="max-w-4xl mx-auto">
    <div class="mb-6">
      <a href="/issues" class="text-indigo-600 hover:text-indigo-800 text-sm">← Back to Issues</a>
    </div>

    {#if error}
      <div class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
        <div class="text-red-800 text-sm">{error}</div>
      </div>
    {/if}

    <div class="bg-white shadow rounded-lg p-6">
      {#if editing}
        <!-- Edit Mode -->
        <div class="space-y-6">
          <div>
            <label for="edit-title" class="block text-sm font-medium text-gray-700 mb-2">Title</label>
            <input
              id="edit-title"
              bind:value={editTitle}
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label for="edit-description" class="block text-sm font-medium text-gray-700 mb-2">
              Description (Markdown supported)
            </label>
            <textarea
              id="edit-description"
              bind:value={editDescription}
              rows="10"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
            ></textarea>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="edit-severity" class="block text-sm font-medium text-gray-700 mb-2">Severity</label>
              <select
                id="edit-severity"
                bind:value={editSeverity}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            {#if canChangeStatus}
              <div>
                <label for="edit-status" class="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  id="edit-status"
                  bind:value={editStatus}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="OPEN">Open</option>
                  <option value="TRIAGED">Triaged</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="DONE">Done</option>
                </select>
              </div>
            {/if}
          </div>

          <div class="flex justify-between pt-4">
            <button
              type="button"
              on:click={cancelEdit}
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              on:click={saveChanges}
              disabled={saving}
              class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      {:else}
        <!-- View Mode -->
        <div class="space-y-6">
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <h1 class="text-3xl font-bold text-gray-900 mb-4">{issue.title}</h1>
              <div class="flex items-center space-x-3 mb-4">
                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium {getStatusColor(issue.status)}">
                  {issue.status}
                </span>
                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium {getSeverityColor(issue.severity)}">
                  {issue.severity}
                </span>
              </div>
            </div>
            
            {#if canEdit}
              <div class="flex space-x-2">
                <button
                  on:click={startEdit}
                  class="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100"
                >
                  Edit
                </button>
                {#if canDelete()}
                  <button
                    on:click={deleteIssue}
                    class="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100"
                  >
                    Delete
                  </button>
                {/if}
              </div>
            {/if}
          </div>

          <div class="prose max-w-none">
            <p class="mb-4">{@html simpleMarkdown(issue.description)}</p>
          </div>

          {#if issue.file_url}
            <div class="border-t pt-6">
              <h3 class="text-lg font-medium text-gray-900 mb-4">Attachment</h3>
              <div class="flex items-center space-x-3">
                <svg class="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <a 
                  href={issue.file_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  class="text-indigo-600 hover:text-indigo-800"
                >
                  View Attachment
                </a>
              </div>
            </div>
          {/if}

          <div class="border-t pt-6">
            <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt class="font-medium text-gray-900">Created</dt>
                <dd class="text-gray-500">{formatDate(issue.created_at)} by {issue.created_by_name || issue.created_by}</dd>
              </div>
              {#if issue.updated_at !== issue.created_at}
                <div>
                  <dt class="font-medium text-gray-900">Last Updated</dt>
                  <dd class="text-gray-500">{formatDate(issue.updated_at)} 
                    {#if issue.updated_by_name}by {issue.updated_by_name}{/if}
                  </dd>
                </div>
              {/if}
            </dl>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}