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
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1'
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

            // Extract ytInitialPlayerResponse - need to parse the full JSON object
            const startMarker = 'var ytInitialPlayerResponse = ';
            const startIdx = videoHtml.indexOf(startMarker);

            let captionUrl = null;

            if (startIdx !== -1) {
                // Find the JSON object by counting braces
                const jsonStart = startIdx + startMarker.length;
                let braceCount = 0;
                let jsonEnd = jsonStart;
                let inString = false;
                let escapeNext = false;

                for (let i = jsonStart; i < videoHtml.length; i++) {
                    const char = videoHtml[i];

                    if (escapeNext) {
                        escapeNext = false;
                        continue;
                    }

                    if (char === '\\') {
                        escapeNext = true;
                        continue;
                    }

                    if (char === '"' && !escapeNext) {
                        inString = !inString;
                        continue;
                    }

                    if (!inString) {
                        if (char === '{') braceCount++;
                        if (char === '}') braceCount--;

                        if (braceCount === 0 && char === '}') {
                            jsonEnd = i + 1;
                            break;
                        }
                    }
                }

                try {
                    const jsonStr = videoHtml.substring(jsonStart, jsonEnd);
                    const playerResponse = JSON.parse(jsonStr);

                    // Get captions
                    const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
                    if (captions && captions.length > 0) {
                        // Prefer manual English, then auto English, then any available
                        const track =
                            captions.find(t => t.languageCode === 'en' && !t.kind) ||
                            captions.find(t => t.languageCode === 'en' && t.kind === 'asr') ||
                            captions[0];

                        captionUrl = track.baseUrl;
                    }
                } catch (e) {
                    console.error('Failed to parse ytInitialPlayerResponse:', e);
                }
            }

            // Fallback: try simple regex for captionTracks
            if (!captionUrl) {
                const captionMatch = videoHtml.match(/"captionTracks":\s*(\[[\s\S]*?\])/);

                if (captionMatch) {
                    try {
                        const tracks = JSON.parse(captionMatch[1]);
                        if (tracks && tracks.length > 0) {
                            captionUrl = tracks[0].baseUrl;
                        }
                    } catch (e) {
                        // Continue to next method
                    }
                }
            }

            if (!captionUrl) {
                // Try fallback: direct API call with common languages
                const languages = ['en', 'en-US', 'en-GB', 'a.en', 'ru', 'es', 'fr', 'de'];

                for (const lang of languages) {
                    const transcriptUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}`;

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
                language: 'unknown'
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
