import ytdl from 'ytdl-core';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { id } = req.query;
  
  if (!id) return res.status(400).json({ error: 'Missing video id' });

  try {
    const url = `https://www.youtube.com/watch?v=${id}`;
    
    res.setHeader('Content-Disposition', `attachment; filename="${id}.mp3"`);
    res.setHeader('Content-Type', 'audio/mpeg');

    const stream = ytdl(url, { 
      quality: 'highestaudio',
      filter: 'audioonly',
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    });
    
    stream.on('error', (err) => {
      console.error(err);
      res.status(500).json({ error: 'Gagal ambil audio dari youtube' });
    });

    stream.pipe(res);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal download' });
  }
}
