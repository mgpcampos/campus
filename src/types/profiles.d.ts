/**
 * Type definitions for academic profiles and publications
 */

export type ProfileRole = 'student' | 'professor' | 'researcher' | 'staff';

export type ContributionRole = 'author' | 'editor' | 'advisor';

export interface ProfileLink {
	label: string;
	url: string;
}

export interface ProfileRecord {
	id: string;
	user: string;
	displayName: string;
	department: string;
	role: ProfileRole;
	biography?: string;
	pronouns?: string;
	links?: ProfileLink[];
	created: string;
	updated: string;
}

export interface PublicationAuthor {
	name: string;
	affiliation?: string;
}

export interface PublicationRecord {
	id: string;
	title: string;
	doi?: string;
	slugHash: string;
	abstract?: string;
	year?: number;
	venue?: string;
	authors?: PublicationAuthor[];
	material?: string; // relation to materials collection
	created: string;
	updated: string;
}

export interface ProfilePublicationRecord {
	id: string;
	profile: string;
	publication: string;
	contributionRole: ContributionRole;
	created: string;
	updated: string;
}

export interface ProfileWithPublications extends ProfileRecord {
	publications?: PublicationRecord[];
	expand?: {
		user?: { id: string; name?: string; email?: string };
		profile_publications_via_profile?: ProfilePublicationRecord | ProfilePublicationRecord[];
	};
}

export interface PublicationWithMaterial extends PublicationRecord {
	expand?: {
		material?: {
			id: string;
			title: string;
			format: string;
			file?: string;
		};
	};
}

export interface ProfileCreateInput {
	user: string;
	displayName: string;
	department: string;
	role: ProfileRole;
	biography?: string;
	pronouns?: string;
	links?: ProfileLink[];
}

export interface ProfileUpdateInput {
	displayName?: string;
	department?: string;
	role?: ProfileRole;
	biography?: string;
	pronouns?: string;
	links?: ProfileLink[];
}

export interface PublicationCreateInput {
	title: string;
	doi?: string;
	year?: number;
	venue?: string;
	abstract?: string;
	authors?: PublicationAuthor[];
	materialId?: string;
}

export interface PublicationDedupeResult {
	exists: boolean;
	publicationId?: string;
	matchType?: 'doi' | 'slugHash';
}
