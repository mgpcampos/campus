/**
 * Accessibility utilities for keyboard navigation and focus management
 */

/**
 * Trap focus within a container element
 */
export function trapFocus(container: HTMLElement): () => void {
	const focusableElements = container.querySelectorAll(
		'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
	) as NodeListOf<HTMLElement>;

	const firstElement = focusableElements[0];
	const lastElement = focusableElements[focusableElements.length - 1];

	function handleKeydown(event: KeyboardEvent) {
		if (event.key !== 'Tab') return;

		if (event.shiftKey) {
			if (document.activeElement === firstElement) {
				event.preventDefault();
				lastElement.focus();
			}
		} else {
			if (document.activeElement === lastElement) {
				event.preventDefault();
				firstElement.focus();
			}
		}
	}

	container.addEventListener('keydown', handleKeydown);

	// Focus the first element
	firstElement?.focus();

	// Return cleanup function
	return () => {
		container.removeEventListener('keydown', handleKeydown);
	};
}

/**
 * Manage focus restoration when modals/dialogs close
 */
export class FocusManager {
	private previousActiveElement: HTMLElement | null = null;

	save() {
		this.previousActiveElement = document.activeElement as HTMLElement;
	}

	restore() {
		if (this.previousActiveElement) {
			this.previousActiveElement.focus();
			this.previousActiveElement = null;
		}
	}
}

/**
 * Create a roving tabindex for keyboard navigation in lists/grids
 */
export function createRovingTabindex(
	container: HTMLElement,
	selector: string = '[role="option"], [role="menuitem"], [role="tab"]'
): () => void {
	const items = container.querySelectorAll(selector) as NodeListOf<HTMLElement>;
	let currentIndex = 0;

	// Set initial tabindex
	items.forEach((item, index) => {
		item.tabIndex = index === 0 ? 0 : -1;
	});

	function updateTabindex(newIndex: number) {
		items[currentIndex].tabIndex = -1;
		currentIndex = newIndex;
		items[currentIndex].tabIndex = 0;
		items[currentIndex].focus();
	}

	function handleKeydown(event: KeyboardEvent) {
		let newIndex = currentIndex;

		switch (event.key) {
			case 'ArrowDown':
			case 'ArrowRight':
				event.preventDefault();
				newIndex = (currentIndex + 1) % items.length;
				break;
			case 'ArrowUp':
			case 'ArrowLeft':
				event.preventDefault();
				newIndex = (currentIndex - 1 + items.length) % items.length;
				break;
			case 'Home':
				event.preventDefault();
				newIndex = 0;
				break;
			case 'End':
				event.preventDefault();
				newIndex = items.length - 1;
				break;
			default:
				return;
		}

		updateTabindex(newIndex);
	}

	container.addEventListener('keydown', handleKeydown);

	// Return cleanup function
	return () => {
		container.removeEventListener('keydown', handleKeydown);
	};
}

/**
 * Announce content to screen readers
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
	const announcer = document.createElement('div');
	announcer.setAttribute('aria-live', priority);
	announcer.setAttribute('aria-atomic', 'true');
	announcer.className = 'sr-only';

	document.body.appendChild(announcer);

	// Small delay to ensure screen readers pick up the content
	setTimeout(() => {
		announcer.textContent = message;

		// Remove after announcement
		setTimeout(() => {
			document.body.removeChild(announcer);
		}, 1000);
	}, 100);
}

/**
 * Check if an element is visible and focusable
 */
export function isFocusable(element: HTMLElement): boolean {
	if (element.tabIndex < 0) return false;
	if ('disabled' in element && (element as any).disabled) return false;
	if (element.hidden) return false;

	const style = window.getComputedStyle(element);
	if (style.display === 'none' || style.visibility === 'hidden') return false;

	return true;
}
