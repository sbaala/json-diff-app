# Recording the JSON Diff Video Demo

You have two HTML presentations ready to record:

- **`json-diff-video.html`** — Full 60-second presentation (scroll-through)
- **`json-diff-30s.html`** — Fast 30-second social media clip (auto-playing slides)

## Quick Record (30s version) 🎬

### **Method 1: QuickTime (Built-in, Fastest)**

```bash
# 1. Open the file in your default browser
open json-diff-30s.html

# 2. Open QuickTime Player
open -a "QuickTime Player"

# 3. File → New Screen Recording
# 4. Select "json-diff-30s" window (or use mouse selector)
# 5. Press Record → Let it play (auto-stops at 32s)
# 6. File → Export As → choose MP4

# Result: json-diff-30s.mp4 (ready to share on Twitter/LinkedIn)
```

### **Method 2: macOS Built-in ScreenFlow**

```bash
# If you have ScreenFlow installed:
open -a ScreenFlow json-diff-30s.html

# Or use Cmd+Shift+5 → Record Selected Portion
# Then manually crop and export
```

### **Method 3: OBS (Free, Customizable)**

```bash
# Install OBS (if not already installed)
brew install obs

# Run OBS, create scene with browser source:
# 1. File → Settings → General → check "Browser Dockable Panels"
# 2. Scenes → Add Scene "JSON Demo"
# 3. Sources → Add → Browser Source
# 4. URL: file:///Users/balachandar.saminathan/Bala/Project/json-diff-app/json-diff-30s.html
# 5. Width: 1920, Height: 1080
# 6. Hit Record → Watch it play (auto-stops) → File → Stop Recording

# Result: .mkv or .mp4 (can convert with ffmpeg)
```

## Auto-Playing Features

The 30-second version:
- ✅ Auto-advances through 7 screens (3-8s per screen)
- ✅ Auto-loops after 30s (great for booth/conference use)
- ✅ Keyboard control: Arrow keys / Space to manually advance
- ✅ Perfect for social media: Twitter, LinkedIn, TikTok aspect ratios

## Timeline (30s version)

| Time | Content |
|------|---------|
| 0–3s | **Hook**: "⚡ JSON Diff — No hanging. 30x faster. Flexible." |
| 3–6s | **Problem**: "5 minutes frozen" (typical tools) |
| 6–14s | **Solution Stats**: 30–40x faster, <2s load, 60fps |
| 14–20s | **Features**: No Hanging · Fast · Flexible |
| 20–25s | **Use Case**: "Did config deploy correctly?" |
| 25–28s | **CTA**: "Try Now — No setup. No limits." |
| 28–30s | **End Slate**: Logo + GitHub link |

## Full Presentation (60s version)

For longer-form content (YouTube, blog, landing page):

```bash
# Use the full version
open json-diff-video.html

# Record with QuickTime:
open -a "QuickTime Player"
# File → New Screen Recording
# Select window, press Record
# Scroll through manually while presenting
# ~60 seconds of content
```

## Convert to Different Formats

```bash
# MP4 → WebM (for web)
ffmpeg -i json-diff-30s.mp4 -c:v libvpx-vp9 -crf 30 json-diff-30s.webm

# MP4 → GIF (for Slack, Discord)
ffmpeg -i json-diff-30s.mp4 -vf "fps=10,scale=1280:-1:flags=lanczos" json-diff-30s.gif

# Get video info
ffprobe json-diff-30s.mp4
```

## Share Ready

Once you have the MP4:

- **Twitter/X**: 30s limit ✓ Perfect
- **LinkedIn**: MP4, <10MB recommended
- **TikTok**: Vertical (rotate 90°) or square
- **GitHub README**: Embed MP4 preview
- **Product Hunt**: MP4 + GIF preview

## Notes

- Both HTML files are **fully self-contained** (no CDN dependencies)
- Dark theme optimized for screen recording
- Preset to 1920×1080 (16:9) but scales to any screen size
- No audio yet—add with:
  ```bash
  # Combine video + audio track
  ffmpeg -i json-diff-30s.mp4 -i voiceover.mp3 -c:v copy -c:a aac output.mp4
  ```

## Next Steps

1. **Record**: Use QuickTime (easiest) or OBS
2. **Export**: MP4 format
3. **Share**: Twitter, LinkedIn, or embedded link
4. **Optional**: Add voice-over narration (ask Claude)

---

**Questions?** Edit either HTML file directly—they're designed to be customizable. Change colors, text, timing, or add your own content.
