import { YoutubeTranscript } from 'youtube-transcript';
import moment from 'moment';
import { ConversionResult } from '../types';

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

    // Fetch transcript
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);

    if (!transcriptItems || transcriptItems.length === 0) {
      throw new Error('No transcript available for this video.');
    }

    // Build markdown content
    let transcriptText = '';
    
    // Group by time intervals (optional, for better readability)
    transcriptItems.forEach((item: any) => {
      const timestamp = formatTimestamp(item.offset / 1000);
      transcriptText += `**[${timestamp}]** ${item.text}\n\n`;
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
