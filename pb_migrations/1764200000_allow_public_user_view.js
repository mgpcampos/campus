/// <reference path="../pb_data/types.d.ts" />
migrate(
	(app) => {
		const collection = app.findCollectionByNameOrId("_pb_users_auth_");

		// Allow public read access to user profiles
		// This enables the author relation expansion to work for unauthenticated users
		// when viewing global posts (which are already publicly accessible)
		collection.listRule = "";
		collection.viewRule = "";

		return app.save(collection);
	},
	(app) => {
		const collection = app.findCollectionByNameOrId("_pb_users_auth_");

		// Rollback to require authentication for viewing users
		collection.listRule = "@request.auth.id != ''";
		collection.viewRule = "@request.auth.id != ''";

		return app.save(collection);
	}
);
