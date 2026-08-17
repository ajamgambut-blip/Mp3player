import ytdl from 'ytdl-core';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { id } = req.query;
  
  if (!id) return res.status(400).json({ error: 'Missing video id' });
  if (!ytdl.validateID(id)) return res.status(400).json({ error: 'Invalid ID' });

  try {
    res.setHeader('Content-Disposition', `attachment; filename="${id}.mp3"`);
    res.setHeader('Content-Type', 'audio/mpeg');

    const stream = ytdl(`https://www.youtube.com/watch?v=${id}`, {
      quality: 'highestaudio',
      filter: 'audioonly'
    });
    
    stream.pipe(res);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal download' });
  }
}
