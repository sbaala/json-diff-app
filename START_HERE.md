# 🎬 JSON Diff Video Assets — START HERE

## **You Have Everything You Need**

✅ **4 Video Templates** (HTML, auto-playing, ready to record)  
✅ **5 Voice-Over Scripts** (30s, 15s, 60s, platform-specific)  
✅ **Complete Recording Guide** (QuickTime, OBS, Audacity)  
✅ **Platform Playbooks** (Twitter, LinkedIn, TikTok, YouTube)  

---

## **📍 The 2-Minute Quick Start**

```bash
# 1. Open the 30-second video
open json-diff-30s.html

# 2. Open QuickTime Player
open -a "QuickTime Player"

# 3. Click: File → New Screen Recording
# 4. Select the browser window
# 5. Click Record → Watch it auto-play (stops at 30s)
# 6. Click File → Export As → Choose MP4

# Done! You have a shareable video.
```

---

## **🎥 What You Have**

| File | Time | Best For | Record Time |
|------|------|----------|------------|
| `json-diff-30s.html` | 30s | **Start here!** Twitter, LinkedIn | 2 min |
| `json-diff-15s.html` | 15s | Ultra-short, Twitter Ads | 2 min |
| `json-diff-vertical.html` | 15s | TikTok, Instagram Reels | 2 min |
| `json-diff-video.html` | 60s | YouTube, homepage | 5 min |

---

## **📖 Next: Choose Your Path**

### **Path A: Video Only (No Voice-Over) ← FASTEST**
**Time: 5 minutes total**

1. `open json-diff-30s.html`
2. Record with QuickTime (2 min)
3. Share on Twitter/LinkedIn/TikTok
4. Done!

**Best for:** Social media (auto-plays muted anyway)

---

### **Path B: Video + Voice-Over (Professional)**
**Time: 15 minutes total**

1. Read the script from `VOICEOVER_SCRIPTS.md` (2 min)
2. Record video with QuickTime (2 min)
3. Record voiceover with GarageBand (5 min)
4. Combine: `ffmpeg -i video.mp4 -i voiceover.mp3 -c:v copy -c:a aac -shortest output.mp4` (1 min)
5. Share

**Best for:** YouTube, LinkedIn (more professional)

---

### **Path C: All 4 Versions (Maximum Coverage)**
**Time: 20 minutes total**

Record each HTML file once:
- 30s horizontal → Twitter/LinkedIn
- 15s horizontal → Twitter Ads/YouTube Shorts
- 15s vertical → TikTok/Reels
- 60s horizontal → YouTube (with voiceover)

---

## **📂 File Guide**

```
json-diff-app/
│
├── START_HERE.md                 ← You are here
├── VIDEO_ASSETS_GUIDE.md         ← Read this next (complete reference)
├── VOICEOVER_SCRIPTS.md          ← All scripts & recording tips
├── RECORD_VIDEO.md               ← Platform-specific recording
│
├── json-diff-30s.html            ← PRIMARY: Use this first
├── json-diff-15s.html            ← SHORT: Ultra-concise version
├── json-diff-vertical.html       ← VERTICAL: TikTok/Reels format
└── json-diff-video.html          ← FULL: 60s with scroll
```

---

## **⚡ Recommended First Step**

```bash
# Right now, copy and paste this:
open json-diff-30s.html && open -a "QuickTime Player"

# Then:
# 1. QuickTime: File → New Screen Recording
# 2. Select the browser window
# 3. Record → Auto-stops at 30s
# 4. Export as MP4

# Total time: ~2 minutes
```

---

## **🎙️ If You Want Voice-Over**

1. Open `VOICEOVER_SCRIPTS.md` → Find "30-Second Social Media Version"
2. Record in GarageBand or Audacity (free)
3. Use the combine command below:

```bash
ffmpeg -i json-diff-30s.mp4 -i voiceover.mp3 \
  -c:v copy -c:a aac -shortest \
  json-diff-30s-narrated.mp4
```

---

## **📤 Where to Share**

**Instant Win (No editing needed):**
- Tweet the MP4 → Twitter/X audience loves dev tools
- Post to LinkedIn → B2B engagement
- TikTok/Reels → Vertical version + trending audio

**More Reach:**
- YouTube Shorts → 2–3 hours upload + algorithm
- GitHub README → Pin with project description
- Personal website → Embed in blog post

---

## **✅ You're Ready**

Everything is prepared. All you need to do:

1. Open `json-diff-30s.html` in your browser
2. Hit record with QuickTime
3. Share the MP4

**Questions?** Check `VIDEO_ASSETS_GUIDE.md` for detailed instructions.

**Want to customize?** Edit any HTML file directly—change colors, text, timing. Changes take effect when you reload.

---

**Start recording now:**
```bash
open json-diff-30s.html
```

Then QuickTime → File → New Screen Recording → done in 2 minutes!
