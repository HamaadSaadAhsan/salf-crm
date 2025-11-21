# Notification Sounds

This directory contains audio files for task reminder notifications.

## Required Sound Files

You need to add the following MP3 files to this directory:

1. **normal.mp3** - For standard priority task reminders (soft, gentle notification sound)
2. **high.mp3** - For high priority task reminders (medium urgency sound)
3. **urgent.mp3** - For urgent priority task reminders (attention-grabbing sound)
4. **overdue.mp3** - For overdue task reminders (more prominent alert sound)

## Recommended Sources

### Free Sound Resources:
- [Notification Sounds](https://notificationsounds.com/) - Free notification sounds
- [Zapsplat](https://www.zapsplat.com/) - Free sound effects (requires attribution)
- [Freesound](https://freesound.org/) - Creative Commons licensed sounds
- [Pixabay](https://pixabay.com/sound-effects/) - Free sound effects

### Sound Characteristics:
- **Duration**: 0.5 - 2 seconds
- **Format**: MP3 (for broad browser support)
- **File Size**: < 100KB per file
- **Volume**: Pre-normalized to consistent levels

## Quick Setup

If you need placeholder sounds for testing, you can:

1. Download from: https://notificationsounds.com/
2. Convert to MP3 if needed using online tools or ffmpeg
3. Rename files to match the names above
4. Place in this directory

## Example Commands (if you have ffmpeg installed):

```bash
# Convert wav to mp3
ffmpeg -i notification.wav -codec:a libmp3lame -qscale:a 2 normal.mp3

# Adjust volume
ffmpeg -i input.mp3 -filter:a "volume=0.7" output.mp3
```