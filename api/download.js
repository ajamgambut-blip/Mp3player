import ytdlp from 'yt-dlp-exec';
import { Readable } from 'stream';

export default async function handler(req, res) {
  // Biar bisa diakses dari frontend kamu
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: 'Missing video id' });
  }

  try {
    const url = `https://www.youtube.com/watch?v=${id}`;
    
    res.setHeader('Content-Disposition', `attachment; filename="${id}.mp3"`);
    res.setHeader('Content-Type', 'audio/mpeg');

    const stream = ytdlp(url, {
      output: '-',
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: '0',
    });

    Readable.from(stream).pipe(res);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal download' });
  }
}
