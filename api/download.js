import ytdl from 'ytdl-core';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { id } = req.query;
  
  if (!id) return res.status(400).json({ error: 'Missing video id' });

  try {
    const url = `https://www.youtube.com/watch?v=${id}`;
    
    // Cek dulu valid apa ga
    const info = await ytdl.getInfo(url);
    const audioFormat = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' });

    res.setHeader('Content-Disposition', `attachment; filename="${info.videoDetails.title}.mp3"`);
    res.setHeader('Content-Type', 'audio/mpeg');

    ytdl(url, { 
      format: audioFormat,
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15'
        }
      }
    }).pipe(res);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal: ' + err.message });
  }
}
