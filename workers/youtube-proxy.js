/**
 * Cloudflare Worker to fetch YouTube transcripts
 * This bypasses CORS restrictions when fetching from the browser
 */

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // Only allow GET requests
        if (request.method !== 'GET') {
            return new Response('Method not allowed', { status: 405 });
        }

        // Get video ID from query parameter
        const videoId = url.searchParams.get('videoId');

        if (!videoId) {
            return new Response(JSON.stringify({ error: 'Missing videoId parameter' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        try {
            // First, fetch the video page to extract caption tracks
            const videoPageUrl = `https://www.youtube.com/watch?v=${videoId}`;
            const videoPageResponse = await fetch(videoPageUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9'
                }
            });

            if (!videoPageResponse.ok) {
                throw new Error('Failed to fetch video page');
            }

            const videoHtml = await videoPageResponse.text();

            // Extract video title
            let videoTitle = 'YouTube Video Transcript';
            const titleMatch = videoHtml.match(/<title>(.+?)<\/title>/);
            if (titleMatch) {
                videoTitle = titleMatch[1].replace(' - YouTube', '').trim();
            }

            // Extract caption tracks from the page
            const captionMatch = videoHtml.match(/"captionTracks":\s*(\[.+?\])/);

            if (!captionMatch) {
                // Try fallback: direct API call with common languages
                const languages = ['en', 'en-US', 'en-GB', 'ru', 'es', 'fr', 'de'];

                for (const lang of languages) {
                    const transcriptUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=srv3`;

                    try {
                        const response = await fetch(transcriptUrl);
                        if (response.ok) {
                            const xml = await response.text();
                            if (xml && (xml.includes('<transcript>') || xml.includes('<text'))) {
                                return new Response(JSON.stringify({
                                    success: true,
                                    title: videoTitle,
                                    transcript: xml,
                                    language: lang
                                }), {
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Access-Control-Allow-Origin': '*',
                                        'Access-Control-Allow-Methods': 'GET',
                                        'Cache-Control': 'public, max-age=3600'
                                    }
                                });
                            }
                        }
                    } catch (e) {
                        continue;
                    }
                }

                return new Response(JSON.stringify({
                    error: 'No captions available for this video'
                }), {
                    status: 404,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            }

            // Parse caption tracks
            const captionTracks = JSON.parse(captionMatch[1]);

            if (!captionTracks || captionTracks.length === 0) {
                return new Response(JSON.stringify({
                    error: 'No caption tracks found'
                }), {
                    status: 404,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            }

            // Get the first caption track
            const captionUrl = captionTracks[0].baseUrl;
            const language = captionTracks[0].languageCode || 'unknown';

            // Fetch the caption XML
            const captionResponse = await fetch(captionUrl);

            if (!captionResponse.ok) {
                throw new Error('Failed to fetch captions');
            }

            const transcriptXml = await captionResponse.text();

            // Return the transcript
            return new Response(JSON.stringify({
                success: true,
                title: videoTitle,
                transcript: transcriptXml,
                language: language
            }), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET',
                    'Cache-Control': 'public, max-age=3600'
                }
            });

        } catch (error) {
            return new Response(JSON.stringify({
                error: error.message || 'Failed to fetch transcript'
            }), {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
    }
};
