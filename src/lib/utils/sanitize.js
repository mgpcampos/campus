import sanitizeHtml from 'sanitize-html';

// Define a conservative allowlist: basic formatting only
const allowedTags = [
  'b','i','em','strong','u','s','p','br','ul','ol','li','blockquote','code','pre','span'
];

const allowedAttributes = {
  span: ['class']
};

/**
 * Sanitize user-provided rich text or plain text content.
 * Strips disallowed tags & attributes and normalizes whitespace.
 * @param {string} input
 * @returns {string}
 */
export function sanitizeContent(input = '') {
  if (typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (!trimmed) return '';
  const cleaned = sanitizeHtml(trimmed, {
    allowedTags,
    allowedAttributes,
    disallowedTagsMode: 'discard',
    // Transformations: collapse multiple spaces and newlines
    textFilter(text) {
      return text.replace(/\s+/g, ' ');
    }
  });
  return cleaned;
}

/**
 * Sanitizes plain text (no HTML allowed) - escapes angle brackets.
 * @param {string} input
 */
export function sanitizePlainText(input = '') {
  return sanitizeHtml(input || '', { allowedTags: [], allowedAttributes: {} });
}
