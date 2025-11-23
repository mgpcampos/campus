import PocketBase from 'pocketbase';

const PB_URL = process.env.PB_BASE_URL ?? 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL ?? 'admin@campus.local';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD ?? 'admin12345';

const definitions = [
	{
		name: 'spaces',
		type: 'base',
		schema: [
			{
				name: 'name',
				type: 'text',
				required: true,
				min: 1,
				max: 100
			},
			{
				name: 'slug',
				type: 'text',
				required: true,
				min: 1,
				max: 100,
				pattern: '^[a-z0-9-]+$'
			},
			{
				name: 'description',
				type: 'text',
				required: false,
				max: 1000
			},
			{
				name: 'avatar',
				type: 'file',
				required: false,
				options: {
					maxSelect: 1,
					maxSize: 5 * 1024 * 1024,
					mimeTypes: ['image/jpeg', 'image/png', 'image/webp']
				}
			},
			{
				name: 'isPublic',
				type: 'bool',
				required: true
			},
			{
				name: 'owners',
				type: 'relation',
				required: true,
				options: {
					collectionId: '_pb_users_auth_',
					cascadeDelete: false,
					maxSelect: 0
				}
			},
			{
				name: 'moderators',
				type: 'relation',
				required: false,
				options: {
					collectionId: '_pb_users_auth_',
					cascadeDelete: false,
					maxSelect: 0
				}
			}
		],
		indexes: ['CREATE UNIQUE INDEX IF NOT EXISTS idx_spaces_slug ON spaces(slug)'],
		listRule: '@request.auth.id != ""',
		viewRule: '@request.auth.id != ""',
		createRule: '@request.auth.id != ""',
		updateRule: '@request.auth.id != "" && owners.id ?= @request.auth.id',
		deleteRule: '@request.auth.id != "" && owners.id ?= @request.auth.id'
	},
	{
		name: 'groups',
		type: 'base',
		schema: [
			{
				name: 'space',
				type: 'relation',
				required: true,
				options: {
					collectionId: 'spaces',
					cascadeDelete: true,
					maxSelect: 1
				}
			},
			{
				name: 'name',
				type: 'text',
				required: true,
				min: 1,
				max: 100
			},
			{
				name: 'description',
				type: 'text',
				required: false,
				max: 1000
			},
			{
				name: 'isPublic',
				type: 'bool',
				required: true
			},
			{
				name: 'moderators',
				type: 'relation',
				required: false,
				options: {
					collectionId: '_pb_users_auth_',
					cascadeDelete: false,
					maxSelect: 0
				}
			}
		],
		indexes: [],
		listRule: '@request.auth.id != ""',
		viewRule: '@request.auth.id != ""',
		createRule: '@request.auth.id != ""',
		updateRule: '@request.auth.id != "" && (space.owners.id ?= @request.auth.id)',
		deleteRule: '@request.auth.id != "" && (space.owners.id ?= @request.auth.id)'
	},
	{
		name: 'posts',
		type: 'base',
		schema: [
			{
				name: 'author',
				type: 'relation',
				required: true,
				options: {
					collectionId: '_pb_users_auth_',
					cascadeDelete: false,
					maxSelect: 1
				}
			},
			{
				name: 'content',
				type: 'text',
				required: true,
				min: 1,
				max: 2000
			},
			{
				name: 'attachments',
				type: 'file',
				required: false,
				options: {
					maxSelect: 4,
					maxSize: 10 * 1024 * 1024,
					mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
				}
			},
			{
				name: 'scope',
				type: 'select',
				required: true,
				options: {
					maxSelect: 1,
					values: ['global', 'space', 'group']
				}
			},
			{
				name: 'space',
				type: 'relation',
				required: false,
				options: {
					collectionId: 'spaces',
					cascadeDelete: true,
					maxSelect: 1
				}
			},
			{
				name: 'group',
				type: 'relation',
				required: false,
				options: {
					collectionId: 'groups',
					cascadeDelete: true,
					maxSelect: 1
				}
			},
			{
				name: 'likeCount',
				type: 'number',
				required: false
			},
			{
				name: 'commentCount',
				type: 'number',
				required: false
			}
		],
		indexes: [
			'CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created)',
			'CREATE INDEX IF NOT EXISTS idx_posts_scope_created ON posts(scope, created)',
			'CREATE INDEX IF NOT EXISTS idx_posts_space_created ON posts(space, created)',
			'CREATE INDEX IF NOT EXISTS idx_posts_group_created ON posts(group, created)',
			'CREATE INDEX IF NOT EXISTS idx_posts_author_created ON posts(author, created)'
		],
		listRule: '@request.auth.id != ""',
		viewRule: '@request.auth.id != ""',
		createRule: '@request.auth.id != "" && @request.auth.id = author',
		updateRule: '@request.auth.id = author',
		deleteRule:
			'@request.auth.id = author || (space.owners.id ?= @request.auth.id) || (space.moderators.id ?= @request.auth.id) || (group.moderators.id ?= @request.auth.id) || (group.space.owners.id ?= @request.auth.id) || (group.space.moderators.id ?= @request.auth.id)'
	},
	{
		name: 'comments',
		type: 'base',
		schema: [
			{
				name: 'post',
				type: 'relation',
				required: true,
				options: {
					collectionId: 'posts',
					cascadeDelete: true,
					maxSelect: 1
				}
			},
			{
				name: 'author',
				type: 'relation',
				required: true,
				options: {
					collectionId: '_pb_users_auth_',
					cascadeDelete: false,
					maxSelect: 1
				}
			},
			{
				name: 'content',
				type: 'text',
				required: true,
				min: 1,
				max: 1000
			}
		],
		indexes: ['CREATE INDEX IF NOT EXISTS idx_comments_post_created ON comments(post, created)'],
		listRule: '@request.auth.id != ""',
		viewRule: '@request.auth.id != ""',
		createRule: '@request.auth.id != "" && @request.auth.id = author',
		updateRule: '@request.auth.id = author',
		deleteRule:
			'@request.auth.id = author || (post.space.owners.id ?= @request.auth.id) || (post.space.moderators.id ?= @request.auth.id) || (post.group.moderators.id ?= @request.auth.id) || (post.group.space.owners.id ?= @request.auth.id) || (post.group.space.moderators.id ?= @request.auth.id)'
	},
	{
		name: 'likes',
		type: 'base',
		schema: [
			{
				name: 'post',
				type: 'relation',
				required: true,
				options: {
					collectionId: 'posts',
					cascadeDelete: true,
					maxSelect: 1
				}
			},
			{
				name: 'user',
				type: 'relation',
				required: true,
				options: {
					collectionId: '_pb_users_auth_',
					cascadeDelete: true,
					maxSelect: 1
				}
			}
		],
		indexes: ['CREATE UNIQUE INDEX IF NOT EXISTS idx_likes_post_user ON likes(post, user)'],
		listRule: '@request.auth.id != ""',
		viewRule: '@request.auth.id != ""',
		createRule: '@request.auth.id != "" && @request.auth.id = user',
		updateRule: '@request.auth.id = user',
		deleteRule: '@request.auth.id = user'
	},
	{
		name: 'space_members',
		type: 'base',
		schema: [
			{
				name: 'space',
				type: 'relation',
				required: true,
				options: {
					collectionId: 'spaces',
					cascadeDelete: true,
					maxSelect: 1
				}
			},
			{
				name: 'user',
				type: 'relation',
				required: true,
				options: {
					collectionId: '_pb_users_auth_',
					cascadeDelete: true,
					maxSelect: 1
				}
			},
			{
				name: 'role',
				type: 'select',
				required: true,
				options: {
					maxSelect: 1,
					values: ['member', 'moderator', 'owner']
				}
			}
		],
		indexes: ['CREATE UNIQUE INDEX IF NOT EXISTS idx_space_members_unique ON space_members(space, user)'],
		listRule: "@request.auth.id != '' && (user = @request.auth.id || space.isPublic = true || space.owners.id ?= @request.auth.id)",
		viewRule: "@request.auth.id != '' && (user = @request.auth.id || space.isPublic = true || space.owners.id ?= @request.auth.id)",
		createRule: "@request.auth.id != '' && @request.body.user = @request.auth.id && (space.isPublic = true || space.owners.id ?= @request.auth.id)",
		updateRule: "@request.auth.id != '' && (space.owners.id ?= @request.auth.id || space.moderators.id ?= @request.auth.id)",
		deleteRule: "@request.auth.id != '' && (user = @request.auth.id || space.owners.id ?= @request.auth.id || space.moderators.id ?= @request.auth.id)"
	},
	{
		name: 'group_members',
		type: 'base',
		schema: [
			{
				name: 'group',
				type: 'relation',
				required: true,
				options: {
					collectionId: 'groups',
					cascadeDelete: true,
					maxSelect: 1
				}
			},
			{
				name: 'user',
				type: 'relation',
				required: true,
				options: {
					collectionId: '_pb_users_auth_',
					cascadeDelete: true,
					maxSelect: 1
				}
			},
			{
				name: 'role',
				type: 'select',
				required: true,
				options: {
					maxSelect: 1,
					values: ['member', 'moderator']
				}
			}
		],
		indexes: ['CREATE UNIQUE INDEX IF NOT EXISTS idx_group_members_unique ON group_members(group, user)'],
		listRule:
			"@request.auth.id != '' && (user = @request.auth.id || group.isPublic = true || group.moderators.id ?= @request.auth.id || group.space.owners.id ?= @request.auth.id || group.space.moderators.id ?= @request.auth.id)",
		viewRule:
			"@request.auth.id != '' && (user = @request.auth.id || group.isPublic = true || group.moderators.id ?= @request.auth.id || group.space.owners.id ?= @request.auth.id || group.space.moderators.id ?= @request.auth.id)",
		createRule:
			"@request.auth.id != '' && @request.body.user = @request.auth.id && (group.isPublic = true || group.space.owners.id ?= @request.auth.id || group.space.moderators.id ?= @request.auth.id)",
		updateRule:
			"@request.auth.id != '' && (group.moderators.id ?= @request.auth.id || group.space.owners.id ?= @request.auth.id || group.space.moderators.id ?= @request.auth.id)",
		deleteRule:
			"@request.auth.id != '' && (user = @request.auth.id || group.moderators.id ?= @request.auth.id || group.space.owners.id ?= @request.auth.id || group.space.moderators.id ?= @request.auth.id)"
	},
	{
		name: 'notifications',
		type: 'base',
		schema: [
			{
				name: 'user',
				type: 'relation',
				required: true,
				options: {
					collectionId: '_pb_users_auth_',
					cascadeDelete: true,
					maxSelect: 1
				}
			},
			{
				name: 'actor',
				type: 'relation',
				required: true,
				options: {
					collectionId: '_pb_users_auth_',
					cascadeDelete: true,
					maxSelect: 1
				}
			},
			{
				name: 'type',
				type: 'select',
				required: true,
				options: {
					maxSelect: 1,
					values: ['like', 'comment', 'mention']
				}
			},
			{
				name: 'post',
				type: 'relation',
				required: false,
				options: {
					collectionId: 'posts',
					cascadeDelete: true,
					maxSelect: 1
				}
			},
			{
				name: 'comment',
				type: 'relation',
				required: false,
				options: {
					collectionId: 'comments',
					cascadeDelete: true,
					maxSelect: 1
				}
			},
			{
				name: 'read',
				type: 'bool',
				required: true
			}
		],
		indexes: [
			'CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user, read)',
			'CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user, created DESC)'
		],
		listRule: '@request.auth.id = user',
		viewRule: '@request.auth.id = user',
		createRule: null,
		updateRule: '@request.auth.id = user',
		deleteRule: '@request.auth.id = user'
	},
	{
		name: 'reports',
		type: 'base',
		schema: [
			{
				name: 'reporter',
				type: 'relation',
				required: true,
				options: {
					collectionId: '_pb_users_auth_',
					cascadeDelete: false,
					maxSelect: 1
				}
			},
			{
				name: 'targetType',
				type: 'select',
				required: true,
				options: {
					maxSelect: 1,
					values: ['post', 'comment']
				}
			},
			{
				name: 'targetId',
				type: 'text',
				required: true,
				min: 15,
				max: 15,
				pattern: '^[a-z0-9]+$'
			},
			{
				name: 'post',
				type: 'relation',
				required: false,
				options: {
					collectionId: 'posts',
					cascadeDelete: true,
					maxSelect: 1
				}
			},
			{
				name: 'comment',
				type: 'relation',
				required: false,
				options: {
					collectionId: 'comments',
					cascadeDelete: true,
					maxSelect: 1
				}
			},
			{
				name: 'reason',
				type: 'text',
				required: true
			},
			{
				name: 'status',
				type: 'select',
				required: true,
				options: {
					maxSelect: 1,
					values: ['open', 'reviewing', 'resolved', 'dismissed']
				}
			}
		],
		indexes: ['CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(targetType, targetId)'],
		listRule:
			"@request.auth.id != '' && (reporter = @request.auth.id || @request.auth.isAdmin = true || (post != null && (post.author = @request.auth.id || post.space.owners.id ?= @request.auth.id || post.space.moderators.id ?= @request.auth.id || (post.group != null && (post.group.moderators.id ?= @request.auth.id || post.group.space.owners.id ?= @request.auth.id || post.group.space.moderators.id ?= @request.auth.id)))) || (comment != null && (comment.author = @request.auth.id || (comment.post != null && (comment.post.space.owners.id ?= @request.auth.id || comment.post.space.moderators.id ?= @request.auth.id || (comment.post.group != null && (comment.post.group.moderators.id ?= @request.auth.id || comment.post.group.space.owners.id ?= @request.auth.id || comment.post.group.space.moderators.id ?= @request.auth.id)))))))",
		viewRule:
			"@request.auth.id != '' && (reporter = @request.auth.id || @request.auth.isAdmin = true || (post != null && (post.author = @request.auth.id || post.space.owners.id ?= @request.auth.id || post.space.moderators.id ?= @request.auth.id || (post.group != null && (post.group.moderators.id ?= @request.auth.id || post.group.space.owners.id ?= @request.auth.id || post.group.space.moderators.id ?= @request.auth.id)))) || (comment != null && (comment.author = @request.auth.id || (comment.post != null && (comment.post.space.owners.id ?= @request.auth.id || comment.post.space.moderators.id ?= @request.auth.id || (comment.post.group != null && (comment.post.group.moderators.id ?= @request.auth.id || comment.post.group.space.owners.id ?= @request.auth.id || comment.post.group.space.moderators.id ?= @request.auth.id)))))))",
		createRule: '@request.auth.id != "" && @request.body.reporter = @request.auth.id',
		updateRule:
			"@request.auth.id != '' && (reporter = @request.auth.id || @request.auth.isAdmin = true || (post != null && (post.author = @request.auth.id || post.space.owners.id ?= @request.auth.id || post.space.moderators.id ?= @request.auth.id || (post.group != null && (post.group.moderators.id ?= @request.auth.id || post.group.space.owners.id ?= @request.auth.id || post.group.space.moderators.id ?= @request.auth.id)))) || (comment != null && (comment.author = @request.auth.id || (comment.post != null && (comment.post.space.owners.id ?= @request.auth.id || comment.post.space.moderators.id ?= @request.auth.id || (comment.post.group != null && (comment.post.group.moderators.id ?= @request.auth.id || comment.post.group.space.owners.id ?= @request.auth.id || comment.post.group.space.moderators.id ?= @request.auth.id)))))))",
		deleteRule:
			"@request.auth.id != '' && (reporter = @request.auth.id || @request.auth.isAdmin = true || (post != null && (post.author = @request.auth.id || post.space.owners.id ?= @request.auth.id || post.space.moderators.id ?= @request.auth.id || (post.group != null && (post.group.moderators.id ?= @request.auth.id || post.group.space.owners.id ?= @request.auth.id || post.group.space.moderators.id ?= @request.auth.id)))) || (comment != null && (comment.author = @request.auth.id || (comment.post != null && (comment.post.space.owners.id ?= @request.auth.id || comment.post.space.moderators.id ?= @request.auth.id || (comment.post.group != null && (comment.post.group.moderators.id ?= @request.auth.id || comment.post.group.space.owners.id ?= @request.auth.id || comment.post.group.space.moderators.id ?= @request.auth.id)))))))"
	},
	{
		name: 'moderation_logs',
		type: 'base',
		schema: [
			{
				name: 'actor',
				type: 'relation',
				required: true,
				options: {
					collectionId: '_pb_users_auth_',
					cascadeDelete: false,
					maxSelect: 1
				}
			},
			{
				name: 'action',
				type: 'select',
				required: true,
				options: {
					maxSelect: 1,
					values: ['delete_post', 'delete_comment', 'resolve_report', 'dismiss_report']
				}
			},
			{
				name: 'meta',
				type: 'json',
				required: false,
				options: {}
			}
		],
		indexes: [],
		listRule: '@request.auth.id != ""',
		viewRule: '@request.auth.id != ""',
		createRule: '@request.auth.id != ""',
		updateRule: '',
		deleteRule: ''
	},
	{
		name: 'analytics_events',
		type: 'base',
		schema: [
			{
				name: 'type',
				type: 'text',
				required: true,
				pattern: '^(page|event|vital)$',
				max: 16
			},
			{
				name: 'name',
				type: 'text',
				required: true,
				max: 64
			},
			{
				name: 'sessionId',
				type: 'text',
				required: true,
				min: 6,
				max: 64
			},
			{
				name: 'page',
				type: 'text',
				required: false,
				max: 256
			},
			{
				name: 'referrer',
				type: 'text',
				required: false,
				max: 512
			},
			{
				name: 'locale',
				type: 'text',
				required: false,
				max: 16
			},
			{
				name: 'userAgent',
				type: 'text',
				required: false,
				max: 512
			},
			{
				name: 'value',
				type: 'number',
				required: false
			},
			{
				name: 'metadata',
				type: 'json',
				required: false
			},
			{
				name: 'ip',
				type: 'text',
				required: false,
				max: 64
			},
			{
				name: 'user',
				type: 'relation',
				required: false,
				options: {
					collectionId: '_pb_users_auth_',
					cascadeDelete: false,
					maxSelect: 1
				}
			}
		],
		indexes: [
			'CREATE INDEX IF NOT EXISTS idx_analytics_session ON analytics_events(sessionId)',
			'CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user)',
			'CREATE INDEX IF NOT EXISTS idx_analytics_type_created ON analytics_events(type, created)'
		],
		listRule: '@request.auth.id != "" && @request.auth.isAdmin = true',
		viewRule: '@request.auth.id != "" && @request.auth.isAdmin = true',
		createRule: '@request.auth.id != ""',
		updateRule: null,
		deleteRule: null
	}
];

function cleanPayload(payload) {
	const result = { ...payload };
	for (const key of Object.keys(result)) {
		if (result[key] === undefined) {
			delete result[key];
		}
		if (result[key] === null && key === 'schema') {
			delete result[key];
		}
	}
	return result;
}

function normalizeIndexes(indexes) {
	if (!indexes || indexes.length === 0) return '';
	return indexes.join('\n');
}

function cloneSchema(schema) {
	return JSON.parse(JSON.stringify(schema));
}

async function ensureCollection(pb, def) {
	const payload = cleanPayload({
		name: def.name,
		type: def.type,
		fields: cloneSchema(def.schema),
		indexes: normalizeIndexes(def.indexes),
		listRule: def.listRule ?? null,
		viewRule: def.viewRule ?? null,
		createRule: def.createRule ?? null,
		updateRule: def.updateRule ?? null,
		deleteRule: def.deleteRule ?? null,
		options: def.options ?? {}
	});

	try {
		const existing = await pb.collections.getOne(def.name);
		await pb.collections.update(existing.id, payload);
		console.log(`Updated collection ${def.name}`);
	} catch (error) {
		if (error?.status === 404) {
			try {
				await pb.collections.create(payload);
				console.log(`Created collection ${def.name}`);
			} catch (createError) {
				console.error(`Failed creating collection ${def.name} with payload:`, JSON.stringify(payload, null, 2));
				throw createError;
			}
		} else {
			console.error(`Failed updating collection ${def.name} with payload:`, JSON.stringify(payload, null, 2));
			throw error;
		}
	}
}

async function ensureUsersCollection(pb) {
	const users = await pb.collections.getOne('_pb_users_auth_');
	const existingSchema = cloneSchema(users.schema ?? []);
	const hasIsAdmin = existingSchema.some((field) => field.name === 'isAdmin');
	if (!hasIsAdmin) {
		existingSchema.push({
			name: 'isAdmin',
			type: 'bool',
			required: false
		});
	}
	await pb.collections.update(users.id, {
		fields: existingSchema,
		listRule: '@request.auth.id != "" && (@request.auth.id = id || @request.auth.isAdmin = true)',
		viewRule: '@request.auth.id != "" && (@request.auth.id = id || @request.auth.isAdmin = true)',
		updateRule: '@request.auth.id = id || @request.auth.isAdmin = true',
		deleteRule: '@request.auth.id = id || @request.auth.isAdmin = true'
	});
	console.log('Ensured users collection rules and isAdmin field');
}

async function collectionExists(pb, name) {
	try {
		await pb.collections.getOne(name);
		return true;
	} catch (error) {
		if (error?.status === 404) {
			return false;
		}
		throw error;
	}
}

async function getOrCreateRecord(pb, collection, filter, payload) {
	try {
		return await pb.collection(collection).getFirstListItem(filter);
	} catch (error) {
		if (error?.status === 404) {
			return await pb.collection(collection).create(payload);
		}
		throw error;
	}
}

async function ensureUser(pb, { email, password, name, isAdmin = false }) {
	const user = await getOrCreateRecord(
		pb,
		'_pb_users_auth_',
		`email = "${email}"`,
		{
			email,
			password,
			passwordConfirm: password,
			name,
			emailVisibility: true
		}
	);

	if (isAdmin && !user.isAdmin) {
		await pb.collection('_pb_users_auth_').update(user.id, { isAdmin: true });
		user.isAdmin = true;
	}

	return user;
}

async function ensureSpace(pb, { slug, name, description, owners }) {
	return await getOrCreateRecord(pb, 'spaces', `slug = "${slug}"`, {
		slug,
		name,
		description,
		isPublic: true,
		owners,
		moderators: owners
	});
}

async function ensureGroup(pb, { name, spaceId, description }) {
	return await getOrCreateRecord(
		pb,
		'groups',
		`name = "${name}" && space = "${spaceId}"`,
		{
			name,
			description,
			space: spaceId,
			isPublic: true
		}
	);
}

async function seedFeed(pb, users, space, group) {
	const hasPosts = await collectionExists(pb, 'posts');
	if (!hasPosts) {
		console.warn('Skipping feed seed: posts collection not found yet.');
		return;
	}

	const samplePosts = [
		{
			filter: 'content = "Welcome to the campus network! Share your latest research wins."',
			payload: {
				content: 'Welcome to the campus network! Share your latest research wins.',
				scope: 'space',
				author: users['grad-student@example.edu'].id,
				space: space.id
			}
		},
		{
			filter: 'content = "Weekly lab sync is Friday at 2pm—drop agenda items in the thread."',
			payload: {
				content: 'Weekly lab sync is Friday at 2pm—drop agenda items in the thread.',
				scope: 'group',
				author: users['lab-lead@example.edu'].id,
				group: group.id
			}
		}
	];

	for (const { filter, payload } of samplePosts) {
		await getOrCreateRecord(pb, 'posts', filter, payload);
	}
}

async function seedMaterials(pb, users) {
	if (!(await collectionExists(pb, 'materials'))) {
		console.warn('Skipping materials seed: materials collection not found yet.');
		return;
	}

	await getOrCreateRecord(pb, 'materials', 'title = "Quantum Entanglement Primer"', {
		title: 'Quantum Entanglement Primer',
		description: 'Slides and lab notes for the introductory entanglement module.',
		tags: ['quantum', 'lab', 'primer'],
		format: 'link',
		linkUrl: 'https://example.edu/materials/quantum-entanglement-primer',
		visibility: 'institution',
		uploader: users['professor@example.edu'].id
	});
}

async function seedEvents(pb, users, space) {
	if (!(await collectionExists(pb, 'events'))) {
		console.warn('Skipping events seed: events collection not found yet.');
		return;
	}

	const event = await getOrCreateRecord(pb, 'events', 'title = "Quantum Lab Planning"', {
		title: 'Quantum Lab Planning',
		description: 'Plan lab rotations and paper reviews for the semester.',
		scopeType: 'space',
		scopeId: space.id,
		start: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
		end: new Date(Date.now() + 50 * 60 * 60 * 1000).toISOString(),
		location: { type: 'physical', value: 'Physics Building, Room 204' },
		createdBy: users['lab-lead@example.edu'].id
	});

	if (await collectionExists(pb, 'event_participants')) {
		for (const email of ['grad-student@example.edu', 'professor@example.edu']) {
			await getOrCreateRecord(pb, 'event_participants', `event = "${event.id}" && user = "${users[email].id}"`, {
				event: event.id,
				user: users[email].id,
				status: 'going'
			});
		}
	}
}

async function seedProfiles(pb, users) {
	if (!(await collectionExists(pb, 'profiles'))) {
		console.warn('Skipping profiles seed: profiles collection not found yet.');
		return;
	}

	// Create profile for Professor
	const professorProfile = await getOrCreateRecord(pb, 'profiles', `user = "${users['professor@example.edu'].id}"`, {
		user: users['professor@example.edu'].id,
		displayName: 'Dr. Ada Carver',
		department: 'Physics',
		role: 'professor',
		biography: 'Quantum computing researcher focusing on entanglement-based networking.',
		pronouns: 'she/her',
		links: [
			{ label: 'Lab Website', url: 'https://example.edu/labs/quantum' },
			{ label: 'Scholar Profile', url: 'https://scholar.example.edu/ada-carver' }
		]
	});

	// Create profile for Graduate Student
	const gradProfile = await getOrCreateRecord(pb, 'profiles', `user = "${users['grad-student@example.edu'].id}"`, {
		user: users['grad-student@example.edu'].id,
		displayName: 'Jordan Chen',
		department: 'Computer Science',
		role: 'student',
		biography: 'PhD candidate researching quantum algorithms and distributed systems.',
		pronouns: 'they/them',
		links: []
	});

	// Create profile for Lab Lead
	const labLeadProfile = await getOrCreateRecord(pb, 'profiles', `user = "${users['lab-lead@example.edu'].id}"`, {
		user: users['lab-lead@example.edu'].id,
		displayName: 'Dr. Marcus Rodriguez',
		department: 'Physics',
		role: 'researcher',
		biography: 'Principal investigator for quantum networking lab, focusing on practical implementations.',
		pronouns: 'he/him',
		links: [
			{ label: 'ORCID', url: 'https://orcid.org/0000-0001-2345-6789' }
		]
	});

	// Seed publications (if collections exist)
	if (!(await collectionExists(pb, 'publication_records')) || !(await collectionExists(pb, 'profile_publications'))) {
		console.warn('Skipping publications seed: publication_records or profile_publications collection not found yet.');
		return;
	}

	// Sample publications
	const pub1 = await getOrCreateRecord(pb, 'publication_records', 'title = "Quantum Entanglement in Distributed Networks"', {
		title: 'Quantum Entanglement in Distributed Networks',
		doi: '10.1038/nature12345',
		slugHash: 'quantum-entanglement-distributed-networks-2023',
		abstract: 'We present a novel approach to maintaining quantum entanglement across geographically distributed network nodes, achieving coherence times exceeding 1 second.',
		year: 2023,
		venue: 'Nature Physics',
		authors: [
			{ name: 'Ada Carver', affiliation: 'Example University' },
			{ name: 'Marcus Rodriguez', affiliation: 'Example University' }
		]
	});

	const pub2 = await getOrCreateRecord(pb, 'publication_records', 'title = "Scalable Quantum Key Distribution Protocols"', {
		title: 'Scalable Quantum Key Distribution Protocols',
		doi: '10.1103/PhysRevX.11.041001',
		slugHash: 'scalable-quantum-key-distribution-2022',
		abstract: 'A framework for quantum key distribution that scales to metropolitan-area networks while maintaining security guarantees.',
		year: 2022,
		venue: 'Physical Review X',
		authors: [
			{ name: 'Ada Carver', affiliation: 'Example University' },
			{ name: 'Jordan Chen', affiliation: 'Example University' }
		]
	});

	const pub3 = await getOrCreateRecord(pb, 'publication_records', 'title = "Machine Learning Approaches to Quantum State Tomography"', {
		title: 'Machine Learning Approaches to Quantum State Tomography',
		slugHash: 'machine-learning-quantum-state-tomography-2024',
		abstract: 'We demonstrate how neural networks can significantly improve the efficiency of quantum state tomography in laboratory settings.',
		year: 2024,
		venue: 'IEEE Quantum Computing',
		authors: [
			{ name: 'Jordan Chen', affiliation: 'Example University' },
			{ name: 'Marcus Rodriguez', affiliation: 'Example University' }
		]
	});

	// Link publications to profiles
	await getOrCreateRecord(pb, 'profile_publications', `profile = "${professorProfile.id}" && publication = "${pub1.id}"`, {
		profile: professorProfile.id,
		publication: pub1.id,
		contributionRole: 'author'
	});

	await getOrCreateRecord(pb, 'profile_publications', `profile = "${labLeadProfile.id}" && publication = "${pub1.id}"`, {
		profile: labLeadProfile.id,
		publication: pub1.id,
		contributionRole: 'author'
	});

	await getOrCreateRecord(pb, 'profile_publications', `profile = "${professorProfile.id}" && publication = "${pub2.id}"`, {
		profile: professorProfile.id,
		publication: pub2.id,
		contributionRole: 'author'
	});

	await getOrCreateRecord(pb, 'profile_publications', `profile = "${gradProfile.id}" && publication = "${pub2.id}"`, {
		profile: gradProfile.id,
		publication: pub2.id,
		contributionRole: 'author'
	});

	await getOrCreateRecord(pb, 'profile_publications', `profile = "${gradProfile.id}" && publication = "${pub3.id}"`, {
		profile: gradProfile.id,
		publication: pub3.id,
		contributionRole: 'author'
	});

	await getOrCreateRecord(pb, 'profile_publications', `profile = "${labLeadProfile.id}" && publication = "${pub3.id}"`, {
		profile: labLeadProfile.id,
		publication: pub3.id,
		contributionRole: 'advisor'
	});
}

async function seedMessaging(pb, users) {
	if (!(await collectionExists(pb, 'conversation_threads'))) {
		console.warn('Skipping messaging seed: conversation_threads collection not found yet.');
		return;
	}

	const thread = await getOrCreateRecord(
		pb,
		'conversation_threads',
		'name = "Quantum Research Chat"',
		{
			type: 'group',
			name: 'Quantum Research Chat',
			createdBy: users['lab-lead@example.edu'].id,
			members: Object.values(users).map((user) => user.id)
		}
	);

	if (await collectionExists(pb, 'messages')) {
		await getOrCreateRecord(pb, 'messages', `thread = "${thread.id}" && author = "${users['lab-lead@example.edu'].id}"`, {
			thread: thread.id,
			author: users['lab-lead@example.edu'].id,
			body: 'Welcome to the team thread! Share blockers before Friday.',
			status: 'visible'
		});
	}
}

async function seedDemoData(pb) {
	const users = {
		'grad-student@example.edu': await ensureUser(pb, {
			email: 'grad-student@example.edu',
			password: 'Campus!123',
			name: 'Graduate Student'
		}),
		'professor@example.edu': await ensureUser(pb, {
			email: 'professor@example.edu',
			password: 'Campus!123',
			name: 'Professor Quantum'
		}),
		'lab-lead@example.edu': await ensureUser(pb, {
			email: 'lab-lead@example.edu',
			password: 'Campus!123',
			name: 'Lab Lead'
		}),
		'moderator@example.edu': await ensureUser(pb, {
			email: 'moderator@example.edu',
			password: 'Campus!123',
			name: 'Campus Moderator',
			isAdmin: true
		})
	};

	const space = await ensureSpace(pb, {
		slug: 'quantum-networking-lab',
		name: 'Quantum Networking Lab',
		description: 'Research updates and coordination hub for the quantum networking team.',
		owners: [users['lab-lead@example.edu'].id]
	});

	const group = await ensureGroup(pb, {
		name: 'Qubit Synchronization Squad',
		description: 'Working group focused on synchronization experiments.',
		spaceId: space.id
	});

	await seedFeed(pb, users, space, group);
	await seedMaterials(pb, users);
	await seedEvents(pb, users, space);
	await seedProfiles(pb, users);
	await seedMessaging(pb, users);

	console.log('Seeded demo data for quickstart scenarios.');
}

async function main() {
	const pb = new PocketBase(PB_URL);
	await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);

	for (const def of definitions) {
		await ensureCollection(pb, def);
	}

	await ensureUsersCollection(pb);

	await seedDemoData(pb);

	console.log('PocketBase schema bootstrap completed successfully.');
	pb.authStore.clear();
}

main().catch((error) => {
	console.error('Failed to bootstrap PocketBase schema:', error);
	process.exit(1);
});
