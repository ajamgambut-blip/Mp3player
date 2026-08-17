const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resultsDiv = document.getElementById('results');
const player = document.getElementById('player');
const audio = document.getElementById('audio');
const songTitle = document.getElementById('songTitle');

const API_KEY = 'AIzaSyCuRrZuamgjKNLBCN_tfTdfmLJsuuno78c'; // Ganti pake API Youtube kamu

// 1. SEARCH YOUTUBE
searchBtn.addEventListener('click', searchVideos);
searchInput.addEventListener('keypress', (e) => {
  if(e.key === 'Enter') searchVideos();
});

async function searchVideos() {
  const query = searchInput.value;
  if(!query) return;
  resultsDiv.innerHTML = 'Loading...';
  
  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${query}&key=${API_KEY}&type=video`);
  const data = await res.json();
  
  resultsDiv.innerHTML = '';
  data.items.forEach(item => {
    const videoId = item.id.videoId;
    const title = item.snippet.title;
    const thumb = item.snippet.thumbnails.medium.url;
    
    resultsDiv.innerHTML += `
      <div class="song">
        <img src="${thumb}">
        <div>
          <p>${title}</p>
          <button onclick="playSong('${videoId}', '${title}')">Play</button>
          <button onclick="downloadSong('${videoId}', '${title}')">Download MP3</button>
        </div>
      </div>
    `;
  });
}

// 2. PLAY LAGU
function playSong(videoId, title) {
  player.style.display = 'block';
  songTitle.innerText = title;
  audio.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
}

// 3. DOWNLOAD MP3 - INI KUNCINYA
function downloadSong(videoId, title) {
  // Pake API cobalt.tools - paling stabil & gratis
  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
  
  // Kirim ke API cobalt
  fetch('https://api.cobalt.tools/api/json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: youtubeUrl,
      aFormat: "mp3"
    })
  })
  .then(res => res.json())
  .then(data => {
    if(data.url){
      // Langsung download
      const a = document.createElement('a');
      a.href = data.url;
      a.download = title + '.mp3';
      a.click();
    } else {
      alert('Gagal download: ' + data.error);
    }
  });
}
