import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
import moment from 'moment';
import { ConversionResult } from '../types';

/**
 * Fetches the HTML content of a URL using a CORS proxy to bypass browser restrictions.
 */
const fetchHtml = async (url: string): Promise<string> => {
  // Using allorigins.win as a free CORS proxy for this client-side demo.
  // In a production environment, you should set up your own proxy server.
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
  
  const response = await fetch(proxyUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch URL. Status: ${response.status}`);
  }
  
  const data = await response.json();
  if (!data.contents) {
    throw new Error('No content received from proxy.');
  }
  
  return data.contents;
};

/**
 * Converts HTML string to a Document object.
 */
const parseHtml = (html: string, url: string): Document => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Inject base tag to handle relative links correctly
  const base = doc.createElement('base');
  base.href = url;
  doc.head.appendChild(base);
  
  return doc;
};

/**
 * Main function to process the URL and return Markdown.
 */
export const convertUrlToMarkdown = async (url: string): Promise<ConversionResult> => {
  try {
    // 1. Fetch
    const html = await fetchHtml(url);
    
    // 2. Parse DOM
    const doc = parseHtml(html, url);
    
    // 3. Simplify with Readability
    // We clone the document because Readability mutates the DOM
    const reader = new Readability(doc.cloneNode(true) as Document);
    const article = reader.parse();
    
    if (!article) {
      throw new Error('Readability failed to parse the article content.');
    }

    // 4. Convert to Markdown with Turndown
    const turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      hr: '---',
      bulletListMarker: '-',
    });
    
    // Custom rule to improve link handling if needed, or stripping clutter
    turndownService.addRule('remove-scripts', {
      filter: ['script', 'style', 'noscript'],
      replacement: () => ''
    });

    const markdownBody = turndownService.turndown(article.content);

    // 5. Format Metadata
    const dateStr = moment().format('YYYY-MM-DD HH:mm:ss');
    const header = `---
title: "${article.title}"
source: ${url}
author: ${article.byline || 'Unknown'}
date: ${dateStr}
---

# ${article.title}

`;

    const fullMarkdown = header + markdownBody;

    return {
      markdown: fullMarkdown,
      title: article.title,
      url: url,
      timestamp: dateStr
    };

  } catch (error) {
    console.error("Conversion error:", error);
    throw error;
  }
};