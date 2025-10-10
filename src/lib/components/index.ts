// Layout Components
export { default as Header } from './layout/Header.svelte';
export { default as Sidebar } from './layout/Sidebar.svelte';

// Profile Components
export { default as ProfileCard } from './profile/ProfileCard.svelte';
export { default as ProfileForm } from './profile/ProfileForm.svelte';

// Feed Components
export { default as PostForm } from './forms/PostForm.svelte';
export { default as PostCard } from './feed/PostCard.svelte';
export { default as Feed } from './feed/Feed.svelte';

// Messaging Components
export { default as ThreadList } from './messaging/ThreadList.svelte';
export { default as MessageTimeline } from './messaging/MessageTimeline.svelte';
export { default as MessageComposer } from './messaging/MessageComposer.svelte';
export { default as FlagDialog } from './messaging/FlagDialog.svelte';

// UI Components
export { default as LoadingSpinner } from './ui/LoadingSpinner.svelte';
export { default as EmptyState } from './ui/EmptyState.svelte';
export { default as ErrorBoundary } from './ui/ErrorBoundary.svelte';
export { default as Modal } from './ui/Modal.svelte';
export { default as Navigation } from './ui/Navigation.svelte';
export { default as ContentCard } from './ui/ContentCard.svelte';
export { default as FormField } from './ui/FormField.svelte';
export { default as ActionButton } from './ui/ActionButton.svelte';
export { default as SkeletonLoader } from './ui/SkeletonLoader.svelte';
export { default as DataState } from './ui/DataState.svelte';
export { default as Toast } from './ui/toast.svelte';

// Accessibility Components
export { default as KeyboardNavigation } from './ui/KeyboardNavigation.svelte';
export { default as AccessibleMenu } from './ui/AccessibleMenu.svelte';
export { default as Breadcrumb } from './ui/Breadcrumb.svelte';
export { default as SkipLinks } from './ui/SkipLinks.svelte';
export { default as FocusManager } from './ui/FocusManager.svelte';
export { default as LiveRegion } from './ui/LiveRegion.svelte';

// Toast utilities
export { toast } from 'svelte-sonner';

// Re-export shadcn-svelte components for convenience
export { Button } from './ui/button/index.js';
export * as Card from './ui/card/index.js';
export { Input } from './ui/input/index.js';
export { Label } from './ui/label/index.js';
export { Textarea } from './ui/textarea/index.js';
export * as Dialog from './ui/dialog/index.js';
export * as DropdownMenu from './ui/dropdown-menu/index.js';
export { Toaster } from './ui/sonner/index.js';
