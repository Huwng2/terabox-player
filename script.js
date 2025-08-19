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
        // Multiple extraction methods for better success rate
        const methods = [
            () => this.extractUsingMethod1(teraboxUrl),
            () => this.extractUsingMethod2(teraboxUrl),
            // If it's terabox.club, try the specific method first
            () => teraboxUrl.includes('terabox.club') ? this.extractUsingTeraboxClubMethod(teraboxUrl) : this.extractUsingMethod3(teraboxUrl),
            () => this.extractUsingThirdPartyAPI(teraboxUrl),
            () => this.extractUsingMethod3(teraboxUrl)
        ];

        let lastError = null;

        for (let i = 0; i < methods.length; i++) {
            try {
                console.log(`Trying extraction method ${i + 1}...`);
                const result = await methods[i]();
                if (result && result.videoUrl) {
                    console.log(`Method ${i + 1} succeeded!`, result);
                    return result;
                }
            } catch (error) {
                lastError = error;
                console.warn(`Extraction method ${i + 1} failed:`, error.message);
            }
        }

        throw lastError || new Error('All extraction methods failed');
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
        this.videoPlayer.src = videoData.videoUrl;
        this.videoTitle.textContent = videoData.title;
        this.videoDescription.textContent = `Ready to stream${videoData.size ? ` • ${this.formatFileSize(videoData.size)}` : ''}`;
        
        // Add error handling for video loading
        this.videoPlayer.onerror = () => {
            this.showError('Failed to load video. The video may be private or the link has expired.');
        };

        this.videoPlayer.onloadedmetadata = () => {
            this.videoTitle.textContent = videoData.title;
            this.videoDescription.textContent = `Duration: ${this.formatDuration(this.videoPlayer.duration)}${videoData.size ? ` • ${this.formatFileSize(videoData.size)}` : ''}`;
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