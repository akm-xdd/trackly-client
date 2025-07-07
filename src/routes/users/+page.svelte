<script lang="ts">
  import { onMount } from 'svelte';
  import { user, isLoggedIn } from '$lib/auth';
  import { apiCall } from '$lib/api';
  import { goto } from '$app/navigation';

  let users: any[] = [];
  let loading = true;
  let error = '';
  let showCreateModal = false;
  let editingUser: any = null;

  // Create form
  let createForm = {
    email: '',
    password: '',
    full_name: '',
    role: 'REPORTER'
  };

  // Edit form
  let editForm = {
    full_name: '',
    role: 'REPORTER'
  };

  onMount(async () => {
    if (!$isLoggedIn || $user?.role !== 'ADMIN') {
      goto('/');
      return;
    }
    
    await loadUsers();
  });

  async function loadUsers() {
    try {
      loading = true;
      users = await apiCall('/users');
    } catch (err) {
      error = 'Failed to load users';
      console.error(err);
    } finally {
      loading = false;
    }
  }

  async function createUser() {
    if (!createForm.email || !createForm.password || !createForm.full_name) {
      error = 'All fields are required';
      return;
    }

    try {
      await apiCall('/users', {
        method: 'POST',
        body: JSON.stringify(createForm)
      });

      // Reset form and close modal
      createForm = { email: '', password: '', full_name: '', role: 'REPORTER' };
      showCreateModal = false;
      error = '';
      
      // Reload users
      await loadUsers();
    } catch (err) {
      error = 'Failed to create user';
      console.error(err);
    }
  }

  async function updateUser() {
    if (!editForm.full_name) {
      error = 'Full name is required';
      return;
    }

    try {
      await apiCall(`/users/${editingUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm)
      });

      // Close edit mode and reload
      editingUser = null;
      error = '';
      await loadUsers();
    } catch (err) {
      error = 'Failed to update user';
      console.error(err);
    }
  }

  async function deleteUser(userId: string, userName: string) {
    if (!confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await apiCall(`/users/${userId}`, { method: 'DELETE' });
      await loadUsers();
    } catch (err) {
      error = 'Failed to delete user';
      console.error(err);
    }
  }

  function startEdit(userToEdit: any) {
    editingUser = userToEdit;
    editForm = {
      full_name: userToEdit.full_name,
      role: userToEdit.role
    };
    error = '';
  }

  function cancelEdit() {
    editingUser = null;
    error = '';
  }

  function openCreateModal() {
    showCreateModal = true;
    createForm = { email: '', password: '', full_name: '', role: 'REPORTER' };
    error = '';
  }

  function closeCreateModal() {
    showCreateModal = false;
    error = '';
  }

  function getRoleBadgeColor(role: string) {
    switch (role) {
      case 'ADMIN': return 'bg-red-100 text-red-800';
      case 'MAINTAINER': return 'bg-blue-100 text-blue-800';
      case 'REPORTER': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString();
  }
</script>

{#if $user?.role === 'ADMIN'}
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">User Management</h1>
        <p class="text-gray-600 mt-1">Manage system users and their roles</p>
      </div>
      <button 
        on:click={openCreateModal}
        class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium"
      >
        Create User
      </button>
    </div>

    {#if error}
      <div class="bg-red-50 border border-red-200 rounded-md p-4">
        <div class="text-red-800">{error}</div>
      </div>
    {/if}

    {#if loading}
      <div class="flex justify-center py-8">
        <div class="text-gray-500">Loading users...</div>
      </div>
    {:else}
      <div class="bg-white shadow overflow-hidden sm:rounded-md">
        <ul class="divide-y divide-gray-200">
          {#each users as userItem}
            <li class="px-6 py-4">
              {#if editingUser?.id === userItem.id}
                <!-- Edit Mode -->
                <div class="space-y-4">
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      <input
                        bind:value={editForm.full_name}
                        type="text"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
                      <select
                        bind:value={editForm.role}
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="REPORTER">Reporter</option>
                        <option value="MAINTAINER">Maintainer</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>
                  </div>
                  <div class="flex space-x-3">
                    <button
                      on:click={updateUser}
                      class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm"
                    >
                      Save
                    </button>
                    <button
                      on:click={cancelEdit}
                      class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              {:else}
                <!-- View Mode -->
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <div class="flex items-center space-x-4">
                      <div>
                        <h3 class="text-lg font-medium text-gray-900">{userItem.full_name}</h3>
                        <p class="text-sm text-gray-500">{userItem.email}</p>
                      </div>
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getRoleBadgeColor(userItem.role)}">
                        {userItem.role}
                      </span>
                    </div>
                    <div class="mt-2 text-sm text-gray-500">
                      <span>Joined {formatDate(userItem.created_at)}</span>
                      <span class="mx-2">•</span>
                      <span>ID: {userItem.id}</span>
                    </div>
                  </div>
                  
                  <div class="flex space-x-2">
                    <button
                      on:click={() => startEdit(userItem)}
                      class="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                    >
                      Edit
                    </button>
                    {#if userItem.id !== $user?.id}
                      <button
                        on:click={() => deleteUser(userItem.id, userItem.full_name)}
                        class="text-red-600 hover:text-red-900 text-sm font-medium"
                      >
                        Delete
                      </button>
                    {:else}
                      <span class="text-gray-400 text-sm">Current User</span>
                    {/if}
                  </div>
                </div>
              {/if}
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>

  <!-- Create User Modal -->
  {#if showCreateModal}
    <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Create New User</h3>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                bind:value={createForm.email}
                type="email"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="user@example.com"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                bind:value={createForm.password}
                type="password"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="••••••••"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                bind:value={createForm.full_name}
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="John Doe"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                bind:value={createForm.role}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="REPORTER">Reporter</option>
                <option value="MAINTAINER">Maintainer</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>
          
          <div class="flex justify-end space-x-3 mt-6">
            <button
              on:click={closeCreateModal}
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              on:click={createUser}
              class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
            >
              Create User
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
{:else}
  <div class="text-center py-12">
    <h1 class="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
    <p class="text-gray-600">Only administrators can access user management.</p>
  </div>
{/if}