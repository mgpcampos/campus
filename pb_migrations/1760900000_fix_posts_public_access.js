/// <reference path="../pb_data/types.d.ts" />
migrate(
	(app) => {
		const collection = app.findCollectionByNameOrId("pbc_1125843985");

		// Allow public read access for global posts, require auth for space/group posts
		collection.listRule = "scope = 'global' || @request.auth.id != ''";
		collection.viewRule = "scope = 'global' || @request.auth.id != ''";

		return app.save(collection);
	},
	(app) => {
		const collection = app.findCollectionByNameOrId("pbc_1125843985");

		// Rollback to require authentication for all posts
		collection.listRule = "@request.auth.id != \"\"";
		collection.viewRule = "@request.auth.id != \"\"";

		return app.save(collection);
	}
);
