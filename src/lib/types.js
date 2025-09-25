/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} username
 * @property {string} name
 * @property {string} email
 * @property {string} [avatar]
 * @property {string} [bio]
 * @property {string} created
 * @property {string} updated
 */

/**
 * @typedef {Object} Space
 * @property {string} id
 * @property {string} name
 * @property {string} slug
 * @property {string} description
 * @property {string} [avatar]
 * @property {boolean} isPublic
 * @property {string[]} owners
 * @property {string[]} moderators
 * @property {number} memberCount
 * @property {string} created
 * @property {string} updated
 */

/**
 * @typedef {Object} Group
 * @property {string} id
 * @property {string} space
 * @property {string} name
 * @property {string} description
 * @property {boolean} isPublic
 * @property {string[]} moderators
 * @property {number} memberCount
 * @property {string} created
 * @property {string} updated
 */

/**
 * @typedef {Object} Post
 * @property {string} id
 * @property {string} author
 * @property {string} content
 * @property {string[]} [attachments]
 * @property {'global'|'space'|'group'} scope
 * @property {string} [space]
 * @property {string} [group]
 * @property {number} likeCount
 * @property {number} commentCount
 * @property {string} created
 * @property {string} updated
 */

/**
 * @typedef {Object} Comment
 * @property {string} id
 * @property {string} post
 * @property {string} author
 * @property {string} content
 * @property {string} created
 * @property {string} updated
 */

export {};
