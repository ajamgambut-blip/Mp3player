const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resultsDiv = document.getElementById('results');
const player = document.getElementById('player');
const audio = document.getElementById('audio');
const songTitle = document.getElementById('songTitle');

const API_KEY = 'AIzaSyCuRrZuamgjKNLBCN_tfTdfmLJsuuno78c'; // PUNYA KAMU

// 1. SEARCH YOUTUBE
searchBtn.addEventListener('click', searchVideos);
searchInput.addEventListener('keypress', (e) => {
  if(e.key === 'Enter') searchVideos();
});

async function searchVideos() {
  const query = searchInput.value;
  if(!query) return;
  resultsDiv.innerHTML = 'Loading...';
  
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(query)}&key=${API_KEY}&type=video`;
    const res = await fetch(url);
    const data = await res.json();
    
    // Kalau ada error dari google
    if(data.error){
      resultsDiv.innerHTML = `Error: ${data.error.message}`;
      return;
    }

    resultsDiv.innerHTML = '';
    if(!data.items || data.items.length === 0){
      resultsDiv.innerHTML = 'Lagu tidak ditemukan';
      return;
    }

    data.items.forEach(item => {
      const videoId = item.id.videoId;
      const title = item.snippet.title;
      const thumb = item.snippet.thumbnails.medium.url;
      
      // Pakai " untuk title biar ga error kalau ada tanda '
      resultsDiv.innerHTML += `
        <div class="song">
          <img src="${thumb}">
          <div>
            <p>${title}</p>
            <button onclick="playSong('${videoId}', \`${title}\`)">Play</button>
            <button onclick="downloadSong('${videoId}', \`${title}\`)">Download MP3</button>
          </div>
        </div>
      `;
    });

  } catch(err){
    resultsDiv.innerHTML = 'Gagal konek ke Youtube: ' + err.message;
  }
}

// 2. PLAY LAGU
function playSong(videoId, title) {
  player.style.display = 'block';
  songTitle.innerText = title;
  audio.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
}

// 3. DOWNLOAD MP3
async function downloadSong(videoId, title) {
  alert('Sedang proses download...');
  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
  
  try {
    const res = await fetch('https://api.cobalt.tools/api/json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: youtubeUrl,
        aFormat: "mp3"
      })
    });
    const data = await res.json();
    
    if(data.url){
      const a = document.createElement('a');
      a.href = data.url;
      a.download = title + '.mp3';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else {
      alert('Gagal download: ' + data.error);
    }
  } catch(err){
    alert('Error: ' + err.message);
  }
}
