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
