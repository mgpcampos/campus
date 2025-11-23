/// <reference path="../pb_data/types.d.ts" />
migrate(
	(app) => {
		const collection = app.findCollectionByNameOrId("pbc_1125843985");

		collection.updateRule =
			"(@request.auth.id = author) || (@request.auth.id != '' && ((@request.body.likeCount:isset = true) || (@request.body.commentCount:isset = true)) && @request.body.author:isset = false && @request.body.content:isset = false && @request.body.attachments:isset = false && @request.body.scope:isset = false && @request.body.space:isset = false && @request.body.group:isset = false && @request.body.created:isset = false && @request.body.updated:isset = false && @request.body.id:isset = false)";

		return app.save(collection);
	},
	(app) => {
		const collection = app.findCollectionByNameOrId("pbc_1125843985");

		collection.updateRule = "@request.auth.id = author";

		return app.save(collection);
	}
);
