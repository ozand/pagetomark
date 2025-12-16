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

        // Try multiple methods to get transcript
        let transcriptItems: TranscriptItem[] = [];
        let videoTitle = 'YouTube Video Transcript';

        // Method 1: Try using a public transcript API service
        try {
            const apiUrl = `https://youtube-transcriptor.herokuapp.com/transcript?videoId=${videoId}`;
            const response = await fetch(apiUrl);
            
            if (response.ok) {
                const data = await response.json();
                if (data && Array.isArray(data)) {
                    transcriptItems = data.map((item: any) => ({
                        start: item.start || item.offset / 1000,
                        duration: item.duration || item.dur,
                        text: item.text
                    }));
                    console.log('Method 1: Got transcript from API service');
                }
            }
        } catch (error) {
            console.warn('Method 1 failed:', error);
        }

        // Method 2: Try timedtext API with multiple languages through proxy
        if (transcriptItems.length === 0) {
            const languages = ['en', 'en-US', 'ru', 'es', 'fr', 'de', 'ja', 'ko', 'zh', 'pt', 'ar', 'hi', 'it', 'pl', 'nl', 'tr'];
            
            for (const lang of languages) {
                if (transcriptItems.length > 0) break;
                
                const transcriptUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=srv3`;
                
                // Try without proxy first (sometimes works)
                try {
                    const response = await fetch(transcriptUrl);
                    if (response.ok) {
                        const xml = await response.text();
                        if (xml && (xml.includes('<transcript>') || xml.includes('<text'))) {
                            transcriptItems = parseTranscriptXml(xml);
                            console.log(`Method 2a: Got transcript in ${lang} without proxy`);
                            break;
                        }
                    }
                } catch (e) {
                    // Continue to proxy method
                }
                
                // Try with proxies
                const proxies = [
                    `https://api.allorigins.win/raw?url=${encodeURIComponent(transcriptUrl)}`,
                    `https://corsproxy.io/?${encodeURIComponent(transcriptUrl)}`,
                    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(transcriptUrl)}`
                ];
                
                for (const proxyUrl of proxies) {
                    try {
                        const response = await fetch(proxyUrl);
                        if (response.ok) {
                            const xml = await response.text();
                            if (xml && (xml.includes('<transcript>') || xml.includes('<text'))) {
                                transcriptItems = parseTranscriptXml(xml);
                                console.log(`Method 2b: Got transcript in ${lang} via proxy`);
                                break;
                            }
                        }
                    } catch (error) {
                        // Try next proxy
                    }
                }
            }
        }

        if (!transcriptItems || transcriptItems.length === 0) {
            throw new Error('No transcript available for this video. The video may not have captions enabled, or captions cannot be accessed due to restrictions.');
        }

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

    // Try multiple XML patterns
    // Pattern 1: <text start="..." dur="...">text</text>
    let textMatches = xml.matchAll(/<text start="([^"]+)" dur="([^"]+)"[^>]*>([^<]*)<\/text>/g);
    
    for (const match of textMatches) {
        items.push({
            start: parseFloat(match[1]),
            duration: parseFloat(match[2]),
            text: match[3]
        });
    }
    
    // Pattern 2: <text start="..." d="...">text</text> (alternative format)
    if (items.length === 0) {
        textMatches = xml.matchAll(/<text start="([^"]+)" d="([^"]+)"[^>]*>([^<]*)<\/text>/g);
        
        for (const match of textMatches) {
            items.push({
                start: parseFloat(match[1]),
                duration: parseFloat(match[2]),
                text: match[3]
            });
        }
    }
    
    // Pattern 3: <text t="..." d="...">text</text>
    if (items.length === 0) {
        textMatches = xml.matchAll(/<text t="([^"]+)" d="([^"]+)"[^>]*>([^<]*)<\/text>/g);
        
        for (const match of textMatches) {
            items.push({
                start: parseFloat(match[1]) / 1000, // Convert ms to seconds
                duration: parseFloat(match[2]) / 1000,
                text: match[3]
            });
        }
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
