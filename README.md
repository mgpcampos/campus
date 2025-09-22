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

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run check` - Run type checking
- `npm run lint` - Run linting
- `npm run format` - Format code

## Environment Variables

- `PUBLIC_POCKETBASE_URL` - PocketBase server URL (default: http://127.0.0.1:8090)
