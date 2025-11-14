<script lang="ts">
import { pb } from '$lib/pocketbase.js'

export let post: any
export let videoFile: string
export let posterFile: string | undefined = undefined
export let altText: string = ''
export let className: string = ''

function getVideoUrl(filename: string) {
	return pb.files.getURL(post, filename)
}

function getPosterUrl(filename: string) {
	return pb.files.getURL(post, filename)
}

const videoUrl = getVideoUrl(videoFile)
const posterUrl = posterFile ? getPosterUrl(posterFile) : undefined
</script>

<div class="video-container {className}">
	<!-- svelte-ignore a11y_media_has_caption -->
	<video
		controls
		preload="metadata"
		poster={posterUrl}
		class="w-full rounded-lg"
		aria-label={altText || 'Video attachment'}
	>
		<source src={videoUrl} type="video/mp4" />
		<p class="p-4 text-sm text-gray-600">
			Your browser doesn't support HTML5 video. <a
				href={videoUrl}
				download
				class="text-blue-600 hover:underline">Download the video</a
			> instead.
		</p>
	</video>
	{#if altText}
		<p class="sr-only">{altText}</p>
	{/if}
</div>

<style>
	.video-container {
		position: relative;
	}

	video {
		background-color: #000;
		max-height: 500px;
		object-fit: contain;
	}

	video:focus {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
	}
</style>
