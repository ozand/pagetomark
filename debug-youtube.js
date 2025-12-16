// Debug script for YouTube transcript extraction
// Open browser console (F12) and paste this to test

const videoId = '0lJKucu6HJc';
const proxyUrl = (targetUrl) => 'https://corsproxy.io/?' + encodeURIComponent(targetUrl);

async function testYouTubeTranscript() {
    try {
        console.log('Fetching video page...');
        const videoPageRes = await fetch(proxyUrl(`https://www.youtube.com/watch?v=${videoId}`));
        const videoPageHtml = await videoPageRes.text();

        console.log('HTML length:', videoPageHtml.length);
        console.log('Has ytInitialPlayerResponse:', videoPageHtml.includes('ytInitialPlayerResponse'));
        console.log('Has captionTracks:', videoPageHtml.includes('captionTracks'));

        // Try to find captionTracks
        const captionMatch = videoPageHtml.match(/"captionTracks":\s*(\[[\s\S]*?\])/);

        if (captionMatch) {
            console.log('Found captionTracks with first pattern!');
            const tracks = JSON.parse(captionMatch[1]);
            console.log('Caption tracks:', tracks);

            if (tracks.length > 0) {
                const track = tracks[0];
                console.log('Using track:', track);
                console.log('Caption URL:', track.baseUrl);

                // Fetch the caption
                const captionRes = await fetch(proxyUrl(track.baseUrl));
                const captionXml = await captionRes.text();
                console.log('Caption XML length:', captionXml.length);
                console.log('Caption XML preview:', captionXml.substring(0, 500));

                // Parse XML
                const parser = new DOMParser();
                const doc = parser.parseFromString(captionXml, "text/xml");
                const texts = doc.getElementsByTagName('text');
                console.log('Found text elements:', texts.length);

                if (texts.length > 0) {
                    console.log('First text element:', {
                        text: texts[0].textContent,
                        start: texts[0].getAttribute('start'),
                        dur: texts[0].getAttribute('dur')
                    });
                }

                return 'SUCCESS!';
            }
        } else {
            console.log('captionTracks not found with first pattern, trying alternatives...');

            // Try to find ytInitialPlayerResponse
            const patterns = [
                /var ytInitialPlayerResponse\s*=\s*(\{.+?\});/s,
                /"playerResponse"\s*:\s*(\{.+?\})/s,
                /ytInitialPlayerResponse\s*=\s*(\{[^;]+\});/s
            ];

            for (const pattern of patterns) {
                console.log('Trying pattern:', pattern.toString());
                const match = videoPageHtml.match(pattern);

                if (match) {
                    console.log('Found match with pattern:', pattern.toString());
                    try {
                        const playerResponse = JSON.parse(match[1]);
                        console.log('Player response parsed successfully');

                        const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
                        if (captions) {
                            console.log('Found captions in player response:', captions);
                            return 'SUCCESS!';
                        } else {
                            console.log('No captions in player response');
                        }
                    } catch (e) {
                        console.error('Failed to parse player response:', e);
                    }
                } else {
                    console.log('No match with this pattern');
                }
            }

            // Try direct timedtext API
            console.log('Trying direct timedtext API...');
            const languages = ['en', 'en-US', 'en-GB', 'a.en', 'ru'];

            for (const lang of languages) {
                const timedtextUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}`;
                console.log(`Trying ${lang}:`, timedtextUrl);

                try {
                    const response = await fetch(proxyUrl(timedtextUrl));
                    console.log(`Response status for ${lang}:`, response.status);

                    if (response.ok) {
                        const xml = await response.text();
                        console.log(`XML length for ${lang}:`, xml.length);

                        if (xml && xml.includes('<text')) {
                            console.log(`SUCCESS with ${lang}!`);
                            console.log('XML preview:', xml.substring(0, 500));
                            return 'SUCCESS!';
                        }
                    }
                } catch (e) {
                    console.error(`Failed for ${lang}:`, e);
                }
            }
        }

        return 'No captions found';

    } catch (error) {
        console.error('Error:', error);
        return 'ERROR';
    }
}

// Run the test
testYouTubeTranscript().then(result => console.log('Final result:', result));
