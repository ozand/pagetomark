import moment from 'moment';
import { ConversionResult } from '../types';

interface TranscriptItem {
    text: string;
    start: number;
    duration: number;
}

/**
 * Extract video ID from YouTube URL
 */
const extractVideoId = (url: string): string | null => {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /^([a-zA-Z0-9_-]{11})$/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }

    return null;
};

/**
 * Check if URL is a YouTube video
 */
export const isYouTubeUrl = (url: string): boolean => {
    return /(?:youtube\.com\/watch|youtu\.be\/|youtube\.com\/embed\/)/.test(url);
};

/**
 * Fetch YouTube video transcript and convert to markdown
 */
export const getYouTubeTranscript = async (url: string): Promise<ConversionResult> => {
    try {
        const videoId = extractVideoId(url);

        if (!videoId) {
            throw new Error('Invalid YouTube URL. Could not extract video ID.');
        }

        let transcriptItems: TranscriptItem[] = [];
        let videoTitle = 'YouTube Video Transcript';

        // Helper to wrap URL in a CORS proxy
        const proxyUrl = (targetUrl: string) => 'https://corsproxy.io/?' + encodeURIComponent(targetUrl);

        try {
            // 1. Fetch Video Page
            const videoPageRes = await fetch(proxyUrl(`https://www.youtube.com/watch?v=${videoId}`));
            const videoPageHtml = await videoPageRes.text();

            // Extract video title
            const titleMatch = videoPageHtml.match(/<title>(.+?)<\/title>/);
            if (titleMatch) {
                videoTitle = titleMatch[1].replace(' - YouTube', '').trim();
            }

            // 2. Extract Captions JSON - try multiple patterns
            let captionMatch = videoPageHtml.match(/"captionTracks":\s*(\[[\s\S]*?\])/);

            // Alternative: try to find the whole ytInitialPlayerResponse
            if (!captionMatch) {
                const playerResponseMatch = videoPageHtml.match(/var ytInitialPlayerResponse\s*=\s*({.+?});/);
                if (playerResponseMatch) {
                    try {
                        const playerResponse = JSON.parse(playerResponseMatch[1]);
                        const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
                        if (captions && captions.length > 0) {
                            // Manually select and fetch the caption
                            const track =
                                captions.find((t: any) => t.languageCode === 'en' && !t.kind) ||
                                captions.find((t: any) => t.languageCode === 'en' && t.kind === 'asr') ||
                                captions[0];

                            if (track?.baseUrl) {
                                const transcriptRes = await fetch(proxyUrl(track.baseUrl));
                                const transcriptXml = await transcriptRes.text();

                                const parser = new DOMParser();
                                const doc = parser.parseFromString(transcriptXml, "text/xml");
                                const texts = doc.getElementsByTagName('text');

                                transcriptItems = Array.from(texts).map(text => ({
                                    text: text.textContent || '',
                                    duration: parseFloat(text.getAttribute('dur') || '0'),
                                    start: parseFloat(text.getAttribute('start') || '0')
                                }));

                                console.log('Got transcript from ytInitialPlayerResponse');
                            }
                        }
                    } catch (e) {
                        console.warn('Failed to parse ytInitialPlayerResponse:', e);
                    }
                }
            }

            if (!captionMatch && transcriptItems.length === 0) {
                // Check for common error cases
                if (videoPageHtml.includes('class="g-recaptcha"')) {
                    throw new Error("YouTube is asking for a captcha. Please try again later.");
                }
                if (videoPageHtml.includes('"playabilityStatus":{"status":"ERROR"')) {
                    throw new Error("Video is unavailable or private.");
                }
                throw new Error("No captions found for this video. The video may not have subtitles enabled.");
            }

            // If we already got transcripts from ytInitialPlayerResponse, skip this
            if (transcriptItems.length === 0 && captionMatch) {
                const tracks = JSON.parse(captionMatch[1]);

                // 3. Select Track (English preferred, or first available)
                const track =
                    tracks.find((t: any) => t.languageCode === 'en' && !t.kind) || // Manual English
                    tracks.find((t: any) => t.languageCode === 'en' && t.kind === 'asr') || // Auto English
                    tracks[0]; // Fallback

                if (!track) {
                    throw new Error("No usable caption track found.");
                }

                // 4. Fetch Transcript XML
                const transcriptRes = await fetch(proxyUrl(track.baseUrl));
                const transcriptXml = await transcriptRes.text();

                // 5. Parse XML using DOMParser
                const parser = new DOMParser();
                const doc = parser.parseFromString(transcriptXml, "text/xml");
                const texts = doc.getElementsByTagName('text');

                transcriptItems = Array.from(texts).map(text => ({
                    text: text.textContent || '',
                    duration: parseFloat(text.getAttribute('dur') || '0'),
                    start: parseFloat(text.getAttribute('start') || '0')
                }));

                console.log('Got transcript from captionTracks');
            }

        } catch (error: any) {
            console.error('Manual Transcript Fetch Error:', error);
            throw new Error(`Failed to fetch transcript: ${error.message}`);
        }

        if (!transcriptItems || transcriptItems.length === 0) {
            throw new Error('No transcript data found.');
        }

        // Build markdown content
        let transcriptText = '';

        transcriptItems.forEach((item: TranscriptItem) => {
            const timestamp = formatTimestamp(item.start);
            const cleanText = decodeHtmlEntities(item.text);
            transcriptText += `**[${timestamp}]** ${cleanText}\n\n`;
        });

        // Format metadata
        const dateStr = moment().format('YYYY-MM-DD HH:mm:ss');
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

        const header = `---
title: "YouTube Video Transcript"
source: ${videoUrl}
video_id: ${videoId}
date: ${dateStr}
---

# YouTube Video Transcript

**Video:** [${videoUrl}](${videoUrl})

---

`;

        const fullMarkdown = header + transcriptText;

        return {
            markdown: fullMarkdown,
            title: 'YouTube Video Transcript',
            url: videoUrl,
            timestamp: dateStr
        };

    } catch (error: any) {
        console.error('YouTube transcript error:', error);
        throw new Error(`Failed to fetch YouTube transcript: ${error.message || 'Unknown error'}`);
    }
};

/**
 * Decode HTML entities
 */
const decodeHtmlEntities = (text: string): string => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
};

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
const formatTimestamp = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};
