import { spawn } from 'child_process';
import { promisify } from 'util';
import { pipeline } from 'stream';
import fs from 'fs';
import os from 'os';
import path from 'path';

const pipe = promisify(pipeline);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing video id' });

  const youtubeUrl = `https://www.youtube.com/watch?v=${id}`;
  const tmpDir = os.tmpdir();
  const outputPath = path.join(tmpDir, `${id}.mp3`);

  try {
    await new Promise((resolve, reject) => {
      const yt = spawn('yt-dlp', [
        '-x',
        '--audio-format', 'mp3',
        '--audio-quality', '192',
        '-o', outputPath,
        youtubeUrl
      ]);

      yt.stderr.on('data', (data) => {
        console.log(`yt-dlp: ${data}`);
      });

      yt.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`yt-dlp exited with ${code}`));
      });
    });

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${id}.mp3"`);
    
    const fileStream = fs.createReadStream(outputPath);
    await pipe(fileStream, res);
    
    fs.unlinkSync(outputPath);

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}