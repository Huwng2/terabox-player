class TeraboxPlayer {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupElements();
    }

    setupElements() {
        this.urlInput = document.getElementById('teraboxUrl');
        this.playBtn = document.getElementById('playBtn');
        this.loading = document.getElementById('loading');
        this.errorMessage = document.getElementById('errorMessage');
        this.errorText = document.getElementById('errorText');
        this.videoSection = document.getElementById('videoSection');
        this.videoPlayer = document.getElementById('videoPlayer');
        this.videoTitle = document.getElementById('videoTitle');
        this.videoDescription = document.getElementById('videoDescription');
    }

    setupEventListeners() {
        document.getElementById('playBtn').addEventListener('click', () => {
            this.handlePlayVideo();
        });

        document.getElementById('teraboxUrl').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handlePlayVideo();
            }
        });

        document.getElementById('teraboxUrl').addEventListener('input', () => {
            this.hideMessages();
        });
    }

    async handlePlayVideo() {
        const url = this.urlInput.value.trim();
        
        if (!url) {
            this.showError('Please enter a Terabox URL');
            return;
        }

        console.log('Processing URL:', url);

        if (!this.isValidTeraboxUrl(url)) {
            this.showError(`Please enter a valid Terabox URL. 
            
Examples:
• https://terabox.com/s/1abc123def
• https://www.terabox.app/s/1xyz789abc
• https://www.terabox.club/wap/share/filelist?surl=abc123
• https://1024tera.com/s/1qwe456rty

Your URL: ${url}`);
            return;
        }

        this.showLoading(true);
        this.hideMessages();

        try {
            const videoData = await this.extractVideoUrl(url);
            await this.playVideo(videoData);
        } catch (error) {
            console.error('Error extracting video:', error);
            let errorMessage = error.message || 'Failed to extract video URL. Please try again.';
            
            // Provide more specific error messages
            if (error.message.includes('CORS')) {
                errorMessage = 'Network error: Unable to access Terabox. Please try again or use a different URL.';
            } else if (error.message.includes('404') || error.message.includes('not found')) {
                errorMessage = 'Video not found. Please check if the URL is correct and the file is still available.';
            } else if (error.message.includes('private') || error.message.includes('access')) {
                errorMessage = 'This video appears to be private or requires authentication. Please try a public URL.';
            }
            
            this.showError(errorMessage);
        } finally {
            this.showLoading(false);
        }
    }

    isValidTeraboxUrl(url) {
        // More comprehensive domain patterns for Terabox
        const teraboxPatterns = [
            // Main domains
            /^https?:\/\/(www\.)?terabox\.(com|app|club)/i,
            /^https?:\/\/(www\.)?1024tera\.com/i,
            /^https?:\/\/(www\.)?mirrobox\.com/i,
            /^https?:\/\/(www\.)?nephobox\.com/i,
            /^https?:\/\/(www\.)?teraboxapp\.com/i,
            /^https?:\/\/(www\.)?freeterabox\.com/i,
            /^https?:\/\/(www\.)?4funbox\.(com|co)/i,
            /^https?:\/\/(www\.)?momerybox\.com/i,
            /^https?:\/\/(www\.)?tibibox\.com/i,
            // Additional patterns
            /^https?:\/\/.*terabox/i,
            /^https?:\/\/.*\.terabox/i
        ];

        // Basic URL format check
        if (!url || typeof url !== 'string') {
            return false;
        }

        // Check if it looks like a URL
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            // Try to add https:// if missing
            url = 'https://' + url;
        }

        try {
            const urlObj = new URL(url);
            
            // Check against patterns
            const isValidDomain = teraboxPatterns.some(pattern => pattern.test(url));
            
            // Additional check for common Terabox URL structures
            const hasTeraboxStructure = url.includes('/s/') || 
                                      url.includes('surl=') || 
                                      url.includes('/file/') ||
                                      url.includes('/wap/share/filelist') ||
                                      url.includes('/wap/share/') ||
                                      url.includes('terabox') ||
                                      url.includes('tera');
            
            console.log('URL validation:', {
                url: url,
                hostname: urlObj.hostname,
                isValidDomain: isValidDomain,
                hasTeraboxStructure: hasTeraboxStructure
            });
            
            return isValidDomain || hasTeraboxStructure;
        } catch (error) {
            console.error('URL validation error:', error);
            // Fallback: check if URL contains terabox-related keywords
            return /terabox\.club|terabox\.com|terabox\.app|1024tera|mirrobox|nephobox|freeterabox|4funbox|momerybox|tibibox|terabox/i.test(url);
        }
    }

    async extractVideoUrl(teraboxUrl) {
        console.log('🚀 Starting extraction for URL:', teraboxUrl);
        
        // For terabox.club, try the most reliable approach first
        if (teraboxUrl.includes('terabox.club')) {
            return await this.extractTeraboxClubVideo(teraboxUrl);
        }
        
        // For other terabox domains, try general methods
        const methods = [
            () => this.extractUsingWorkingAPI(teraboxUrl),
            () => this.extractUsingIframeMethod(teraboxUrl),
            () => this.extractUsingDirectDownload(teraboxUrl)
        ];

        let lastError = null;

        for (let i = 0; i < methods.length; i++) {
            try {
                console.log(`🔄 Trying extraction method ${i + 1}...`);
                const result = await methods[i]();
                if (result && result.videoUrl) {
                    console.log(`✅ Method ${i + 1} succeeded!`, result);
                    return result;
                }
            } catch (error) {
                lastError = error;
                console.error(`❌ Extraction method ${i + 1} failed:`, error.message);
            }
        }

        // If all methods fail, provide helpful error message
        const errorMessage = `❌ All extraction methods failed for this URL. 

🔧 What you can try:
1. Check if the URL is correct and the file still exists
2. Try a different Terabox URL format
3. The video might be private or require authentication
4. Some videos may not be supported due to Terabox restrictions

🌐 Original URL: ${teraboxUrl}
📋 Extracted ID: ${this.extractFileId(teraboxUrl) || 'Not found'}

💡 Last error: ${lastError?.message || 'Unknown error'}`;

        throw new Error(errorMessage);
    }

    async extractTeraboxClubVideo(teraboxUrl) {
        console.log('🎯 Specialized extraction for terabox.club...');
        
        const fileId = this.extractFileId(teraboxUrl);
        if (!fileId) {
            throw new Error('Could not extract file ID from terabox.club URL');
        }
        
        console.log('📋 File ID:', fileId);
        
        // Try multiple approaches for terabox.club
        const approaches = [
            () => this.tryTeraboxClubAPI(fileId),
            () => this.tryTeraboxClubEmbed(fileId),
            () => this.tryTeraboxClubDirect(fileId, teraboxUrl),
            () => this.tryPublicDownloaderAPI(teraboxUrl)
        ];
        
        for (let i = 0; i < approaches.length; i++) {
            try {
                console.log(`🔧 Trying terabox.club approach ${i + 1}...`);
                const result = await approaches[i]();
                if (result && result.videoUrl) {
                    console.log(`✅ Terabox.club approach ${i + 1} succeeded!`);
                    return result;
                }
            } catch (error) {
                console.warn(`❌ Terabox.club approach ${i + 1} failed:`, error.message);
            }
        }
        
        throw new Error('All terabox.club extraction approaches failed');
    }

    async tryTeraboxClubAPI(fileId) {
        console.log('🌐 Trying terabox.club API...');
        
        // Try the most common API endpoints
        const apiUrls = [
            `https://www.terabox.club/api/v1/file/info?surl=${fileId}`,
            `https://terabox.club/api/share/info?surl=${fileId}`,
            `https://www.terabox.club/share/link?surl=${fileId}`
        ];
        
        for (const apiUrl of apiUrls) {
            try {
                console.log('📡 API request to:', apiUrl);
                
                // Try direct API call first
                let response = await fetch(apiUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Referer': 'https://www.terabox.club/',
                        'Accept': 'application/json, text/html, */*'
                    }
                });
                
                // If direct call fails, try with CORS proxy
                if (!response.ok) {
                    const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(apiUrl);
                    console.log('📡 Trying with proxy:', proxyUrl);
                    response = await fetch(proxyUrl);
                }
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('📋 API response:', data);
                    
                    // Look for video URL in various response formats
                    const videoUrl = this.extractVideoUrlFromData(data);
                    if (videoUrl) {
                        console.log('🎬 Found video URL:', videoUrl);
                        return {
                            videoUrl: videoUrl,
                            title: data.filename || data.server_filename || 'Terabox Video',
                            size: data.size || 0
                        };
                    }
                }
            } catch (error) {
                console.warn('API call failed:', apiUrl, error.message);
            }
        }
        
        throw new Error('No working API endpoint found');
    }

    async tryTeraboxClubEmbed(fileId) {
        console.log('📺 Trying embed method...');
        
        // Create an iframe-based approach
        const embedUrl = `https://www.terabox.club/embed/${fileId}`;
        console.log('🔗 Embed URL:', embedUrl);
        
        try {
            const response = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(embedUrl));
            if (response.ok) {
                const html = await response.text();
                console.log('📄 Embed HTML length:', html.length);
                
                // Look for video sources in embed HTML
                const videoSources = this.findVideoSourcesInHTML(html);
                if (videoSources.length > 0) {
                    console.log('🎬 Found video sources in embed:', videoSources);
                    return {
                        videoUrl: videoSources[0],
                        title: 'Terabox Video (Embed)',
                        size: 0
                    };
                }
            }
        } catch (error) {
            console.warn('Embed method failed:', error.message);
        }
        
        throw new Error('Embed method found no video sources');
    }

    async tryTeraboxClubDirect(fileId, originalUrl) {
        console.log('🎯 Trying direct download method...');
        
        // Try to construct various direct download URLs
        const directUrls = [
            `https://d.terabox.club/file/d/${fileId}`,
            `https://dlink.terabox.club/download/${fileId}`,
            `https://www.terabox.club/share/download?surl=${fileId}`,
            `https://terabox.club/d/${fileId}`
        ];
        
        for (const directUrl of directUrls) {
            try {
                console.log('🔗 Testing direct URL:', directUrl);
                
                const response = await fetch(directUrl, { 
                    method: 'HEAD',
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });
                
                console.log('📡 Direct URL response:', response.status, response.headers.get('content-type'));
                
                if (response.ok && this.isVideoContentType(response.headers.get('content-type'))) {
                    console.log('✅ Found working direct video URL!');
                    return {
                        videoUrl: directUrl,
                        title: 'Terabox Video (Direct)',
                        size: parseInt(response.headers.get('content-length')) || 0
                    };
                }
                
                // If it's a redirect, follow it
                if (response.status >= 300 && response.status < 400) {
                    const location = response.headers.get('location');
                    if (location && this.isVideoUrl(location)) {
                        console.log('🔗 Following redirect to:', location);
                        return {
                            videoUrl: location,
                            title: 'Terabox Video (Redirect)',
                            size: 0
                        };
                    }
                }
                
            } catch (error) {
                console.warn('Direct URL test failed:', directUrl, error.message);
            }
        }
        
        throw new Error('No working direct download URL found');
    }

    extractVideoUrlFromData(data) {
        // Look for video URLs in various data formats
        const urlFields = ['dlink', 'download_url', 'file_url', 'url', 'direct_url', 'stream_url'];
        
        for (const field of urlFields) {
            if (data[field] && this.isVideoUrl(data[field])) {
                return data[field];
            }
        }
        
        // Look in nested objects
        if (data.file_list && data.file_list.length > 0) {
            return this.extractVideoUrlFromData(data.file_list[0]);
        }
        
        if (data.list && data.list.length > 0) {
            return this.extractVideoUrlFromData(data.list[0]);
        }
        
        return null;
    }

    findVideoSourcesInHTML(html) {
        const videoSources = [];
        
        // Look for video tags and their sources
        const patterns = [
            /<video[^>]+src="([^"]+)"/gi,
            /<source[^>]+src="([^"]+)"/gi,
            /https?:\/\/[^"\s]+\.mp4[^"\s]*/gi,
            /https?:\/\/[^"\s]+\.m3u8[^"\s]*/gi,
            /https?:\/\/d\d*\.terabox\.com\/[^"\s]+/gi
        ];
        
        for (const pattern of patterns) {
            const matches = [...html.matchAll(pattern)];
            for (const match of matches) {
                const url = match[1] || match[0];
                if (this.isVideoUrl(url)) {
                    videoSources.push(url);
                }
            }
        }
        
        return [...new Set(videoSources)]; // Remove duplicates
    }

    isVideoContentType(contentType) {
        if (!contentType) return false;
        return contentType.includes('video/') || 
               contentType.includes('application/octet-stream') ||
               contentType.includes('binary/octet-stream');
    }

    isVideoUrl(url) {
        if (!url || typeof url !== 'string') return false;
        return url.includes('.mp4') || 
               url.includes('.m3u8') || 
               url.includes('d.terabox.com') ||
               url.includes('video') ||
                               url.match(/\.(mp4|m3u8|avi|mkv|mov|webm)(\?|$)/i);
    }

    async extractUsingWorkingAPI(teraboxUrl) {
        console.log('🔧 Trying working API method...');
        
        // For non-terabox.club URLs, try general APIs
        const fileId = this.extractFileId(teraboxUrl);
        if (!fileId) {
            throw new Error('Could not extract file ID for API method');
        }
        
        const apiEndpoints = [
            `https://www.terabox.com/api/url/info?url=${encodeURIComponent(teraboxUrl)}`,
            `https://terabox.app/api/download?surl=${fileId}`,
            `https://1024tera.com/api/share?surl=${fileId}`
        ];
        
        for (const endpoint of apiEndpoints) {
            try {
                console.log('📡 Trying API:', endpoint);
                const response = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(endpoint));
                
                if (response.ok) {
                    const data = await response.json();
                    const videoUrl = this.extractVideoUrlFromData(data);
                    if (videoUrl) {
                        return {
                            videoUrl: videoUrl,
                            title: data.server_filename || 'Terabox Video',
                            size: data.size || 0
                        };
                    }
                }
            } catch (error) {
                console.warn('API endpoint failed:', endpoint, error.message);
            }
        }
        
        throw new Error('No working API found');
    }

    async extractUsingIframeMethod(teraboxUrl) {
        console.log('📺 Trying iframe embedding method...');
        
        // This method creates an invisible iframe to try to extract video info
        return new Promise((resolve, reject) => {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = teraboxUrl;
            
            const timeout = setTimeout(() => {
                document.body.removeChild(iframe);
                reject(new Error('Iframe method timed out'));
            }, 10000);
            
            iframe.onload = () => {
                try {
                    // Try to access iframe content (will fail due to CORS, but we'll try)
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    if (iframeDoc) {
                        const videoSources = this.findVideoSourcesInHTML(iframeDoc.documentElement.outerHTML);
                        if (videoSources.length > 0) {
                            clearTimeout(timeout);
                            document.body.removeChild(iframe);
                            resolve({
                                videoUrl: videoSources[0],
                                title: 'Terabox Video (Iframe)',
                                size: 0
                            });
                            return;
                        }
                    }
                } catch (error) {
                    console.log('Iframe access blocked by CORS (expected)');
                }
                
                clearTimeout(timeout);
                document.body.removeChild(iframe);
                reject(new Error('No video sources found in iframe'));
            };
            
            iframe.onerror = () => {
                clearTimeout(timeout);
                document.body.removeChild(iframe);
                reject(new Error('Iframe failed to load'));
            };
            
            document.body.appendChild(iframe);
        });
    }

    async extractUsingDirectDownload(teraboxUrl) {
        console.log('⬇️ Trying direct download construction...');
        
        const fileId = this.extractFileId(teraboxUrl);
        if (!fileId) {
            throw new Error('Could not extract file ID for direct download');
        }
        
        // Try various direct download URL patterns
        const patterns = [
            `https://d.terabox.com/file/d/${fileId}`,
            `https://dlink.terabox.com/download/${fileId}`,
            `https://terabox.com/api/download?fid=${fileId}`,
            `https://www.terabox.com/share/download?surl=${fileId}`
        ];
        
        for (const directUrl of patterns) {
            try {
                console.log('🔗 Testing direct pattern:', directUrl);
                
                const response = await fetch(directUrl, { method: 'HEAD' });
                if (response.ok && this.isVideoContentType(response.headers.get('content-type'))) {
                    return {
                        videoUrl: directUrl,
                        title: 'Terabox Video (Direct)',
                        size: parseInt(response.headers.get('content-length')) || 0
                    };
                }
            } catch (error) {
                console.warn('Direct pattern failed:', directUrl, error.message);
            }
        }
        
        throw new Error('No working direct download pattern found');
    }

    async tryPublicDownloaderAPI(teraboxUrl) {
        console.log('🌍 Trying public downloader APIs as final fallback...');
        
        // Try known working public Terabox downloader services
        const downloaderServices = [
            {
                name: 'TeraboxDownloader.com',
                url: 'https://api.teraboxdownloader.com/api/get-info',
                method: 'POST',
                body: { link: teraboxUrl }
            },
            {
                name: 'SaveFrom.net',
                url: 'https://worker-savefrom-net.terabox-downloader.workers.dev/api/terabox',
                method: 'POST',
                body: { url: teraboxUrl }
            },
            {
                name: 'Generic Downloader',
                url: 'https://api.download-video.com/terabox',
                method: 'POST',
                body: { url: teraboxUrl, quality: 'high' }
            }
        ];
        
        for (const service of downloaderServices) {
            try {
                console.log(`🔧 Trying ${service.name}...`);
                
                const response = await fetch(service.url, {
                    method: service.method,
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(service.body)
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log(`📋 ${service.name} response:`, data);
                    
                    // Different services have different response formats
                    let videoUrl = null;
                    let title = 'Terabox Video';
                    let size = 0;
                    
                    if (data.status === 'success' || data.success) {
                        videoUrl = data.download_url || data.url || data.dlink || data.direct_url;
                        title = data.title || data.filename || data.server_filename || title;
                        size = data.size || data.file_size || 0;
                    } else if (data.download_url || data.url || data.dlink) {
                        videoUrl = data.download_url || data.url || data.dlink;
                        title = data.title || data.filename || title;
                        size = data.size || 0;
                    }
                    
                    if (videoUrl && this.isVideoUrl(videoUrl)) {
                        console.log(`✅ ${service.name} returned video URL:`, videoUrl);
                        
                        // Verify the URL is accessible
                        try {
                            const testResponse = await fetch(videoUrl, { method: 'HEAD' });
                            if (testResponse.ok || testResponse.status === 206) {
                                console.log(`✅ ${service.name} video URL verified as accessible`);
                                return {
                                    videoUrl: videoUrl,
                                    title: title,
                                    size: size
                                };
                            }
                        } catch (testError) {
                            console.warn(`❌ ${service.name} URL verification failed:`, testError.message);
                        }
                    }
                }
                
            } catch (error) {
                console.warn(`❌ ${service.name} failed:`, error.message);
            }
        }
        
        throw new Error('All public downloader APIs failed');
    }

    async testCorsProxies() {
        console.log('🧪 Testing CORS proxies...');
        const testProxies = [
            'https://api.allorigins.win/raw?url=',
            'https://corsproxy.io/?'
        ];
        
        for (const proxy of testProxies) {
            try {
                const testResponse = await fetch(proxy + encodeURIComponent('https://httpbin.org/json'), {
                    method: 'GET',
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });
                
                if (testResponse.ok) {
                    console.log('✅ Working CORS proxy found:', proxy);
                    this.workingProxy = proxy;
                    return;
                }
            } catch (error) {
                console.warn('❌ CORS proxy failed:', proxy);
            }
        }
        
        console.warn('⚠️ No working CORS proxy found, will try direct methods');
        this.workingProxy = null;
    }

    async extractUsingSimplifiedMethod(teraboxUrl) {
        console.log('🔧 Trying simplified extraction for actual video URL...');
        
        const fileId = this.extractFileId(teraboxUrl);
        if (!fileId) {
            throw new Error('Could not extract file ID from URL');
        }
        
        console.log('📋 Extracted file ID:', fileId);
        
        // For terabox.club URLs, try to get the actual video stream URL
        if (teraboxUrl.includes('terabox.club')) {
            try {
                // Try to access the share page and extract real video URL
                const shareUrl = `https://www.terabox.club/s/${fileId}`;
                console.log('🔗 Accessing share URL to extract video:', shareUrl);
                
                if (this.workingProxy) {
                    const response = await fetch(this.workingProxy + encodeURIComponent(shareUrl), {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                        }
                    });
                    
                    if (response.ok) {
                        const html = await response.text();
                        console.log('📄 Got share page HTML, length:', html.length);
                        
                        // Look for actual video file URLs in the HTML
                        const videoPatterns = [
                            /https?:\/\/[^"\s]+\.mp4[^"\s]*/gi,
                            /https?:\/\/[^"\s]+\.m3u8[^"\s]*/gi,
                            /https?:\/\/d\d*\.terabox\.com\/[^"\s]+/gi,
                            /https?:\/\/.*\.terabox\.com\/[^"\s]+\.(mp4|m3u8|mkv|avi)[^"\s]*/gi,
                            /"dlink"\s*:\s*"([^"]+)"/gi,
                            /"download_url"\s*:\s*"([^"]+)"/gi
                        ];
                        
                        for (const pattern of videoPatterns) {
                            const matches = html.match(pattern);
                            if (matches && matches.length > 0) {
                                for (const match of matches) {
                                    const videoUrl = match.replace(/^"/, '').replace(/"$/, '').replace(/\\"/g, '"').replace(/\\\//g, '/');
                                    if (videoUrl.includes('.mp4') || videoUrl.includes('.m3u8') || videoUrl.includes('d.terabox.com')) {
                                        console.log('🎬 Found potential video stream URL:', videoUrl);
                                        
                                        // Test if the video URL is accessible
                                        try {
                                            const testResponse = await fetch(videoUrl, { method: 'HEAD' });
                                            if (testResponse.ok) {
                                                console.log('✅ Video URL is accessible!');
                                                return {
                                                    videoUrl: videoUrl,
                                                    title: 'Terabox Video',
                                                    size: parseInt(testResponse.headers.get('content-length')) || 0
                                                };
                                            }
                                        } catch (e) {
                                            console.log('❌ Video URL test failed:', e.message);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                
                throw new Error('Could not extract video stream URL from terabox.club');
                
            } catch (error) {
                console.error('❌ Terabox.club extraction failed:', error.message);
                throw error;
            }
        }
        
        throw new Error('Simplified method only works for terabox.club currently');
    }

    async extractUsingDirectAccess(teraboxUrl) {
        console.log('🎯 Trying direct access method with API endpoints...');
        
        const fileId = this.extractFileId(teraboxUrl);
        if (!fileId) {
            throw new Error('Could not extract file ID for API access');
        }
        
        // Try different API endpoints that might return video URLs directly
        const apiEndpoints = [
            `https://www.terabox.club/api/v1/share/link?surl=${fileId}`,
            `https://www.terabox.club/share/getdownload?surl=${fileId}`,
            `https://terabox.club/api/download?surl=${fileId}`,
            `https://www.terabox.com/api/download?surl=${fileId}`,
            // Try the original URL as fallback
            teraboxUrl
        ];
        
        for (const endpoint of apiEndpoints) {
            try {
                console.log('📡 Trying API endpoint:', endpoint);
                
                const response = await fetch(endpoint, {
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'application/json, text/html, */*',
                        'Referer': 'https://www.terabox.club/',
                        'Origin': 'https://www.terabox.club'
                    }
                });
                
                console.log('📡 Response status:', response.status, endpoint);
                
                if (response.ok) {
                    const contentType = response.headers.get('content-type') || '';
                    let data;
                    
                    if (contentType.includes('application/json')) {
                        data = await response.json();
                        console.log('📋 JSON Response:', data);
                        
                        // Look for video URL in JSON response
                        if (data.dlink || data.download_url || data.url) {
                            const videoUrl = data.dlink || data.download_url || data.url;
                            console.log('🎬 Found video URL in JSON:', videoUrl);
                            return {
                                videoUrl: videoUrl,
                                title: data.server_filename || data.filename || 'Terabox Video',
                                size: data.size || 0
                            };
                        }
                    } else {
                        data = await response.text();
                        console.log('📄 HTML/Text response length:', data.length);
                        
                        // Enhanced patterns for finding video URLs
                        const videoPatterns = [
                            /"dlink"\s*:\s*"([^"]+)"/gi,
                            /"download_url"\s*:\s*"([^"]+)"/gi,
                            /"file_url"\s*:\s*"([^"]+)"/gi,
                            /https?:\/\/d\d*\.terabox\.com\/[^"\s<>]+/gi,
                            /https?:\/\/[^"\s<>]+\.mp4[^"\s<>]*/gi,
                            /https?:\/\/[^"\s<>]+\.m3u8[^"\s<>]*/gi,
                            /window\.yunData\s*=\s*({[^}]+dlink[^}]+})/gi,
                            /var\s+yunData\s*=\s*({[^}]+dlink[^}]+})/gi
                        ];
                        
                        for (const pattern of videoPatterns) {
                            const matches = [...data.matchAll(pattern)];
                            if (matches.length > 0) {
                                for (const match of matches) {
                                    let videoUrl = match[1] || match[0];
                                    
                                    // Clean up the URL
                                    videoUrl = videoUrl.replace(/\\"/g, '"').replace(/\\\//g, '/').replace(/^"/, '').replace(/"$/, '');
                                    
                                    if (videoUrl.includes('d.terabox.com') || videoUrl.includes('.mp4') || videoUrl.includes('.m3u8')) {
                                        console.log('🎬 Found potential video URL:', videoUrl);
                                        
                                        // Test if URL is accessible
                                        try {
                                            const testResponse = await fetch(videoUrl, { method: 'HEAD' });
                                            if (testResponse.ok || testResponse.status === 206) {  // 206 = partial content, also good
                                                console.log('✅ Video URL verified as accessible');
                                                return {
                                                    videoUrl: videoUrl,
                                                    title: 'Terabox Video',
                                                    size: parseInt(testResponse.headers.get('content-length')) || 0
                                                };
                                            }
                                        } catch (testError) {
                                            console.log('❌ Video URL test failed:', testError.message);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                
            } catch (error) {
                console.error('❌ API endpoint failed:', endpoint, error.message);
                continue;
            }
        }
        
        throw new Error('No accessible video URL found via direct access methods');
    }

    async extractUsingWorkingProxy(teraboxUrl) {
        console.log('🌐 Trying working proxy with enhanced extraction...');
        
        // First try known working downloader APIs
        const downloaderAPIs = [
            {
                name: 'TeraboxDownloader',
                url: 'https://teraboxdownloader.online/api/get-download',
                method: 'POST',
                body: { url: teraboxUrl }
            },
            {
                name: 'SaveFrom',
                url: 'https://worker-savefrom.teraboxdownloader.workers.dev/',
                method: 'POST', 
                body: { url: teraboxUrl }
            }
        ];
        
        for (const api of downloaderAPIs) {
            try {
                console.log(`🔧 Trying ${api.name} API...`);
                
                const response = await fetch(api.url, {
                    method: api.method,
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Origin': 'https://teraboxdownloader.online',
                        'Referer': 'https://teraboxdownloader.online/'
                    },
                    body: JSON.stringify(api.body)
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log(`📋 ${api.name} response:`, data);
                    
                    if (data.success && data.download_url) {
                        console.log(`✅ ${api.name} returned video URL:`, data.download_url);
                        return {
                            videoUrl: data.download_url,
                            title: data.title || data.filename || 'Terabox Video',
                            size: data.size || 0
                        };
                    }
                    
                    if (data.dlink || data.url) {
                        const videoUrl = data.dlink || data.url;
                        console.log(`✅ ${api.name} returned video URL:`, videoUrl);
                        return {
                            videoUrl: videoUrl,
                            title: data.server_filename || data.filename || 'Terabox Video',
                            size: data.size || 0
                        };
                    }
                }
                
            } catch (error) {
                console.warn(`❌ ${api.name} API failed:`, error.message);
                continue;
            }
        }
        
        // Fallback to proxy method
        if (!this.workingProxy) {
            throw new Error('No working CORS proxy available and API methods failed');
        }
        
        console.log('🌐 Using working proxy as fallback:', this.workingProxy);
        
        try {
            const response = await fetch(this.workingProxy + encodeURIComponent(teraboxUrl), {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Proxy response error: ${response.status}`);
            }
            
            const html = await response.text();
            console.log('📄 Proxy got HTML, length:', html.length);
            
            // Enhanced pattern matching for video URLs
            const patterns = [
                // JSON patterns
                /"dlink"\s*:\s*"([^"]+)"/gi,
                /"download_url"\s*:\s*"([^"]+)"/gi,
                /"file_url"\s*:\s*"([^"]+)"/gi,
                // Direct URL patterns
                /https?:\/\/d\d*\.terabox\.com\/[^"\s<>]+/gi,
                /https?:\/\/[^"\s<>]+\.mp4(\?[^"\s<>]*)?/gi,
                /https?:\/\/[^"\s<>]+\.m3u8(\?[^"\s<>]*)?/gi,
                // JavaScript variable patterns
                /window\.yunData\s*=\s*.*?"dlink"\s*:\s*"([^"]+)"/gi,
                /var\s+yunData\s*=\s*.*?"dlink"\s*:\s*"([^"]+)"/gi
            ];
            
            for (const pattern of patterns) {
                const matches = [...html.matchAll(pattern)];
                if (matches.length > 0) {
                    for (const match of matches) {
                        let videoUrl = match[1] || match[0];
                        
                        // Clean up the URL
                        videoUrl = videoUrl.replace(/\\"/g, '"').replace(/\\\//g, '/').replace(/^"/, '').replace(/"$/, '');
                        
                        if (videoUrl && (videoUrl.includes('d.terabox.com') || videoUrl.includes('.mp4') || videoUrl.includes('.m3u8'))) {
                            console.log('🎬 Found potential video URL via proxy:', videoUrl);
                            
                            // Verify URL accessibility
                            try {
                                const testResponse = await fetch(videoUrl, { 
                                    method: 'HEAD',
                                    headers: { 'User-Agent': 'Mozilla/5.0' }
                                });
                                
                                if (testResponse.ok || testResponse.status === 206) {
                                    console.log('✅ Proxy-found video URL verified as accessible');
                                    return {
                                        videoUrl: videoUrl,
                                        title: 'Terabox Video',
                                        size: parseInt(testResponse.headers.get('content-length')) || 0
                                    };
                                }
                            } catch (testError) {
                                console.log('❌ Proxy-found URL test failed:', testError.message);
                            }
                        }
                    }
                }
            }
            
            throw new Error('No video URL found via proxy');
            
        } catch (error) {
            console.error('🚫 Proxy method failed:', error.message);
            throw error;
        }
    }

    async extractUsingMethod1(teraboxUrl) {
        // Primary extraction method - try multiple CORS proxies
        const corsProxies = [
            'https://api.allorigins.win/raw?url=',
            'https://corsproxy.io/?',
            'https://cors-anywhere.herokuapp.com/'
        ];
        
        let lastError = null;
        
        for (const proxy of corsProxies) {
            try {
                console.log('Trying CORS proxy:', proxy);
                
                // Determine the API endpoint based on domain
                let apiEndpoint;
                if (teraboxUrl.includes('terabox.club')) {
                    apiEndpoint = 'https://www.terabox.club/api/url/info';
                } else {
                    apiEndpoint = 'https://www.terabox.com/api/url/info';
                }
                
                const response = await fetch(proxy + encodeURIComponent(apiEndpoint), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    body: JSON.stringify({
                        url: teraboxUrl
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                
                if (data.errno && data.errno !== 0) {
                    throw new Error('Failed to get video information from API');
                }

                return {
                    videoUrl: data.dlink || data.download_url,
                    title: data.server_filename || data.filename || 'Terabox Video',
                    size: data.size || 0,
                    thumbnail: data.thumbs?.url4 || data.thumb || null
                };
                
            } catch (error) {
                console.warn('CORS proxy failed:', proxy, error.message);
                lastError = error;
                continue;
            }
        }
        
        throw lastError || new Error('All CORS proxies failed');
    }

    async extractUsingMethod2(teraboxUrl) {
        // Alternative extraction method - try multiple proxies and patterns
        const corsProxies = [
            'https://api.allorigins.win/raw?url=',
            'https://corsproxy.io/?',
            'https://cors.sh/',
            'https://proxy.cors.sh/'
        ];
        
        let lastError = null;
        
        for (const proxyUrl of corsProxies) {
            try {
                console.log('Trying HTML extraction with proxy:', proxyUrl);
                const encodedUrl = encodeURIComponent(teraboxUrl);
                
                const response = await fetch(proxyUrl + encodedUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const html = await response.text();
                console.log('Got HTML response, length:', html.length);
                
                // Parse HTML to extract video information
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                
                // Look for video URL in script tags or meta tags
                const scripts = doc.querySelectorAll('script');
                let videoData = null;

                for (const script of scripts) {
                    const content = script.textContent || script.innerText;
                    
                    // Enhanced patterns for terabox.club and other domains
                    const patterns = [
                        /window\.yunData\s*=\s*({.+?});/,
                        /var\s+yunData\s*=\s*({.+?});/,
                        /window\.shareData\s*=\s*({.+?});/,
                        /var\s+shareData\s*=\s*({.+?});/,
                        /"dlink":\s*"([^"]+)"/,
                        /"download_url":\s*"([^"]+)"/,
                        /"file_url":\s*"([^"]+)"/,
                        // Additional patterns for terabox.club
                        /fileInfo\s*:\s*({.+?})/,
                        /downloadUrl\s*:\s*"([^"]+)"/
                    ];

                    for (const pattern of patterns) {
                        const match = content.match(pattern);
                        if (match) {
                            try {
                                if (match[1] && match[1].startsWith('{')) {
                                    const data = JSON.parse(match[1]);
                                    console.log('Found data object:', data);
                                    
                                    // Multiple ways to extract file info
                                    let file = null;
                                    if (data.file_list && data.file_list[0]) {
                                        file = data.file_list[0];
                                    } else if (data.list && data.list[0]) {
                                        file = data.list[0];
                                    } else if (data.dlink || data.download_url) {
                                        file = data;
                                    }
                                    
                                    if (file) {
                                        videoData = {
                                            videoUrl: file.dlink || file.download_url || file.file_url,
                                            title: file.server_filename || file.filename || file.name || 'Terabox Video',
                                            size: file.size || 0
                                        };
                                        break;
                                    }
                                } else if (match[1]) {
                                    videoData = {
                                        videoUrl: match[1],
                                        title: 'Terabox Video',
                                        size: 0
                                    };
                                    break;
                                }
                            } catch (e) {
                                console.warn('JSON parse error:', e);
                                continue;
                            }
                        }
                    }
                    
                    if (videoData) break;
                }

                if (videoData && videoData.videoUrl) {
                    console.log('Successfully extracted video data:', videoData);
                    return videoData;
                }
                
                throw new Error('Could not extract video URL from page HTML');
                
            } catch (error) {
                console.warn('HTML extraction failed with proxy:', proxyUrl, error.message);
                lastError = error;
                continue;
            }
        }
        
        throw lastError || new Error('All HTML extraction methods failed');
    }

    async extractUsingMethod3(teraboxUrl) {
        // Fallback method using URL parsing and direct API calls
        const fileId = this.extractFileId(teraboxUrl);
        if (!fileId) {
            throw new Error('Could not extract file ID from URL');
        }

        // Try different direct URL patterns based on domain
        const directUrlPatterns = [
            `https://d.terabox.com/file/d/${fileId}`,
            `https://dlink.terabox.com/file/d/${fileId}`,
            `https://terabox.com/api/download?fid=${fileId}`,
            `https://www.terabox.club/api/download?surl=${fileId}`
        ];
        
        for (const directUrl of directUrlPatterns) {
            try {
                console.log('Testing direct URL:', directUrl);
                // Test if the direct URL works
                const response = await fetch(directUrl, { method: 'HEAD' });
                
                if (response.ok) {
                    return {
                        videoUrl: directUrl,
                        title: 'Terabox Video',
                        size: parseInt(response.headers.get('content-length')) || 0
                    };
                }
            } catch (error) {
                console.warn('Direct URL failed:', directUrl, error.message);
                continue;
            }
        }

        throw new Error('All direct URL patterns failed');
    }

    async extractUsingTeraboxClubMethod(teraboxUrl) {
        // Specific method for terabox.club URLs
        if (!teraboxUrl.includes('terabox.club')) {
            throw new Error('This method is only for terabox.club URLs');
        }
        
        const fileId = this.extractFileId(teraboxUrl);
        if (!fileId) {
            throw new Error('Could not extract surl from terabox.club URL');
        }
        
        console.log('Extracted file ID for terabox.club:', fileId);
        
        // Try terabox.club specific API endpoints
        const apiEndpoints = [
            `https://www.terabox.club/api/download?surl=${fileId}`,
            `https://www.terabox.club/wap/share/download?surl=${fileId}`,
            `https://terabox.club/api/share/link?surl=${fileId}`
        ];
        
        for (const endpoint of apiEndpoints) {
            try {
                console.log('Trying terabox.club API:', endpoint);
                
                const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(endpoint)}`, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                console.log('terabox.club API response:', data);
                
                if (data && (data.dlink || data.download_url || data.url)) {
                    return {
                        videoUrl: data.dlink || data.download_url || data.url,
                        title: data.server_filename || data.filename || 'Terabox Video',
                        size: data.size || 0
                    };
                }
                
            } catch (error) {
                console.warn('terabox.club API failed:', endpoint, error.message);
                continue;
            }
        }
        
        throw new Error('terabox.club specific extraction failed');
    }

    async extractUsingThirdPartyAPI(teraboxUrl) {
        // Try using third-party Terabox downloader APIs as fallback
        const thirdPartyAPIs = [
            {
                name: 'TeraboxDownloader API',
                url: 'https://api.teraboxdownloader.com/download',
                method: 'POST',
                body: { url: teraboxUrl }
            },
            {
                name: 'AllInOne API',
                url: 'https://api.cobalt.tools/api/json',
                method: 'POST',
                body: { url: teraboxUrl }
            }
        ];
        
        for (const api of thirdPartyAPIs) {
            try {
                console.log(`Trying ${api.name}...`);
                
                const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(api.url)}`, {
                    method: api.method,
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    body: JSON.stringify(api.body)
                });
                
                if (!response.ok) {
                    throw new Error(`${api.name} HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                console.log(`${api.name} response:`, data);
                
                // Different APIs might have different response formats
                let videoUrl = null;
                let title = 'Terabox Video';
                let size = 0;
                
                if (data.url) {
                    videoUrl = data.url;
                    title = data.title || title;
                } else if (data.download_url) {
                    videoUrl = data.download_url;
                    title = data.filename || title;
                } else if (data.dlink) {
                    videoUrl = data.dlink;
                    title = data.server_filename || title;
                    size = data.size || 0;
                }
                
                if (videoUrl) {
                    return {
                        videoUrl: videoUrl,
                        title: title,
                        size: size
                    };
                }
                
                throw new Error(`${api.name} did not return a video URL`);
                
            } catch (error) {
                console.warn(`${api.name} failed:`, error.message);
                continue;
            }
        }
        
        throw new Error('All third-party APIs failed');
    }

    extractFileId(url) {
        // Extract file ID from various Terabox URL formats
        const patterns = [
            /\/s\/([a-zA-Z0-9_-]+)/,
            /surl=([a-zA-Z0-9_-]+)/,
            /\/file\/([a-zA-Z0-9_-]+)/,
            /fid=([a-zA-Z0-9_-]+)/,
            // Handle filelist URLs
            /\/wap\/share\/filelist\?surl=([a-zA-Z0-9_-]+)/,
            /\/share\/filelist\?surl=([a-zA-Z0-9_-]+)/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                console.log('Extracted file ID:', match[1], 'using pattern:', pattern);
                return match[1];
            }
        }

        console.log('No file ID extracted from URL:', url);
        return null;
    }

    async playVideo(videoData) {
        // Always try to stream the video directly
        const linkContainer = document.getElementById('directLinkContainer');
        if (linkContainer) {
            linkContainer.style.display = 'none';
        }
        this.videoPlayer.style.display = 'block';
        
        console.log('🎬 Setting video source:', videoData.videoUrl);
        this.videoPlayer.src = videoData.videoUrl;
        this.videoTitle.textContent = videoData.title;
        this.videoDescription.textContent = `Ready to stream${videoData.size ? ` • ${this.formatFileSize(videoData.size)}` : ''}`;
        
        // Add comprehensive error handling for video loading
        this.videoPlayer.onerror = (e) => {
            console.error('❌ Video load error:', e);
            console.error('❌ Video error code:', this.videoPlayer.error?.code);
            console.error('❌ Video error message:', this.videoPlayer.error?.message);
            
            let errorMessage = 'Failed to load video. ';
            if (this.videoPlayer.error) {
                switch (this.videoPlayer.error.code) {
                    case 1:
                        errorMessage += 'The video download was aborted.';
                        break;
                    case 2:
                        errorMessage += 'Network error occurred.';
                        break;
                    case 3:
                        errorMessage += 'The video is corrupted or not supported.';
                        break;
                    case 4:
                        errorMessage += 'The video URL is not accessible or invalid.';
                        break;
                    default:
                        errorMessage += 'Unknown error occurred.';
                }
            }
            
            this.showError(errorMessage + ' Please try a different URL or check if the video is still available.');
        };

        this.videoPlayer.onloadedmetadata = () => {
            console.log('✅ Video metadata loaded successfully');
            this.videoTitle.textContent = videoData.title;
            this.videoDescription.textContent = `Duration: ${this.formatDuration(this.videoPlayer.duration)}${videoData.size ? ` • ${this.formatFileSize(videoData.size)}` : ''}`;
        };

        this.videoPlayer.onloadstart = () => {
            console.log('📡 Video loading started...');
        };
        
        this.videoPlayer.oncanplay = () => {
            console.log('✅ Video can start playing');
        };
        
        this.videoPlayer.oncanplaythrough = () => {
            console.log('✅ Video can play through without buffering');
        };

        // Scroll to video section
        this.videoSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    showLoading(show) {
        this.loading.classList.toggle('show', show);
        this.playBtn.disabled = show;
        
        if (show) {
            this.playBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        } else {
            this.playBtn.innerHTML = '<i class="fas fa-play"></i> Play Video';
        }
    }

    showError(message) {
        this.errorText.textContent = message;
        this.errorMessage.classList.add('show');
    }

    hideMessages() {
        this.loading.classList.remove('show');
        this.errorMessage.classList.remove('show');
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDuration(seconds) {
        if (isNaN(seconds)) return '00:00';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TeraboxPlayer();
});

// Add some sample URLs for testing (you can remove this in production)
document.addEventListener('DOMContentLoaded', () => {
    const urlInput = document.getElementById('teraboxUrl');
    
    // Add sample URL placeholder (remove in production)
    urlInput.placeholder = 'Paste your Terabox link here... (e.g., https://terabox.com/s/1abc123def)';
    
    // Add copy-paste enhancement
    urlInput.addEventListener('paste', (e) => {
        setTimeout(() => {
            const url = e.target.value.trim();
            if (url && urlInput.checkValidity()) {
                document.getElementById('playBtn').style.background = 'linear-gradient(45deg, #4CAF50, #45a049)';
                setTimeout(() => {
                    document.getElementById('playBtn').style.background = 'linear-gradient(45deg, #ff6b6b, #feca57)';
                }, 1000);
            }
        }, 100);
    });
}); 