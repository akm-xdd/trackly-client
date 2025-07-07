<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { user, isLoggedIn } from '$lib/auth';
  import { apiCall } from '$lib/api';
  import { sseClient } from '$lib/sse';
  import { toast } from 'svelte-sonner';
  import * as echarts from 'echarts';

  let issueStats: any = null;
  let dailyStats: any[] = [];
  let loading = true;

  // Chart containers
  let severityChartContainer: HTMLDivElement;
  let statusChartContainer: HTMLDivElement;
  let trendsChartContainer: HTMLDivElement;

  // Chart instances
  let severityChart: echarts.ECharts | null = null;
  let statusChart: echarts.ECharts | null = null;
  let trendsChart: echarts.ECharts | null = null;

  onMount(async () => {
    if ($isLoggedIn) {
      await loadDashboardData();
      
      // Add SSE handler for real-time dashboard updates
      sseClient.addHandler(handleSSEEvent);
    }
  });

  onDestroy(() => {
    // Clean up SSE handler
    sseClient.removeHandler(handleSSEEvent);
    
    // Clean up chart instances
    severityChart?.dispose();
    statusChart?.dispose();
    trendsChart?.dispose();
  });

async function loadDashboardData() {
  // Wait for user to be fully loaded
  if (!$user) {
    console.log('User not loaded yet, waiting...');
    return;
  }

  try {
    loading = true;
    
    // All users can access issue stats
    const [severityData, statusData] = await Promise.all([
      apiCall('/issues/stats/by-severity'),
      apiCall('/issues/stats/by-status')
    ]);

    issueStats = {
      severity: severityData.issues_by_severity,
      status: statusData.issues_by_status
    };
    
    // Only MAINTAINER+ can access daily stats
    if ($user.role === 'ADMIN' || $user.role === 'MAINTAINER') {
      try {
        const dailyData = await apiCall('/stats/daily?limit=30');
        dailyStats = dailyData;
      } catch (err) {
        console.log('No access to daily stats');
        dailyStats = [];
      }
    } else {
      console.log('REPORTER - skipping daily stats');
      dailyStats = [];
    }

    setTimeout(() => {
      createCharts();
    }, 100);

  } catch (err) {
    console.error('Failed to load dashboard data:', err);
    toast.error('Failed to load dashboard data');
  } finally {
    loading = false;
  }
}

onMount(async () => {
  if ($isLoggedIn && $user) {
    await loadDashboardData();
  }
});

// Also watch for user changes
$: if ($user && $isLoggedIn) {
  loadDashboardData();
}

  function handleSSEEvent(event: any) {
    console.log('📊 Dashboard SSE Event:', event);
    
    // Skip system events
    if (event.type === 'connected' || event.type === 'heartbeat') {
      return;
    }

    // Handle issue events that affect dashboard data
    if (event.type === 'issue_created' || event.type === 'issue_updated' || event.type === 'issue_deleted') {
      
      // Show notification for relevant events based on user role
      let shouldShowNotification = false;
      let notificationMessage = '';

      if ($user?.role === 'ADMIN' || $user?.role === 'MAINTAINER') {
        // ADMIN/MAINTAINER see all events
        shouldShowNotification = true;
        const eventMessages = {
          'issue_created': `📊 Dashboard updated - ${event.user_name || 'Someone'} created an issue`,
          'issue_updated': `📊 Dashboard updated - ${event.user_name || 'Someone'} updated an issue`,
          'issue_deleted': `📊 Dashboard updated - ${event.user_name || 'Someone'} deleted an issue`
        };
        notificationMessage = eventMessages[event.type] || 'Dashboard updated';
      } else if ($user?.role === 'REPORTER') {
        // REPORTER only sees their own issue events
        const issueData = event.data || {};
        const createdBy = issueData.created_by;
        
        if (createdBy === $user.id || event.user_id === $user.id) {
          shouldShowNotification = true;
          const eventMessages = {
            'issue_created': `📊 Your dashboard updated - issue created`,
            'issue_updated': `📊 Your dashboard updated - issue updated`,
            'issue_deleted': `📊 Your dashboard updated - issue deleted`
          };
          notificationMessage = eventMessages[event.type] || 'Your dashboard updated';
        }
      }

      if (shouldShowNotification) {
        toast.success(notificationMessage, {
          duration: 3000,
          description: 'Charts updated automatically'
        });
      }

      // Refresh dashboard data with a small delay to avoid rapid updates
      setTimeout(() => {
        refreshDashboardData();
      }, 500);
    }
  }

  async function refreshDashboardData() {
    console.log('🔄 Refreshing dashboard data...');
    
    try {
      // Reload issue stats
      const [severityData, statusData] = await Promise.all([
        apiCall('/issues/stats/by-severity'),
        apiCall('/issues/stats/by-status')
      ]);

      issueStats = {
        severity: severityData.issues_by_severity,
        status: statusData.issues_by_status
      };

      // Reload daily stats if user has access
      if ($user?.role === 'ADMIN' || $user?.role === 'MAINTAINER') {
        try {
          const dailyData = await apiCall('/stats/daily?limit=30');
          dailyStats = dailyData;
        } catch (err) {
          console.log('No access to daily stats during refresh');
        }
      }

      // Update charts with new data
      updateCharts();

    } catch (err) {
      console.error('Failed to refresh dashboard data:', err);
      toast.error('Failed to refresh dashboard data');
    }
  }

  function createCharts() {
    if (!issueStats) return;

    // Dispose existing charts before creating new ones
    severityChart?.dispose();
    statusChart?.dispose();
    trendsChart?.dispose();

    // Severity Chart - Doughnut
    const severityEntries = Object.entries(issueStats.severity).filter(([key, value]) => value > 0);
    
    if (severityEntries.length > 0 && severityChartContainer) {
      const severityData = severityEntries.map(([key, value]) => ({
        name: key,
        value: value
      }));

      severityChart = echarts.init(severityChartContainer);
      
      const severityOption = {
        title: {
          text: 'Issues by Severity',
          left: 'center',
          textStyle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#1f2937'
          }
        },
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c} ({d}%)'
        },
        legend: {
          bottom: '5%',
          left: 'center'
        },
        series: [
          {
            name: 'Issues',
            type: 'pie',
            radius: ['40%', '70%'],
            center: ['50%', '45%'],
            avoidLabelOverlap: false,
            itemStyle: {
              borderRadius: 8,
              borderColor: '#fff',
              borderWidth: 2
            },
            label: {
              show: false,
              position: 'center'
            },
            emphasis: {
              label: {
                show: true,
                fontSize: 20,
                fontWeight: 'bold'
              },
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            },
            labelLine: {
              show: false
            },
            data: severityData,
            color: [
              '#9CA3AF', // LOW - gray
              '#F59E0B', // MEDIUM - yellow
              '#EA580C', // HIGH - orange  
              '#DC2626'  // CRITICAL - red
            ],
            animationType: 'scale',
            animationEasing: 'elasticOut'
          }
        ]
      };

      severityChart.setOption(severityOption);
    }

    // Status Chart - Bar
    const statusEntries = Object.entries(issueStats.status).filter(([key, value]) => value > 0);
    
    if (statusEntries.length > 0 && statusChartContainer) {
      const statusLabels = statusEntries.map(([key]) => key.replace('_', ' '));
      const statusValues = statusEntries.map(([key, value]) => value);
      
      statusChart = echarts.init(statusChartContainer);

      const statusOption = {
        title: {
          text: 'Issues by Status',
          left: 'center',
          textStyle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#1f2937'
          }
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: [
          {
            type: 'category',
            data: statusLabels,
            axisTick: {
              alignWithLabel: true
            },
            axisLabel: {
              color: '#6B7280'
            }
          }
        ],
        yAxis: [
          {
            type: 'value',
            minInterval: 1,
            axisLabel: {
              color: '#6B7280'
            },
            splitLine: {
              lineStyle: {
                color: '#F3F4F6'
              }
            }
          }
        ],
        series: [
          {
            name: 'Issues',
            type: 'bar',
            barWidth: '60%',
            data: statusValues.map((value, index) => ({
              value: value,
              itemStyle: {
                color: [
                  '#EF4444', // OPEN - red
                  '#F59E0B', // TRIAGED - yellow
                  '#3B82F6', // IN_PROGRESS - blue
                  '#10B981'  // DONE - green
                ][index],
                borderRadius: [4, 4, 0, 0]
              }
            })),
            animationDelay: function (idx) {
              return idx * 100;
            }
          }
        ]
      };

      statusChart.setOption(statusOption);
    }

    // Trends Chart - Line
    if (dailyStats.length >= 2 && trendsChartContainer) {
      const sortedStats = [...dailyStats].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const trendLabels = sortedStats.map(stat => 
        new Date(stat.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      );
      const trendData = sortedStats.map(stat => stat.total_issues);
      
      trendsChart = echarts.init(trendsChartContainer);

      const trendsOption = {
        title: {
          text: 'Issue Trends Over Time',
          left: 'center',
          textStyle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#1f2937'
          }
        },
        tooltip: {
          trigger: 'axis'
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: trendLabels,
          axisLabel: {
            color: '#6B7280'
          }
        },
        yAxis: {
          type: 'value',
          minInterval: 1,
          axisLabel: {
            color: '#6B7280'
          },
          splitLine: {
            lineStyle: {
              color: '#F3F4F6'
            }
          }
        },
        series: [
          {
            name: 'Total Issues',
            type: 'line',
            stack: 'Total',
            smooth: true,
            lineStyle: {
              width: 3,
              color: '#6366F1'
            },
            showSymbol: false,
            areaStyle: {
              opacity: 0.1,
              color: '#6366F1'
            },
            emphasis: {
              focus: 'series'
            },
            data: trendData,
            animationDelay: function (idx) {
              return idx * 50;
            }
          }
        ]
      };

      trendsChart.setOption(trendsOption);
    }

    // Handle window resize
    const handleResize = () => {
      severityChart?.resize();
      statusChart?.resize();
      trendsChart?.resize();
    };

    window.addEventListener('resize', handleResize);
  }

  function updateCharts() {
    if (!issueStats) return;

    // Update severity chart if it exists
    if (severityChart && severityChartContainer) {
      const severityEntries = Object.entries(issueStats.severity).filter(([key, value]) => value > 0);
      if (severityEntries.length > 0) {
        const severityData = severityEntries.map(([key, value]) => ({
          name: key,
          value: value
        }));

        severityChart.setOption({
          series: [{
            data: severityData
          }]
        });
      }
    }

    // Update status chart if it exists
    if (statusChart && statusChartContainer) {
      const statusEntries = Object.entries(issueStats.status).filter(([key, value]) => value > 0);
      if (statusEntries.length > 0) {
        const statusLabels = statusEntries.map(([key]) => key.replace('_', ' '));
        const statusValues = statusEntries.map(([key, value]) => value);

        statusChart.setOption({
          xAxis: [{
            data: statusLabels
          }],
          series: [{
            data: statusValues.map((value, index) => ({
              value: value,
              itemStyle: {
                color: [
                  '#EF4444', // OPEN - red
                  '#F59E0B', // TRIAGED - yellow
                  '#3B82F6', // IN_PROGRESS - blue
                  '#10B981'  // DONE - green
                ][index],
                borderRadius: [4, 4, 0, 0]
              }
            }))
          }]
        });
      }
    }

    // Update trends chart if it exists
    if (trendsChart && trendsChartContainer && dailyStats.length >= 2) {
      const sortedStats = [...dailyStats].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const trendLabels = sortedStats.map(stat => 
        new Date(stat.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      );
      const trendData = sortedStats.map(stat => stat.total_issues);

      trendsChart.setOption({
        xAxis: {
          data: trendLabels
        },
        series: [{
          data: trendData
        }]
      });
    }
  }

  $: totalIssues = issueStats ? Object.values(issueStats.status).reduce((a: any, b: any) => a + b, 0) : 0;
  $: openIssues = issueStats ? (issueStats.status.OPEN || 0) + (issueStats.status.TRIAGED || 0) : 0;
  $: resolvedIssues = issueStats ? (issueStats.status.DONE || 0) : 0;
  $: criticalIssues = issueStats ? (issueStats.severity.CRITICAL || 0) : 0;
  $: hasData = totalIssues > 0;
  $: hasTrendData = dailyStats.length >= 2;
</script>

{#if $isLoggedIn}
  <div class="space-y-8">
    <div>
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
      <p class="text-gray-600">Overview of all issues and trends</p>
    </div>

    {#if loading}
      <div class="flex justify-center py-12">
        <div class="text-gray-500">Loading dashboard...</div>
      </div>
    {:else}
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div class="bg-white p-6 rounded-lg shadow">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500">Total Issues</p>
              <p class="text-2xl font-bold text-gray-900">{totalIssues}</p>
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-lg shadow">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500">Open Issues</p>
              <p class="text-2xl font-bold text-red-600">{openIssues}</p>
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-lg shadow">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500">Resolved</p>
              <p class="text-2xl font-bold text-green-600">{resolvedIssues}</p>
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-lg shadow">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <svg class="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500">Critical Issues</p>
              <p class="text-2xl font-bold text-orange-600">{criticalIssues}</p>
            </div>
          </div>
        </div>
      </div>

      {#if hasData}
        <!-- Charts Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <!-- Severity Chart -->
          <div class="bg-white p-6 rounded-lg shadow">
            <div bind:this={severityChartContainer} class="h-80 w-full"></div>
          </div>

          <!-- Status Chart -->
          <div class="bg-white p-6 rounded-lg shadow">
            <div bind:this={statusChartContainer} class="h-80 w-full"></div>
          </div>
        </div>

        <!-- Trends Chart -->
        {#if hasTrendData}
          <div class="bg-white p-6 rounded-lg shadow">
            <div bind:this={trendsChartContainer} class="h-80 w-full"></div>
          </div>
        {:else}
          <div class="bg-white p-6 rounded-lg shadow text-center py-12">
            <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2-2z" />
            </svg>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Trend Analysis Coming Soon</h3>
            <p class="text-gray-500">Create more issues over time to see trend analysis here</p>
          </div>
        {/if}
      {:else}
        <!-- No Data State -->
        <div class="bg-white p-12 rounded-lg shadow text-center">
          <svg class="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 class="text-xl font-medium text-gray-900 mb-2">No Issues Yet</h3>
          <p class="text-gray-500 mb-6">Get started by creating your first issue to see analytics here</p>
          <a 
            href="/issues/create"
            class="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Your First Issue
          </a>
        </div>
      {/if}

      <!-- Quick Actions -->
      <div class="bg-white p-6 rounded-lg shadow">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div class="flex flex-wrap gap-4">
          <a 
            href="/issues/create"
            class="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Issue
          </a>
          <a 
            href="/issues"
            class="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            View All Issues
          </a>
        </div>
      </div>
    {/if}
  </div>
{/if}