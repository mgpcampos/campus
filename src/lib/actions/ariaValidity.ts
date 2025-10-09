type ValidatableField = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

type Params = {
	invalid?: boolean;
	errorId?: string;
};

const isHTMLElement = (value: EventTarget | null): value is HTMLElement =>
	value instanceof HTMLElement;

export function ariaValidity(node: ValidatableField, params: Params = {}) {
	let current = params;

	function applyInvalidState(invalid: boolean) {
		if (invalid) {
			node.setAttribute('aria-invalid', 'true');
			if (current.errorId && !node.getAttribute('aria-describedby')) {
				node.setAttribute('aria-describedby', current.errorId);
			}
		} else if (node.validity.valid) {
			node.removeAttribute('aria-invalid');
			const describedBy = node.getAttribute('aria-describedby');
			if (describedBy && describedBy === current.errorId) {
				node.removeAttribute('aria-describedby');
			}
		}
	}

	function handleInvalid(event: Event) {
		if (!isHTMLElement(event.target)) return;
		applyInvalidState(true);
	}

	function handleInput(event: Event) {
		if (!isHTMLElement(event.target)) return;
		applyInvalidState(Boolean(current.invalid));
	}

	node.addEventListener('invalid', handleInvalid);
	node.addEventListener('input', handleInput);
	node.addEventListener('change', handleInput);
	node.addEventListener('blur', handleInput);

	applyInvalidState(Boolean(current.invalid));

	return {
		update(newParams: Params = {}) {
			current = newParams;
			applyInvalidState(Boolean(current.invalid));
		},
		destroy() {
			node.removeEventListener('invalid', handleInvalid);
			node.removeEventListener('input', handleInput);
			node.removeEventListener('change', handleInput);
			node.removeEventListener('blur', handleInput);
		}
	};
}
