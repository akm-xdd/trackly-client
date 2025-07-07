<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { user, isLoggedIn } from '$lib/auth';
	import { apiCall } from '$lib/api';
	import { sseClient } from '$lib/sse';
	import { toast } from 'svelte-sonner';
	let issues: any[] = [];
	let loading = true;
	let error = '';
	let totalIssues = 0;
	let currentPage = 1;
	let pageSize = 10;

	$: totalPages = Math.ceil(totalIssues / pageSize);
	$: hasNextPage = currentPage < totalPages;
	$: hasPrevPage = currentPage > 1;

	onMount(async () => {
		if (!$isLoggedIn) {
			goto('/login');
			return;
		}

		const urlPage = parseInt($page.url.searchParams.get('page') || '1');
		currentPage = urlPage > 0 ? urlPage : 1;

		await loadIssues();

		console.log('👤 Current user role:', $user?.role); // DEBUG LOG

		console.log('✅ Adding SSE handler for {}', $user?.role); // DEBUG LOG
		sseClient.addHandler(handleSSEEvent);
	});

	async function loadIssues() {
		try {
			loading = true;
			const skip = (currentPage - 1) * pageSize;

			// Get issues with pagination
			const issuesData = await apiCall(`/issues?skip=${skip}&limit=${pageSize}`);
			issues = issuesData;

			// Get total count for pagination
			const countData = await apiCall('/issues/stats/count');
			totalIssues = countData.total_issues;
		} catch (err) {
			error = 'Failed to load issues';
			console.error(err);
		} finally {
			loading = false;
		}
	}

	async function goToPage(page: number) {
		if (page < 1 || page > totalPages) return;

		currentPage = page;

		// Update URL without navigation
		const url = new URL(window.location.href);
		url.searchParams.set('page', page.toString());
		window.history.replaceState({}, '', url);

		await loadIssues();
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'OPEN':
				return 'bg-red-100 text-red-800';
			case 'TRIAGED':
				return 'bg-yellow-100 text-yellow-800';
			case 'IN_PROGRESS':
				return 'bg-blue-100 text-blue-800';
			case 'DONE':
				return 'bg-green-100 text-green-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	}

	function getSeverityColor(severity: string) {
		switch (severity) {
			case 'LOW':
				return 'bg-gray-100 text-gray-800';
			case 'MEDIUM':
				return 'bg-yellow-100 text-yellow-800';
			case 'HIGH':
				return 'bg-orange-100 text-orange-800';
			case 'CRITICAL':
				return 'bg-red-100 text-red-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString();
	}

	function getPageNumbers() {
		const pages = [];
		const maxVisible = 5;

		if (totalPages <= maxVisible) {
			for (let i = 1; i <= totalPages; i++) {
				pages.push(i);
			}
		} else {
			// Always show first page
			pages.push(1);

			if (currentPage > 3) {
				pages.push('...');
			}

			// Show pages around current page
			const start = Math.max(2, currentPage - 1);
			const end = Math.min(totalPages - 1, currentPage + 1);

			for (let i = start; i <= end; i++) {
				if (!pages.includes(i)) {
					pages.push(i);
				}
			}

			if (currentPage < totalPages - 2) {
				pages.push('...');
			}

			// Always show last page
			if (!pages.includes(totalPages)) {
				pages.push(totalPages);
			}
		}

		return pages;
	}

	let lastEventId = '';

	function handleSSEEvent(event: any) {
		console.log('🎯 SSE Event Handler Called:', event); // DEBUG LOG

		const eventKey = `${event.type}-${event.issue_id}-${event.timestamp}`;

		if (eventKey === lastEventId) return;
		lastEventId = eventKey;

		if (event.type === 'connected' || event.type === 'heartbeat') {
			console.log('⏭️ Skipping system event'); // DEBUG LOG
			return;
		}

		console.log('🔥 Processing issue event:', event.type); // DEBUG LOG

		const eventMessages = {
			issue_created: `${event.user_name || 'Someone'} created a new issue`,
			issue_updated: `${event.user_name || 'Someone'} updated an issue`,
			issue_deleted: `${event.user_name || 'Someone'} deleted an issue`
		};

		if (eventMessages[event.type]) {
			console.log('📢 Showing notification:', eventMessages[event.type]); // DEBUG LOG
			toast.success(eventMessages[event.type]);
		}

		console.log('🔄 Refreshing issues list'); // DEBUG LOG
		loadIssues();
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">Issues</h1>
			{#if !loading && totalIssues > 0}
				<p class="mt-1 text-sm text-gray-500">
					Showing {(currentPage - 1) * pageSize + 1} to {Math.min(
						currentPage * pageSize,
						totalIssues
					)} of {totalIssues} issues
				</p>
			{/if}
		</div>
		<a
			href="/issues/create"
			class="rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
		>
			Create Issue
		</a>
	</div>

	{#if loading}
		<div class="flex justify-center py-8">
			<div class="text-gray-500">Loading issues...</div>
		</div>
	{:else if error}
		<div class="rounded-md border border-red-200 bg-red-50 p-4">
			<div class="text-red-800">{error}</div>
		</div>
	{:else if issues.length === 0}
		<div class="py-8 text-center">
			<div class="mb-4 text-gray-500">No issues found</div>
			<a
				href="/issues/create"
				class="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
			>
				Create your first issue
			</a>
		</div>
	{:else}
		<div class="overflow-hidden bg-white shadow sm:rounded-md">
			<ul class="divide-y divide-gray-200">
				{#each issues as issue}
					<li>
						<a href="/issues/{issue.id}" class="block px-4 py-4 hover:bg-gray-50 sm:px-6">
							<div class="flex items-center justify-between">
								<div class="min-w-0 flex-1">
									<div class="flex items-center space-x-3">
										<h3 class="truncate text-lg font-medium text-gray-900">
											{issue.title}
										</h3>
										<span
											class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {getStatusColor(
												issue.status
											)}"
										>
											{issue.status.replace('_', ' ')}
										</span>
										<span
											class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {getSeverityColor(
												issue.severity
											)}"
										>
											{issue.severity}
										</span>
									</div>

									<div class="mt-2 flex items-center space-x-4 text-sm text-gray-500">
										<span>Created {formatDate(issue.created_at)}</span>
										<span>by {issue.created_by_name || issue.created_by}</span>
										{#if issue.updated_by_name}
											<span>• Updated by {issue.updated_by_name}</span>
										{/if}
										{#if issue.file_url}
											<span class="flex items-center">
												<svg
													class="mr-1 h-4 w-4"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
													/>
												</svg>
												Attachment
											</span>
										{/if}
									</div>
								</div>

								<div class="flex-shrink-0">
									<svg
										class="h-5 w-5 text-gray-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M9 5l7 7-7 7"
										/>
									</svg>
								</div>
							</div>
						</a>
					</li>
				{/each}
			</ul>
		</div>

		<!-- Pagination -->
		{#if totalPages > 1}
			<div
				class="flex items-center justify-between rounded-lg border-t border-gray-200 bg-white px-4 py-3 shadow sm:px-6"
			>
				<div class="flex flex-1 justify-between sm:hidden">
					<!-- Mobile pagination -->
					<button
						on:click={() => goToPage(currentPage - 1)}
						disabled={!hasPrevPage}
						class="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
					>
						Previous
					</button>
					<button
						on:click={() => goToPage(currentPage + 1)}
						disabled={!hasNextPage}
						class="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
					>
						Next
					</button>
				</div>

				<div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
					<div>
						<p class="text-sm text-gray-700">
							Showing page <span class="font-medium">{currentPage}</span> of
							<span class="font-medium">{totalPages}</span>
						</p>
					</div>
					<div>
						<nav
							class="relative z-0 inline-flex -space-x-px rounded-md shadow-sm"
							aria-label="Pagination"
						>
							<!-- Previous button -->
							<button
								on:click={() => goToPage(currentPage - 1)}
								disabled={!hasPrevPage}
								class="relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
							>
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M15 19l-7-7 7-7"
									/>
								</svg>
							</button>

							<!-- Page numbers -->
							{#each getPageNumbers() as pageNum}
								{#if pageNum === '...'}
									<span
										class="relative inline-flex items-center border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700"
									>
										...
									</span>
								{:else}
									<button
										on:click={() => goToPage(pageNum)}
										class="relative inline-flex items-center border px-4 py-2 text-sm font-medium {currentPage ===
										pageNum
											? 'z-10 border-indigo-500 bg-indigo-50 text-indigo-600'
											: 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'}"
									>
										{pageNum}
									</button>
								{/if}
							{/each}

							<!-- Next button -->
							<button
								on:click={() => goToPage(currentPage + 1)}
								disabled={!hasNextPage}
								class="relative inline-flex items-center rounded-r-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
							>
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 5l7 7-7 7"
									/>
								</svg>
							</button>
						</nav>
					</div>
				</div>
			</div>
		{/if}
	{/if}
</div>
