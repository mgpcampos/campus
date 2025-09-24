# Campus - Academic Social Network

A lightweight, Twitter-like social network designed specifically for the education community, including high-school and university students, teachers, professors, researchers, and alumni.

## Features

- Global feed with chronological posts
- Institution-centric "Spaces" (university communities)
- Study Groups within Spaces
- Post interactions (likes, comments)
- User authentication and profiles
- Real-time updates
- Responsive design with accessibility support
 - Role-based Space memberships (owner, moderator, member)
 - Image attachments on posts with validation & previews (Task 10)

## Tech Stack

- **Frontend**: SvelteKit with TypeScript
- **Backend**: PocketBase (SQLite, REST API, real-time, file storage)
- **UI**: Tailwind CSS + shadcn-svelte components
- **Forms**: Zod schemas + sveltekit-superforms
- **Icons**: lucide-svelte

## Prerequisites

- Node.js 18+ 
- PocketBase server running on http://127.0.0.1:8090

## Setup

1. Install dependencies:
```sh
npm install
```

2. Copy environment variables:
```sh
cp .env.example .env
```

3. Start PocketBase server (download from https://pocketbase.io/):
```sh
./pocketbase serve
```

4. Start the development server:
```sh
npm run dev
```

## Project Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── ui/          # Reusable UI components
│   │   ├── layout/      # Layout components (Header, Footer)
│   │   ├── forms/       # Form components
│   │   └── feed/        # Feed-related components
│   ├── utils/           # Utility functions
│   ├── stores/          # Svelte stores
│   ├── pocketbase.js    # PocketBase client setup
│   ├── config.js        # App configuration
│   └── types.js         # Type definitions
├── routes/              # SvelteKit routes
└── hooks.server.js      # Server-side hooks for auth
```

## Spaces & Memberships

Spaces allow organizing content around institutions or thematic communities. Each Space has:

- Visibility: public (joinable by any authenticated user) or private (future enhancement)
- Owners: users with full administrative control
- Moderators: users who can manage description and moderate content (future moderation tools)
- Members: regular participants

Memberships are stored in the `space_members` collection with a unique `(space, user)` constraint and a `role` field (`member | moderator | owner`). An owner membership is automatically created when a Space is created.

### Creating a Space
1. Navigate to `/spaces/create`
2. Provide name, slug, optional description, and public flag
3. Submit the form – you become the owner

### Browsing Spaces
The `/spaces` page lists spaces with member counts and supports basic search.

### Space Detail & Feed
`/spaces/[id]` displays:
- Space metadata
- Join/Leave button based on membership state
- Member count
- Posts scoped to that space

### Management
Owners and moderators can edit the description at `/spaces/[id]/manage`.

### Posting Into a Space
When on a Space page, new posts created via the post form are automatically scoped to that Space.

## Testing

Vitest is configured for unit and integration tests. Added tests cover membership service logic (join, leave, role retrieval). Run:

```sh
npm test
```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run check` - Run type checking
- `npm run lint` - Run linting
- `npm run format` - Format code

## Environment Variables

- `PUBLIC_POCKETBASE_URL` - PocketBase server URL (default: http://127.0.0.1:8090)

## Security & Validation

The platform implements multiple layers of content safety (Task 11):

- Server-side HTML sanitization via `sanitize-html` (`sanitizeContent`) for posts, comments, and bios
- Zod schemas for all major entities (`posts`, `comments`, `spaces`, `groups`, `profile`) with length and pattern constraints
- File upload validation (type, size, count) in `media.js`
- In-memory rate limiting for write API endpoints (30 write ops/min/IP) in `hooks.server.ts` (replace with Redis for production)
- Hardened auth cookies: httpOnly, Secure (in production), path-wide, SameSite Lax (Strict on auth routes)
- Consistent trimming & normalization of whitespace to mitigate hidden payload obfuscation

Planned / recommended production enhancements:

- Redis or Upstash-backed distributed rate limiting
- CSP headers & security headers (Helmet-equivalent) middleware
- Structured audit logging for moderation actions
- Optional virus scanning (e.g., ClamAV) for file uploads

## Performance & Caching (Task 12)

Implemented optimizations:

- Server-side in-memory LRU+TTL cache (`src/lib/utils/cache.js`) for: 
	- First page of global posts feed (10s TTL)
	- First page of spaces listing (30s TTL)
	- Space member counts (20s TTL)
- Client-side stale-while-revalidate query cache store (`src/lib/stores/queryCache.ts`) for lightweight response reuse without bringing a full query lib.
- PocketBase collection indexes migration (`pb_migrations/1758635000_add_performance_indexes.js`) adding composite indexes for common filters & uniqueness constraints.
- Lazy loading of comment section in `PostCard.svelte` via dynamic import to reduce initial bundle.
- Responsive image URL helpers with PocketBase thumbs (`src/lib/utils/images.js`) generating `srcset` for avatars & attachments.
- Simple perf instrumentation (`src/lib/utils/perf.js`) to warn on slow ops (>200ms) and optional cache miss logging.

Next recommendations for production scale:

- Replace in-process cache with Redis / KV store for horizontal scaling.
- Add HTTP caching headers (ETag/Last-Modified) and CDN edge caching for public assets and first feed page.
- Precompute denormalized counters (already partially stored as like/comment counts) via PocketBase before hooks or background jobs.
- Add bundle analyzer and track JS payload budgets (<150KB gzipped initial route).
- Implement image format negotiation (WebP/AVIF) and add width-based placeholder (LQIP) pipeline.
- Add Service Worker for offline caching of shell & last feed snapshot.

Testing:

- `cache.test.js` validates LRU + TTL semantics and getOrSet helper.
- `images.test.js` covers URL & srcset generation.
- Additional feed / route benchmarks can be added using Vitest + synthetic timers or Playwright traces.

## Realtime Feed & Notifications (Task 14)

Implemented a realtime layer for post feed updates and a user notifications system:

- Feed subscription listens to all `posts` events and filters client-side by current context (global / space / group).
- Heartbeat monitors event freshness; lack of events >30s triggers a 15s polling fallback until realtime resumes.
- Notifications collection stores like, comment, and mention events with indexes for `(user, read)` and chronological retrieval.
- Server endpoints emit notifications on like toggle, comment creation, and detected `@mentions` (regex based, duplicate-safe).
- Client subscription maintains a capped in-memory list (50) and an unread counter with mark single / mark all functionality.
- Accessible dropdown UI with keyboard support and axe-tested semantics.

Detailed architecture & extension guidance: `docs/realtime-notifications.md`.


