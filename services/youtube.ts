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

        // First, try to get available caption tracks
        const videoPageUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const proxies = [
            `https://api.allorigins.win/raw?url=${encodeURIComponent(videoPageUrl)}`,
            `https://corsproxy.io/?${encodeURIComponent(videoPageUrl)}`
        ];

        let videoHtml = '';
        let lastError: Error | null = null;

        // Fetch video page to get available caption languages
        for (const proxyUrl of proxies) {
            try {
                const response = await fetch(proxyUrl);
                if (!response.ok) {
                    throw new Error(`Failed to fetch: ${response.status}`);
                }
                videoHtml = await response.text();
                if (videoHtml && videoHtml.length > 1000) {
                    break;
                }
            } catch (error) {
                lastError = error as Error;
                console.warn(`Proxy failed: ${proxyUrl}`, error);
            }
        }

        // Extract available caption tracks
        let captionLangs = ['en', 'ru', 'es', 'fr', 'de', 'ja', 'ko', 'zh', 'pt']; // Default fallback languages
        
        if (videoHtml) {
            try {
                const captionMatch = videoHtml.match(/"captionTracks":\s*(\[.+?\])/);
                if (captionMatch) {
                    const captionTracks = JSON.parse(captionMatch[1]);
                    if (captionTracks && captionTracks.length > 0) {
                        captionLangs = captionTracks.map((track: any) => track.languageCode || track.vssId?.split('.')[0]);
                    }
                }
            } catch (e) {
                console.warn('Could not parse caption tracks, using default languages');
            }
        }

        // Try each available language
        let transcriptXml = '';
        
        for (const lang of captionLangs) {
            if (!lang) continue;
            
            const transcriptUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}`;
            
            for (const proxyUrl of proxies) {
                try {
                    const fullProxyUrl = proxyUrl.includes('allorigins') 
                        ? `https://api.allorigins.win/raw?url=${encodeURIComponent(transcriptUrl)}`
                        : `https://corsproxy.io/?${encodeURIComponent(transcriptUrl)}`;
                    
                    const response = await fetch(fullProxyUrl);
                    if (!response.ok) continue;
                    
                    const text = await response.text();
                    if (text && text.includes('<transcript>')) {
                        transcriptXml = text;
                        console.log(`Found transcript in language: ${lang}`);
                        break;
                    }
                } catch (error) {
                    console.warn(`Failed to fetch transcript for lang ${lang}:`, error);
                }
            }
            
            if (transcriptXml) break;
        }

        if (!transcriptXml || !transcriptXml.includes('<transcript>')) {
            throw new Error('No transcript available for this video. The video may not have captions enabled.');
        }

        // Parse XML transcript
        const transcriptItems = parseTranscriptXml(transcriptXml);

        if (!transcriptItems || transcriptItems.length === 0) {
            throw new Error('Failed to parse transcript data.');
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
 * Parse YouTube transcript XML
 */
const parseTranscriptXml = (xml: string): TranscriptItem[] => {
    const items: TranscriptItem[] = [];

    // Parse XML manually (simple approach for browser)
    const textMatches = xml.matchAll(/<text start="([^"]+)" dur="([^"]+)"[^>]*>([^<]*)<\/text>/g);

    for (const match of textMatches) {
        items.push({
            start: parseFloat(match[1]),
            duration: parseFloat(match[2]),
            text: match[3]
        });
    }

    return items;
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
