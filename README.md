# Terabox Player - Ad-Free Video Streaming

A modern, static website that allows you to stream Terabox videos instantly without ads, delays, or the need to install any apps.

![Terabox Player](https://img.shields.io/badge/Terabox-Player-blue) ![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white) ![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white) ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)

## ✨ Features

- **🚫 Ad-Free Experience**: Stream videos without any advertisements
- **⚡ Instant Playback**: No waiting, no delays - just instant streaming
- **📱 Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **🎨 Modern UI**: Beautiful gradient design with smooth animations
- **🔄 Multiple Extraction Methods**: Uses multiple fallback methods for better success rate
- **📊 Video Information**: Shows video duration, file size, and other metadata
- **🛡️ Privacy-Focused**: No data storage, everything happens in your browser
- **🌐 Universal Support**: Supports all major Terabox domains

## 🎯 Supported Terabox Domains

- terabox.com / www.terabox.com
- terabox.app / www.terabox.app
- 1024tera.com / www.1024tera.com
- mirrobox.com / www.mirrobox.com
- nephobox.com / www.nephobox.com
- teraboxapp.com / www.teraboxapp.com
- freeterabox.com / www.freeterabox.com
- 4funbox.com / www.4funbox.com
- momerybox.com / www.momerybox.com
- tibibox.com / www.tibibox.com

## 🚀 How to Use

1. **Get a Terabox Link**: Copy any Terabox video sharing link
2. **Paste the URL**: Enter the link in the input field on the website
3. **Click Play**: Hit the "Play Video" button or press Enter
4. **Enjoy**: Watch your video instantly without ads!

### Example Terabox URLs:
```
https://terabox.com/s/1abc123def456ghi
https://www.terabox.app/s/1xyz789abc123def
https://1024tera.com/s/1qwe456rty789uio
```

## 🛠️ Technical Details

### How It Works

The Terabox Player uses multiple extraction methods to get direct video URLs:

1. **Primary Method**: Uses Terabox's API endpoints to extract direct links
2. **HTML Parsing**: Parses the Terabox page HTML to find video URLs
3. **Direct URL Construction**: Attempts to construct direct download links
4. **Fallback System**: If one method fails, automatically tries the next

### Technologies Used

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **Styling**: CSS Grid, Flexbox, CSS Animations, Responsive Design
- **APIs**: Fetch API, DOM Parser, URL API
- **Proxy Services**: CORS proxies for cross-origin requests

## 📁 File Structure

```
terabox-player/
├── index.html          # Main HTML file
├── styles.css          # CSS styling
├── script.js           # JavaScript functionality
└── README.md          # Project documentation
```

## 🌐 Deployment

### Option 1: GitHub Pages (Recommended)

1. Fork or download this repository
2. Go to repository Settings → Pages
3. Select "Deploy from a branch" → "main"
4. Your site will be available at `https://yourusername.github.io/terabox-player`

### Option 2: Netlify

1. Download the project files
2. Go to [Netlify](https://netlify.com)
3. Drag and drop the project folder
4. Get your instant deployment URL

### Option 3: Vercel

1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Deploy with one click

### Option 4: Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/terabox-player.git

# Navigate to project folder
cd terabox-player

# Open with live server or simply open index.html in browser
```

## ⚙️ Configuration

### Customizing CORS Proxies

The application uses CORS proxies to bypass cross-origin restrictions. You can modify the proxy URLs in `script.js`:

```javascript
// In extractUsingMethod1()
const apiUrl = 'https://your-cors-proxy.com/https://www.terabox.com/api/url/info';

// In extractUsingMethod2()
const proxyUrl = 'https://your-cors-proxy.com/raw?url=';
```

### Adding More Terabox Domains

To support additional Terabox domains, update the `teraboxDomains` array in `script.js`:

```javascript
const teraboxDomains = [
    'terabox.com', 'www.terabox.com',
    'your-new-domain.com',  // Add new domains here
    // ... existing domains
];
```

## 🔧 Troubleshooting

### Common Issues

1. **Video Won't Load**
   - Ensure the Terabox link is valid and accessible
   - Check if the video is private or password-protected
   - Try refreshing the page and attempting again

2. **CORS Errors**
   - CORS proxy services may be temporarily unavailable
   - The extraction methods will automatically try alternative approaches

3. **Slow Loading**
   - Large video files may take time to buffer
   - Check your internet connection speed

### Browser Compatibility

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+

## 🚨 Important Disclaimers

- **Legal Use Only**: This tool is for personal use only. Respect content creators and copyright laws
- **No Data Storage**: We don't store any URLs, videos, or personal data
- **Educational Purpose**: This project is for educational purposes to demonstrate web technologies
- **Not Affiliated**: This tool is not affiliated with Terabox or any cloud storage providers

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Report Issues**: Found a bug? Report it in the Issues section
2. **Suggest Features**: Have ideas for improvements? Share them!
3. **Submit PRs**: Feel free to submit pull requests with enhancements
4. **Test & Feedback**: Test with different Terabox URLs and provide feedback

### Development Setup

```bash
# Fork the repository
git clone https://github.com/yourusername/terabox-player.git
cd terabox-player

# Make your changes
# Test thoroughly

# Submit a pull request
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⭐ Support

If you find this project helpful, please consider:
- ⭐ Starring the repository
- 🐛 Reporting bugs and issues
- 💡 Suggesting new features
- 🔄 Sharing with others who might find it useful

## 📞 Contact

For questions, suggestions, or support:
- 📧 Email: [your-email@example.com]
- 🐙 GitHub Issues: [Create an issue](https://github.com/yourusername/terabox-player/issues)

---

**Made with ❤️ for the community**

*Enjoy ad-free Terabox streaming!* 