// server.js – Minimal backend for ThumbCraft
// -------------------------------------------------
// Serves static frontend files and provides an API to extract a thumbnail
// from an uploaded video using ffmpeg.

const express = require('express');
const path = require('path');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const fs = require('fs');

// Ensure ffmpeg binary location
ffmpeg.setFfmpegPath(ffmpegStatic);

const app = express();
const PORT = process.env.PORT || 3000;

// Static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));

// Multer config – store uploads in a temp folder
const upload = multer({ dest: path.join(__dirname, 'uploads/') });

// API: POST /api/thumbnail – receives a video file, returns PNG data URL
app.post('/api/thumbnail', upload.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video file provided' });
  }

  const inputPath = req.file.path;
  const outputPath = `${inputPath}.png`;

  // Extract a frame (first second) as PNG
  ffmpeg(inputPath)
    .screenshots({ timestamps: ['00:00:01'], filename: path.basename(outputPath), folder: path.dirname(outputPath) })
    .on('end', () => {
      // Read the generated PNG and send as base64 data URL
      const imgData = fs.readFileSync(outputPath).toString('base64');
      const dataUrl = `data:image/png;base64,${imgData}`;
      // Clean up temp files
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
      res.json({ thumbnail: dataUrl });
    })
    .on('error', err => {
      console.error('ffmpeg error:', err);
      // Cleanup on error
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      res.status(500).json({ error: 'Failed to generate thumbnail' });
    });
});

app.listen(PORT, () => {
  console.log(`ThumbCraft backend running at http://localhost:${PORT}`);
});
