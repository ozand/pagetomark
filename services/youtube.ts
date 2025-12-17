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

        console.log('Attempting to fetch YouTube transcript for video:', videoId);

        // Method 1: Try Cloudflare Worker proxy
        const workerUrl = import.meta.env.VITE_YOUTUBE_PROXY_URL || 'https://youtube-transcript-proxy.ayga-tech.workers.dev';

        try {
            console.log('Method 1: Trying Cloudflare Worker proxy...');
            const response = await fetch(`${workerUrl}?videoId=${videoId}`);

            if (response.ok) {
                const data = await response.json();

                if (data.success && data.transcript) {
                    videoTitle = data.title || videoTitle;

                    const parser = new DOMParser();
                    const doc = parser.parseFromString(data.transcript, "text/xml");
                    const texts = doc.getElementsByTagName('text');

                    if (texts.length > 0) {
                        transcriptItems = Array.from(texts).map(text => ({
                            text: text.textContent || '',
                            duration: parseFloat(text.getAttribute('dur') || text.getAttribute('d') || '0'),
                            start: parseFloat(text.getAttribute('start') || '0')
                        }));

                        console.log(`✓ Worker success: ${transcriptItems.length} segments`);
                    }
                }
            }
        } catch (error) {
            console.warn('Worker failed:', error);
        }

        // Method 2: Try timedtext API directly (no proxy)
        if (transcriptItems.length === 0) {
            console.log('Method 2: Trying timedtext API direct...');

            const languages = ['en', 'ru', 'es', 'fr', 'de'];

            for (const lang of languages) {
                try {
                    const timedtextUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}`;
                    console.log(`  Trying ${lang}...`);

                    const response = await fetch(timedtextUrl);

                    if (response.ok) {
                        const xml = await response.text();
                        console.log(`  ${lang} XML length:`, xml.length);

                        if (xml && xml.trim().length > 0 && xml.includes('<text')) {
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(xml, "text/xml");
                            const texts = doc.getElementsByTagName('text');

                            if (texts.length > 0) {
                                transcriptItems = Array.from(texts).map(text => ({
                                    text: text.textContent || '',
                                    duration: parseFloat(text.getAttribute('dur') || text.getAttribute('d') || '0'),
                                    start: parseFloat(text.getAttribute('start') || '0')
                                }));

                                console.log(`✓ Timedtext direct success (${lang}): ${transcriptItems.length} segments`);
                                break;
                            }
                        }
                    }
                } catch (e) {
                    console.warn(`  ${lang} failed:`, e);
                }
            }
        }

        // Method 3: Try fetching video page with CORS proxy
        if (transcriptItems.length === 0) {
            console.log('Method 3: Trying video page scraping...');

            const corsProxyUrl = import.meta.env.VITE_CORS_PROXY_URL || 'https://pagetomark-cors-proxy.ayga-tech.workers.dev';
            const proxyUrl = (targetUrl: string) => `${corsProxyUrl}/?${encodeURIComponent(targetUrl)}`;

            try {
                const videoPageRes = await fetch(proxyUrl(`https://www.youtube.com/watch?v=${videoId}`));
                console.log('  Video page response:', videoPageRes.status);

                if (!videoPageRes.ok) {
                    throw new Error(`Page fetch failed: ${videoPageRes.status}`);
                }

                const videoPageHtml = await videoPageRes.text();
                console.log('  HTML length:', videoPageHtml.length);

                // Extract video title
                const titleMatch = videoPageHtml.match(/<title>(.+?)<\/title>/);
                if (titleMatch) {
                    videoTitle = titleMatch[1].replace(' - YouTube', '').trim();
                    console.log('  Title:', videoTitle);
                }

                // Look for ytInitialPlayerResponse
                const playerResponseMatch = videoPageHtml.match(/var ytInitialPlayerResponse\s*=\s*(\{.+?\});/s);

                if (playerResponseMatch) {
                    console.log('  Found ytInitialPlayerResponse, parsing...');

                    try {
                        const playerResponse = JSON.parse(playerResponseMatch[1]);
                        const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

                        if (captions && Array.isArray(captions) && captions.length > 0) {
                            console.log(`  Found ${captions.length} caption tracks`);

                            // Select best track
                            const track =
                                captions.find((t: any) => t.languageCode === 'en' && !t.kind) ||
                                captions.find((t: any) => t.languageCode === 'en' && t.kind === 'asr') ||
                                captions[0];

                            if (track?.baseUrl) {
                                console.log('  Fetching caption from:', track.baseUrl.substring(0, 100) + '...');

                                const transcriptRes = await fetch(proxyUrl(track.baseUrl));
                                const transcriptXml = await transcriptRes.text();

                                const parser = new DOMParser();
                                const doc = parser.parseFromString(transcriptXml, "text/xml");
                                const texts = doc.getElementsByTagName('text');

                                if (texts.length > 0) {
                                    transcriptItems = Array.from(texts).map(text => ({
                                        text: text.textContent || '',
                                        duration: parseFloat(text.getAttribute('dur') || '0'),
                                        start: parseFloat(text.getAttribute('start') || '0')
                                    }));

                                    console.log(`✓ Page scraping success: ${transcriptItems.length} segments`);
                                }
                            }
                        } else {
                            console.log('  No captions found in playerResponse');
                        }
                    } catch (e) {
                        console.warn('  Failed to parse playerResponse:', e);
                    }
                } else {
                    console.log('  ytInitialPlayerResponse not found in HTML');
                }
            } catch (error) {
                console.warn('  Video page fetch failed:', error);
            }
        }

        // Check if we got any transcript
        if (transcriptItems.length === 0) {
            console.error('❌ All methods failed for video:', videoId);
            throw new Error("No captions found for this video. The video may not have subtitles enabled.");
        }

        // Format the transcript
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
title: "${videoTitle}"
source: ${videoUrl}
video_id: ${videoId}
date: ${dateStr}
---

# ${videoTitle}

**Video:** [${videoUrl}](${videoUrl})

---

`;

        const fullMarkdown = header + transcriptText;

        return {
            markdown: fullMarkdown,
            title: videoTitle,
            url: videoUrl,
            timestamp: dateStr
        };

    } catch (error: any) {
        console.error('YouTube transcript error:', error);
        throw new Error(`Failed to fetch transcript: ${error.message || 'Unknown error'}`);
    }
};
