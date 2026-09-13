# Voice-Over Scripts for JSON Diff Videos

## **30-Second Social Media Version**

**Pace**: Fast, energetic, punchy. Read at conversational speed (140-160 wpm).

---

### **[0:00–0:03] HOOK**
> "Comparing large JSON files shouldn't freeze your entire application."

*Tone: Problem-focused, relatable frustration*

---

### **[0:03–0:06] THE PROBLEM**
> "Most tools? They take five minutes and lock up your browser."

*Tone: Sympathetic, acknowledging pain*

---

### **[0:06–0:14] THE SOLUTION**
> "Our JSON Diff is different. Thirty to forty times faster. Load fifty megabytes in under two seconds. Scroll through thousands of differences at smooth sixty frames per second. All without hanging."

*Tone: Confident, impressive. Emphasize the numbers.*

---

### **[0:14–0:20] FEATURES**
> "No hanging on massive datasets. Lightning-fast comparison with smart hashing. Flexible options: ignore order, toggle view modes, drill into structure."

*Tone: Feature-focused, matter-of-fact*

---

### **[0:20–0:25] REAL WORLD**
> "Need to verify a config deployed correctly? Compare old versus new in seconds. See exactly what changed. Instantly."

*Tone: Practical, helpful*

---

### **[0:25–0:28] CALL TO ACTION**
> "Try JSON Diff now. No setup required. No limits."

*Tone: Inviting, simple*

---

### **[0:28–0:30] CLOSING**
> "JSON Diff. Compare faster."

*Tone: Brand message, memorable*

---

## **15-Second TikTok/Reels Version**

**Strategy**: Lead with the problem, hit the biggest stat, show use case, CTA.

> "Comparing 50MB JSON files takes minutes… and freezes your browser.
> 
> Our JSON Diff does it in 2 seconds. Thirty times faster.
> 
> No hanging. No frustration.
> 
> Try it now. No setup."

*Time: 15s. ~110 words. Very punchy.*

---

## **60-Second Full Presentation**

**For YouTube Shorts, LinkedIn, or homepage landing page video.**

---

### **[0:00–0:04] HOOK**
> "Ever compare two massive JSON files and watch your browser freeze for minutes? We fixed that."

---

### **[0:04–0:10] THE PAIN POINT**
> "Most JSON comparison tools weren't built for scale. A fifty-megabyte API response? Five minutes of waiting. A hundred megabyte config? Forget it. Your UI's completely locked."

---

### **[0:10–0:25] ENTER JSON DIFF**
> "Our JSON Diff was engineered from the ground up for performance. We use Polars on the backend for vectorized comparison. Virtual scrolling on the frontend. Smart hashing to skip redundant work. The result? Thirty to forty times faster than naive comparison. We're comparing fifty-megabyte files in under two seconds. And scrolling stays smooth at sixty frames per second, no matter how many differences."

---

### **[0:25–0:40] FEATURES IN ACTION**
> "But speed is just the start. You get three core promises. No hanging—even on datasets that would freeze other tools. Lightning-fast performance with intelligent processing. And flexibility—ignore array order, toggle between tree view and side-by-side, drill into nested structures. Pick the view that fits your workflow."

---

### **[0:40–0:50] REAL WORLD**
> "Picture this: you need to verify a configuration deployed correctly. You compare the old file to the new file, ignore order mode to see what actually matters, and seconds later you know exactly what changed. Compare API responses from staging versus production. Refactor JSON data and instantly see what moved where. Spot what's new and what's gone."

---

### **[0:50–0:58] CTA**
> "JSON Diff is ready for real-world workflows. Try it now—no setup, no limits. Fast. Responsive. Built for developers who work at scale."

---

### **[0:58–1:00] CLOSING**
> "JSON Diff. Compare smarter."

---

## **Platform-Specific Adjustments**

### **LinkedIn (B2B, Professional)**
- Emphasize engineering/performance metrics
- Lead with "30–40x speedup" and "engineering-grade"
- Use professional, confident tone
- Include link to GitHub/product

**Script opener:**
> "Scaling your JSON comparison infrastructure? Our team built JSON Diff to handle enterprise-scale datasets. Thirty to forty times faster than traditional tools, with zero UI blocking. Here's how it works…"

---

### **Twitter/X (Snappy, Visual)**
- Single strong hook
- One surprising stat
- Visual-first (let the video speak)
- CTA is a link

**Script**: Just the hook or single stat, then let visuals carry it.
> *[Silent video with on-screen text, or single line voiceover]*
> "50MB JSON in under 2 seconds, zero hanging."

---

### **TikTok/Instagram Reels (Energetic, Trend-Aware)**
- Fast pacing, quick cuts
- Relatable problem hook ("your browser froze again?")
- Show the transformation (slow → fast)
- Upbeat, youthful tone

**Script:**
> "POV: You're comparing JSON files and your browser's frozen. Again. Meet JSON Diff. Thirty times faster. Two-second load. Zero hanging. Try it now."

---

### **YouTube (Detailed, Educational)**
- Full 60-second version above
- Intro: "Why most JSON tools struggle at scale"
- Middle: Technical explanation (Polars, virtual scrolling, hashing)
- Outro: Demo/link

**Use the full 60-second script above.**

---

## **Recording Voice-Over**

### **Gear (Simple Setup)**
```bash
# Record voice-over on Mac (free)
# Option 1: GarageBand
open -a GarageBand

# Option 2: Audacity (free, cross-platform)
brew install audacity

# Option 3: QuickTime (built-in)
open -a "QuickTime Player"
# File → New Audio Recording
```

### **Timing Your Read**

Use this to match script to your reading pace:

| Duration | Word Count | WPM |
|----------|-----------|-----|
| 15 sec | 40–50 | 160–200 |
| 30 sec | 75–90 | 150–180 |
| 60 sec | 150–180 | 150 |

**Adjust the script if you naturally read faster/slower.**

### **Recording Tips**
- ✅ Quiet room, phone on silent
- ✅ Speak clearly, natural pace (not too fast)
- ✅ Warm up with a few reads first
- ✅ Record 2–3 takes, use the best one
- ✅ Add a 0.5s fade-in/out (Adobe Audition, Audacity)

---

## **Combine Video + Audio**

```bash
# After recording voiceover.mp3, combine with video:
ffmpeg -i json-diff-30s.mp4 -i voiceover.mp3 \
  -c:v copy -c:a aac -shortest \
  json-diff-30s-narrated.mp4

# Adjust audio levels (optional):
ffmpeg -i json-diff-30s.mp4 -i voiceover.mp3 \
  -filter_complex "[1]volume=0.8[a]" \
  -map 0:v -map "[a]" \
  -c:v copy -c:a aac -shortest \
  json-diff-30s-narrated.mp4
```

---

## **Adding Captions (Auto-generated)**

```bash
# Use YouTube's auto-caption, or:
# - Rev.com (human transcription, ~$1 per min)
# - Descript (AI transcription + editing)
# - Adobe Premiere (built-in captions)

# Or caption manually in ffmpeg:
ffmpeg -i json-diff-30s-narrated.mp4 \
  -vf "subtitles=captions.srt" \
  json-diff-30s-captioned.mp4
```

---

## **Brand Voice Guide**

**Tone:**
- 🎯 Confident, not arrogant
- 💡 Practical, problem-solving
- ⚡ Fast-paced, energetic (not slow/boring)
- 👥 Relatable (acknowledge developer pain)
- 📊 Data-driven (use real numbers)

**Avoid:**
- ❌ Marketing jargon ("synergize," "leverage," "innovative")
- ❌ Vague superlatives ("amazing," "best," "next-gen")
- ❌ Overly technical terms (keep it accessible)
- ❌ Slow, monotone delivery

**Do:**
- ✅ Lead with the problem
- ✅ Support claims with numbers (30–40x, <2s)
- ✅ Show real use cases
- ✅ Clear, simple CTA
- ✅ Sound like you're talking to a fellow engineer

---

## **Example: Recording & Editing Workflow**

```bash
# 1. Record voiceover in GarageBand
# File → Export → save as voiceover.m4a

# 2. Convert to MP3 (if needed)
ffmpeg -i voiceover.m4a voiceover.mp3

# 3. Combine with video
ffmpeg -i json-diff-30s.mp4 -i voiceover.mp3 \
  -c:v copy -c:a aac -shortest \
  json-diff-30s-narrated.mp4

# 4. Check result
ffprobe json-diff-30s-narrated.mp4 | grep -i duration

# 5. Trim if needed (optional)
ffmpeg -i json-diff-30s-narrated.mp4 -t 30 \
  -c:v copy -c:a copy \
  json-diff-30s-final.mp4
```

---

## **Quick Reference Card**

**Save this as a cheat sheet when recording:**

```
📱 PLATFORM TEMPLATES

TikTok/Reels (15s):
"Comparing 50MB JSON takes MINUTES with most tools.
JSON Diff does it in 2 SECONDS. 30x faster.
No hanging. Try it now."

LinkedIn (30s):
[Full 30s script above, professional tone]

Twitter (silent):
"50MB JSON | Under 2 seconds | Zero hanging"
[Let visuals speak]

YouTube (60s):
[Full 60s script above]
```

---

**Ready to record?** Pick your platform, read the script once out loud to time it, then record 2–3 takes. Use the best one!
