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

        if (!this.isValidTeraboxUrl(url)) {
            this.showError('Please enter a valid Terabox URL');
            return;
        }

        this.showLoading(true);
        this.hideMessages();

        try {
            const videoData = await this.extractVideoUrl(url);
            await this.playVideo(videoData);
        } catch (error) {
            console.error('Error extracting video:', error);
            this.showError(error.message || 'Failed to extract video URL. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    isValidTeraboxUrl(url) {
        const teraboxDomains = [
            'terabox.com', 'www.terabox.com',
            'terabox.app', 'www.terabox.app', 
            '1024tera.com', 'www.1024tera.com',
            'mirrobox.com', 'www.mirrobox.com',
            'nephobox.com', 'www.nephobox.com',
            'teraboxapp.com', 'www.teraboxapp.com',
            'freeterabox.com', 'www.freeterabox.com',
            '4funbox.com', 'www.4funbox.com',
            'momerybox.com', 'www.momerybox.com',
            'tibibox.com', 'www.tibibox.com'
        ];

        try {
            const urlObj = new URL(url);
            return teraboxDomains.some(domain => urlObj.hostname === domain);
        } catch {
            return false;
        }
    }

    async extractVideoUrl(teraboxUrl) {
        // Multiple extraction methods for better success rate
        const methods = [
            () => this.extractUsingMethod1(teraboxUrl),
            () => this.extractUsingMethod2(teraboxUrl),
            () => this.extractUsingMethod3(teraboxUrl)
        ];

        let lastError = null;

        for (const method of methods) {
            try {
                const result = await method();
                if (result && result.videoUrl) {
                    return result;
                }
            } catch (error) {
                lastError = error;
                console.warn('Extraction method failed, trying next...', error);
            }
        }

        throw lastError || new Error('All extraction methods failed');
    }

    async extractUsingMethod1(teraboxUrl) {
        // Primary extraction method using public API
        const apiUrl = 'https://cors-anywhere.herokuapp.com/https://www.terabox.com/api/url/info';
        
        const response = await fetch(apiUrl, {
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
        
        if (data.errno !== 0) {
            throw new Error('Failed to get video information');
        }

        return {
            videoUrl: data.dlink,
            title: data.server_filename || 'Terabox Video',
            size: data.size || 0,
            thumbnail: data.thumbs?.url4 || null
        };
    }

    async extractUsingMethod2(teraboxUrl) {
        // Alternative extraction method
        const proxyUrl = 'https://api.allorigins.win/raw?url=';
        const encodedUrl = encodeURIComponent(teraboxUrl);
        
        const response = await fetch(proxyUrl + encodedUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const html = await response.text();
        
        // Parse HTML to extract video information
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Look for video URL in script tags or meta tags
        const scripts = doc.querySelectorAll('script');
        let videoData = null;

        for (const script of scripts) {
            const content = script.textContent || script.innerText;
            
            // Look for common patterns in Terabox pages
            const patterns = [
                /window\.yunData\s*=\s*({.+?});/,
                /var\s+yunData\s*=\s*({.+?});/,
                /"dlink":\s*"([^"]+)"/,
                /"download_url":\s*"([^"]+)"/
            ];

            for (const pattern of patterns) {
                const match = content.match(pattern);
                if (match) {
                    try {
                        if (match[1] && match[1].startsWith('{')) {
                            const data = JSON.parse(match[1]);
                            if (data.file_list && data.file_list[0]) {
                                const file = data.file_list[0];
                                videoData = {
                                    videoUrl: file.dlink || file.download_url,
                                    title: file.server_filename || 'Terabox Video',
                                    size: file.size || 0
                                };
                                break;
                            }
                        } else {
                            videoData = {
                                videoUrl: match[1],
                                title: 'Terabox Video',
                                size: 0
                            };
                            break;
                        }
                    } catch (e) {
                        continue;
                    }
                }
            }
            
            if (videoData) break;
        }

        if (!videoData || !videoData.videoUrl) {
            throw new Error('Could not extract video URL from page');
        }

        return videoData;
    }

    async extractUsingMethod3(teraboxUrl) {
        // Fallback method using URL parsing and direct API calls
        const fileId = this.extractFileId(teraboxUrl);
        if (!fileId) {
            throw new Error('Could not extract file ID from URL');
        }

        // Try to construct direct download URL
        const directUrl = `https://d.terabox.com/file/d/${fileId}`;
        
        // Test if the direct URL works
        const response = await fetch(directUrl, { method: 'HEAD' });
        
        if (response.ok) {
            return {
                videoUrl: directUrl,
                title: 'Terabox Video',
                size: parseInt(response.headers.get('content-length')) || 0
            };
        }

        throw new Error('Direct URL method failed');
    }

    extractFileId(url) {
        // Extract file ID from various Terabox URL formats
        const patterns = [
            /\/s\/([a-zA-Z0-9_-]+)/,
            /surl=([a-zA-Z0-9_-]+)/,
            /\/file\/([a-zA-Z0-9_-]+)/,
            /fid=([a-zA-Z0-9_-]+)/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }

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