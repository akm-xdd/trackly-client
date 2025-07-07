# Trackly Client

SvelteKit frontend for the Trackly Issues & Insights Tracker with role-based UI, real-time updates, and responsive design.

## Features

- **Authentication**: Email/password + Google OAuth integration
- **Role-Based UI**: Dynamic interface based on user permissions (ADMIN/MAINTAINER/REPORTER)
- **Issue Management**: Create, view, edit, and delete issues with file attachments
- **Real-time Updates**: Live notifications for issue changes
- **Dashboard**: Interactive charts showing issue statistics
- **Responsive Design**: Works on desktop and mobile devices

## Prerequisites

- Node.js 18+
- Backend server running (see server README)

## Environment Variables

Create a `.env` file:

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:8000/api

# Google OAuth (optional)
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

## Running Locally

### 1. Setup

```bash
# Clone and navigate to client directory
cd client

# Install dependencies
npm install
```

### 2. Start Development Server

```bash
# Development mode with hot reload
npm run dev

# Development mode on specific port
npm run dev -- --port 5173 --host 0.0.0.0
```

Client will be available at `http://localhost:5173`

### 3. Build for Production

```bash
# Build the application
npm run build

# Preview production build
npm run preview
```

## Running with Docker

### Client Only

```bash
cd client
docker-compose up --build
```

This starts the SvelteKit application on port 3000.

### Full Stack (from root directory)

```bash
docker-compose up --build
```

**Note**: Ensure backend environment points to correct frontend URL

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Browser       │    │   SvelteKit      │    │   FastAPI       │
│   (User)        │◄──►│   Client         │◄──►│   Server        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │ Server-Sent      │
                       │ Events           │
                       └──────────────────┘
```

### Key Components

- **SvelteKit**: Full-stack framework with SSR capabilities
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Chart.js**: Interactive charts for dashboard analytics
- **Svelte Sonner**: Toast notifications for user feedback
- **Server-Sent Events**: Real-time updates from backend
- **JWT Authentication**: Token-based auth with automatic refresh

### Project Structure

```
src/
├── lib/
│   ├── api.ts              # API client with automatic token refresh
│   ├── auth.ts             # Authentication state management
│   ├── sse.ts              # Server-Sent Events client
│   └── components/         # Reusable UI components
├── routes/
│   ├── +layout.svelte      # Main application layout
│   ├── +page.svelte        # Dashboard page
│   ├── login/              # Authentication pages
│   ├── issues/             # Issue management pages
│   ├── users/              # User management (ADMIN only)
│   └── auth/google/        # Google OAuth callback
└── app.html                # Root HTML template
```

## Role-Based Features

### REPORTER Role
- ✅ Create new issues
- ✅ View own issues only
- ✅ Upload file attachments
- ❌ Cannot change issue status/severity
- ❌ Cannot view other users' issues
- ❌ No user management access
- ❌ Cannot update or delete issues

### MAINTAINER Role
- ✅ All REPORTER permissions
- ✅ View all issues
- ✅ Triage issues (change status/severity)
- ✅ Access dashboard statistics
- ❌ No user management access


### ADMIN Role
- ✅ All MAINTAINER permissions
- ✅ User management (create/edit/delete users)
- ✅ Real-time issue notifications
- ✅ Delete any issue
- ✅ Full system access

## Available Pages

### Public Pages
- `/login` - Authentication (email/password + Google OAuth)

### Authenticated Pages
- `/` - Dashboard with issue statistics and charts
- `/issues` - Issue list (filtered by role)
- `/issues/create` - Create new issue with file upload
- `/issues/[id]` - Issue details and editing
- `/users` - User management (ADMIN only)

## Trade-offs & Design Decisions

### Framework Choice
- **SvelteKit over React/Vue**: Smaller bundle size, better performance, excellent DX
- **SSR-ready but CSR-heavy**: Maintains SvelteKit benefits while simplifying auth

### Styling
- **Tailwind CSS**: Rapid development, consistent design system, small production CSS
- **Component-based design**: Reusable UI patterns, maintainable codebase

### State Management
- **Svelte stores**: Built-in reactivity, no external dependencies
- **Local storage for auth**: Simple JWT storage, works offline

### Real-time Updates
- **SSE over WebSockets**: Simpler implementation, automatic reconnection
- **Filtered Events**: Only relevant issue updates for each user

### Authentication
- **JWT with refresh**: Stateless, works with API-first architecture
- **Automatic token refresh**: Seamless user experience, handles expiry gracefully
- **Dual auth methods**: Email/password for internal users, Google OAuth for convenience

### API Integration
- **Centralized API client**: Consistent error handling, automatic auth headers
- **Optimistic updates**: Better perceived performance
- **Error boundaries**: Graceful degradation on API failures

### File Handling
- **Client-side upload**: Direct to backend, progress feedback
- **File type validation**: Security and UX considerations
- **Size limits**: Prevents abuse, good UX feedback

### Limitations
- **Client-side routing**: Requires proper server config for SPA fallback
- **JWT in localStorage**: Vulnerable to XSS (acceptable for internal tool)
- **No offline support**: Requires active backend connection


## Development

### Adding New Pages

1. Create route in `src/routes/`
2. Add to navigation in `+layout.svelte`
3. Implement role-based access if needed
4. Add API calls in page components

### Styling Guidelines

- Use Tailwind utility classes
- Follow mobile-first responsive design
- Maintain consistent spacing and colors
- Use semantic HTML elements

### Component Patterns

```svelte
<!-- Standard component structure -->
<script lang="ts">
  // Imports
  // Props and state
  // Functions
  // Reactive statements
</script>

<!-- HTML with Tailwind classes -->
<div class="...">
  <!-- Content -->
</div>

<!-- Scoped styles only when necessary -->
<style>
  /* Minimal custom CSS */
</style>
```

### API Integration

```typescript
// Use the centralized API client
import { apiCall } from '$lib/api';

// Handles auth, errors, and token refresh automatically
const data = await apiCall('/endpoint', { method: 'POST', body: JSON.stringify(payload) });
```

## Browser Support

- **Modern browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile browsers**: iOS Safari 14+, Chrome Mobile 90+
- **Features used**: ES2020, CSS Grid, Flexbox, Server-Sent Events