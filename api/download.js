import ytdlp from 'yt-dlp-exec';
import { Readable } from 'stream';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing video id' });

  try {
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${id}.mp3"`);

    const stream = ytdlp.exec(
      `https://www.youtube.com/watch?v=${id}`,
      {
        output: '-',
        extractAudio: true,
        audioFormat: 'mp3',
        audioQuality: '192'
      },
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );

    Readable.from(stream.stdout).pipe(res);

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}