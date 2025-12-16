// Test YouTube transcript fetching
// Test with Google I/O video that definitely has captions
const videoId = 'I3BVkCpG9No'; // Change this to test different videos

async function test() {
    try {
        const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`);

        console.log('Fetching video page...');
        const response = await fetch(proxyUrl);
        const html = await response.text();

        console.log('HTML Length:', html.length);

        // Try to extract ytInitialPlayerResponse
        const startMarker = 'var ytInitialPlayerResponse = ';
        const startIdx = html.indexOf(startMarker);

        if (startIdx !== -1) {
            console.log('\nFound ytInitialPlayerResponse at position:', startIdx);

            // Find the JSON object - count braces to find the end
            const jsonStart = startIdx + startMarker.length;
            let braceCount = 0;
            let jsonEnd = jsonStart;
            let inString = false;
            let escapeNext = false;

            for (let i = jsonStart; i < html.length; i++) {
                const char = html[i];

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

            const jsonStr = html.substring(jsonStart, jsonEnd);
            console.log('JSON string length:', jsonStr.length);

            try {
                const playerResponse = JSON.parse(jsonStr);
                console.log('Parsed successfully!');

                // Check for captions
                const hasCaptions = playerResponse?.captions;
                console.log('Has captions object:', !!hasCaptions);

                if (hasCaptions) {
                    const captionTracks = playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks;
                    console.log('Caption tracks:', captionTracks);

                    if (captionTracks && captionTracks.length > 0) {
                        console.log('\n✓ SUCCESS - Found', captionTracks.length, 'caption tracks!');
                        console.log('First track:', captionTracks[0]);
                    } else {
                        console.log('\n✗ No caption tracks in player response');
                    }
                } else {
                    console.log('\n✗ No captions object in player response');
                    console.log('This video does not have subtitles/captions enabled');
                }

            } catch (e) {
                console.error('Failed to parse:', e.message);
            }
        } else {
            console.log('Could not find ytInitialPlayerResponse');
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

test();
