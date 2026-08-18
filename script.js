/* =========================================================
   MyMusic
   Local Music + YouTube Search + YouTube Player
   ========================================================= */
// === INJECT VINYL + VISUALIZER ===
document.addEventListener('DOMContentLoaded', ()=>{
  const playerSection = document.querySelector('.player');
  // sisipin vinyl di atas judul
  document.getElementById('cover').insertAdjacentHTML('beforebegin', `
    <div id="vinylWrap">
      <div class="vinyl" id="vinyl">
        <img id="coverVinyl" src="https://i.imgur.com/8QfXw.png">
      </div>
    </div>
    <canvas id="viz"></canvas>
  `);

  const audio = document.getElementById('audio');
  const vinyl = document.getElementById('vinyl');
  const coverVinyl = document.getElementById('coverVinyl');
  const canvas = document.getElementById('viz');
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth; canvas.height = 70;

  // AUDIO VISUALIZER
  let audioCtx, analyser, dataArray;
  function initAudio(){
    if(!audioCtx){
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      let src = audioCtx.createMediaElementSource(audio);
      src.connect(analyser); analyser.connect(audioCtx.destination);
      analyser.fftSize = 128;
      dataArray = new Uint8Array(analyser.frequencyBinCount);
    }
  }

  function draw(){
    requestAnimationFrame(draw);
    if(!analyser) return;
    analyser.getByteFrequencyData(dataArray);
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0,0,canvas.width,canvas.height);
    let barWidth = canvas.width / dataArray.length;
    for(let i=0;i<dataArray.length;i++){
      let h = dataArray[i]/1.5;
      ctx.fillStyle = `hsl(${i*4},100%,55%)`;
      ctx.fillRect(i*barWidth, canvas.height-h, barWidth-1, h);
    }
  }
  draw();

  // HOOK KE TOMBOL PLAY PAUSE KAMU
  const playBtn = document.getElementById('play');
  const oldPlay = playBtn.onclick;
  playBtn.onclick = () => {
    initAudio();
    if(audioCtx) audioCtx.resume();
    audio.paused? audio.play() : audio.pause();
  }

  audio.onplay = () => { vinyl.classList.add('playing'); }
  audio.onpause = () => { vinyl.classList.remove('playing'); }

  // UPDATE COVER VINYL PAS GANTI LAGU
  const oldSetSong = window.setSong || function(){};
  window.setSong = (song) => {
    oldSetSong(song);
    if(song && song.cover) coverVinyl.src = song.cover;
    else coverVinyl.src = 'https://i.imgur.com/8QfXw.png';
  }
});
const "AIzaSyCEpXXPWfTLuhrESQ_XxVz2uiPpA5FJ5XA";

const $ = id => document.getElementById(id);

const audio = $("audio");
const playlist = $("playlist");
const results = $("results");

let songs = [];
let current = -1;

let shuffleMode = false;
let repeatMode = false;

let yt = null;
let ytReady = false;
let currentYT = null;
let ytTimer = null;

let db;

/* =========================================================
   INDEXED DB
   ========================================================= */

const DB_NAME = "MyMusicDB";
const DB_VERSION = 2;

function openDB() {
  return new Promise((resolve, reject) => {

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = e => {

      const database = e.target.result;

      if (!database.objectStoreNames.contains("songs")) {
        database.createObjectStore("songs", {
          keyPath: "id",
          autoIncrement: true
        });
      }

      if (!database.objectStoreNames.contains("searchCache")) {
        database.createObjectStore("searchCache", {
          keyPath: "query"
        });
      }
    };

    request.onsuccess = e => {
      db = e.target.result;
      resolve(db);
    };

    request.onerror = () => reject(request.error);
  });
}

/* =========================================================
   SONG DATABASE
   ========================================================= */

function saveSong(song) {

  return new Promise((resolve, reject) => {

    const tx = db.transaction("songs", "readwrite");
    const store = tx.objectStore("songs");

    const request = store.add(song);

    request.onsuccess = () => {
      song.id = request.result;
      resolve(song);
    };

    request.onerror = () => reject(request.error);
  });
}

function getSongs() {

  return new Promise((resolve, reject) => {

    const tx = db.transaction("songs", "readonly");
    const store = tx.objectStore("songs");

    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function deleteSong(id) {

  return new Promise((resolve, reject) => {

    const tx = db.transaction("songs", "readwrite");

    tx.objectStore("songs").delete(id);

    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

function clearSongs() {

  return new Promise((resolve, reject) => {

    const tx = db.transaction("songs", "readwrite");

    tx.objectStore("songs").clear();

    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

/* =========================================================
   INITIALIZE
   ========================================================= */

async function init() {

  try {

    await openDB();

    songs = await getSongs();

    renderPlaylist();

    updateCount();

    setStatus(
      navigator.onLine
        ? "Online Music Player"
        : "Offline Music Player"
    );

  } catch (err) {

    console.error(err);

    setStatus("Database error");
  }
}

/* =========================================================
   STATUS
   ========================================================= */

function setStatus(text) {
  $("status").textContent = text;
}

window.addEventListener("online", () => {
  setStatus("Online Music Player");
});

window.addEventListener("offline", () => {
  setStatus("Offline Music Player");
});

/* =========================================================
   FILE INPUT
   ========================================================= */

$("files").addEventListener("change", async e => {

  const files = [...e.target.files];

  for (const file of files) {

    const song = {

      title: file.name.replace(/\.[^/.]+$/, ""),

      artist: "File lokal",

      type: "local",

      mime: file.type,

      blob: file,

      duration: 0,

      created: Date.now()
    };

    const saved = await saveSong(song);

    songs.push(saved);
  }

  renderPlaylist();

  updateCount();

  e.target.value = "";
});

/* =========================================================
   PLAYLIST RENDER
   ========================================================= */

function renderPlaylist() {

  playlist.innerHTML = "";

  if (!songs.length) {

    playlist.innerHTML = `
      <div class="empty">
        Belum ada musik
      </div>
    `;

    return;
  }

  songs.forEach((song, index) => {

    const item = document.createElement("div");

    item.className = "song";

    item.innerHTML = `
      <div class="songInfo">

        <div class="miniCover">
          ♪
        </div>

        <div>
          <strong>${escapeHTML(song.title)}</strong>
          <small>${escapeHTML(song.artist || "")}</small>
        </div>

      </div>

      <div class="songActions">

        <button class="playSong">
          ▶
        </button>

        <button class="deleteSong">
          ×
        </button>

      </div>
    `;

    item.querySelector(".playSong").onclick = () => {
      playSong(index);
    };

    item.querySelector(".deleteSong").onclick = async () => {

      if (!confirm("Hapus lagu ini?")) return;

      await deleteSong(song.id);

      songs.splice(index, 1);

      if (current === index) {

        stopCurrent();

        current = -1;

      } else if (current > index) {

        current--;
      }

      renderPlaylist();

      updateCount();
    };

    playlist.appendChild(item);
  });
}

/* =========================================================
   PLAY SONG
   ========================================================= */

function playSong(index) {

  if (!songs[index]) return;

  const song = songs[index];

  current = index;

  stopYouTube();

  if (song.type === "youtube") {

    playYouTube(song);

    return;
  }

  playLocal(song);
}

/* =========================================================
   LOCAL AUDIO
   ========================================================= */

function playLocal(song) {

  if (!song.blob) return;

  const url = URL.createObjectURL(song.blob);

  audio.src = url;

  $("title").textContent = song.title;

  $("artist").textContent = song.artist || "File lokal";

  $("cover").textContent = "♪";

  audio.play()
    .then(() => {

      updateMediaSession(song);

    })
    .catch(err => {

      console.error(err);
    });
}

/* =========================================================
   STOP CURRENT
   ========================================================= */

function stopCurrent() {

  audio.pause();

  audio.removeAttribute("src");

  stopYouTube();

  $("play").textContent = "▶";

  clearInterval(ytTimer);
}

/* =========================================================
   AUDIO CONTROLS
   ========================================================= */

$("play").onclick = () => {

  if (current < 0) {

    if (songs.length) {
      playSong(0);
    }

    return;
  }

  const song = songs[current];

  if (song?.type === "youtube") {

    if (!ytReady || !yt) return;

    const state = yt.getPlayerState();

    if (state === YT.PlayerState.PLAYING) {

      yt.pauseVideo();

    } else {

      yt.playVideo();
    }

    return;
  }

  if (audio.paused) {

    audio.play();

  } else {

    audio.pause();
  }
};

$("prev").onclick = () => {

  if (!songs.length) return;

  let index;

  if (shuffleMode) {

    index = Math.floor(Math.random() * songs.length);

  } else {

    index = current - 1;

    if (index < 0) {
      index = songs.length - 1;
    }
  }

  playSong(index);
};

$("next").onclick = () => {

  if (!songs.length) return;

  let index;

  if (shuffleMode) {

    index = Math.floor(Math.random() * songs.length);

  } else {

    index = current + 1;

    if (index >= songs.length) {
      index = 0;
    }
  }

  playSong(index);
};

/* =========================================================
   SHUFFLE
   ========================================================= */

$("shuffle").onclick = () => {

  shuffleMode = !shuffleMode;

  $("shuffle").classList.toggle(
    "active",
    shuffleMode
  );
};

/* =========================================================
   REPEAT
   ========================================================= */

$("repeat").onclick = () => {

  repeatMode = !repeatMode;

  $("repeat").classList.toggle(
    "active",
    repeatMode
  );
};

/* =========================================================
   AUDIO EVENTS
   ========================================================= */

audio.addEventListener("play", () => {

  $("play").textContent = "⏸";

});

audio.addEventListener("pause", () => {

  $("play").textContent = "▶";

});

audio.addEventListener("loadedmetadata", () => {

  if (!isNaN(audio.duration)) {

    $("dur").textContent =
      formatTime(audio.duration);
  }
});

audio.addEventListener("timeupdate", () => {

  if (!audio.duration) return;

  const percent =
    (audio.currentTime / audio.duration) * 100;

  $("bar").value = percent;

  $("cur").textContent =
    formatTime(audio.currentTime);

});

audio.addEventListener("ended", () => {

  if (repeatMode) {

    audio.currentTime = 0;
    audio.play();

    return;
  }

  $("next").click();
});

/* =========================================================
   PROGRESS BAR
   ========================================================= */

$("bar").addEventListener("input", () => {

  if (current < 0) return;

  const song = songs[current];

  const percent =
    Number($("bar").value) / 100;

  if (song?.type === "youtube") {

    if (!ytReady || !yt) return;

    const duration = yt.getDuration();

    yt.seekTo(
      duration * percent,
      true
    );

  } else {

    if (!audio.duration) return;

    audio.currentTime =
      audio.duration * percent;
  }
});

/* =========================================================
   MEDIA SESSION
   ========================================================= */

function updateMediaSession(song) {

  if (!("mediaSession" in navigator)) return;

  navigator.mediaSession.metadata =
    new MediaMetadata({

      title: song.title,

      artist: song.artist || "MyMusic",

      album: "MyMusic"
    });

  navigator.mediaSession.setActionHandler(
    "play",
    () => {

      if (song.type === "youtube") {

        if (yt) yt.playVideo();

      } else {

        audio.play();
      }
    }
  );

  navigator.mediaSession.setActionHandler(
    "pause",
    () => {

      if (song.type === "youtube") {

        if (yt) yt.pauseVideo();

      } else {

        audio.pause();
      }
    }
  );

  navigator.mediaSession.setActionHandler(
    "previoustrack",
    () => $("prev").click()
  );

  navigator.mediaSession.setActionHandler(
    "nexttrack",
    () => $("next").click()
  );
}

/* =========================================================
   YOUTUBE API
   ========================================================= */

window.onYouTubeIframeAPIReady = function() {

  ytReady = true;

  console.log("YouTube API ready");
};

/* =========================================================
   YOUTUBE SEARCH
   ========================================================= */

$("searchBtn").onclick = searchYouTube;

$("query").addEventListener("keydown", e => {

  if (e.key === "Enter") {
    searchYouTube();
  }
});

async function searchYouTube() {

  const query =
    $("query").value.trim();

  if (!query) return;

  if (
    !YOUTUBE_API_KEY ||
    YOUTUBE_API_KEY ===
    "MASUKKAN_API_KEY_YOUTUBE_DI_SINI"
  ) {

    alert(
      "Masukkan YouTube API Key terlebih dahulu di script.js"
    );

    return;
  }

  results.innerHTML = `
    <div class="loading">
      Mencari "${escapeHTML(query)}"...
    </div>
  `;

  try {

    const url =
      "https://www.googleapis.com/youtube/v3/search" +
      "?part=snippet" +
      "&type=video" +
      "&maxResults=15" +
      "&q=" +
      encodeURIComponent(query) +
      "&key=" +
      YOUTUBE_API_KEY;

    const response =
      await fetch(url);

    const data =
      await response.json();

    if (!response.ok) {

      throw new Error(
        data.error?.message ||
        "YouTube API error"
      );
    }

    if (!data.items?.length) {

      results.innerHTML = `
        <div class="empty">
          Tidak ada hasil
        </div>
      `;

      return;
    }

    const ids =
      data.items
        .map(item => item.id.videoId)
        .join(",");

    const durationURL =
      "https://www.googleapis.com/youtube/v3/videos" +
      "?part=contentDetails" +
      "&id=" +
      ids +
      "&key=" +
      YOUTUBE_API_KEY;

    const durationResponse =
      await fetch(durationURL);

    const durationData =
      await durationResponse.json();

    const durationMap = {};

    durationData.items?.forEach(item => {

      durationMap[item.id] =
        parseISO8601Duration(
          item.contentDetails.duration
        );
    });

    renderYouTubeResults(
      data.items,
      durationMap
    );

  } catch (err) {

    console.error(err);

    results.innerHTML = `
      <div class="error">
        Gagal mencari YouTube.<br>
        ${escapeHTML(err.message)}
      </div>
    `;
  }
}

/* =========================================================
   YOUTUBE RESULT UI
   ========================================================= */

function renderYouTubeResults(items, durations) {

  results.innerHTML = `
    <div class="resultHead">

      <strong>
        Hasil YouTube
      </strong>

      <button id="closeResults">
        ✕
      </button>

    </div>
  `;

  $("closeResults").onclick = () => {

    results.innerHTML = "";
  };

  items.forEach(item => {

    const videoId =
      item.id.videoId;

    const title =
      item.snippet.title;

    const channel =
      item.snippet.channelTitle;

    const thumbnail =
      item.snippet.thumbnails?.medium?.url ||
      item.snippet.thumbnails?.default?.url;

    const duration =
      durations[videoId] || "—";

    const card =
      document.createElement("div");

    card.className =
      "ytResult";

    card.innerHTML = `

      <img
        src="${thumbnail}"
        alt=""
        loading="lazy"
      >

      <div class="ytInfo">

        <strong>
          ${escapeHTML(title)}
        </strong>

        <small>
          ${escapeHTML(channel)}
          • ${duration}
        </small>

        <div class="ytButtons">

          <button class="ytPlay">
            ▶ Play
          </button>

          <button class="ytAdd">
            ＋ Playlist
          </button>

          <a
            class="ytOpen"
            href="https://www.youtube.com/watch?v=${videoId}"
            target="_blank"
            rel="noopener"
          >
            YouTube
          </a>

        </div>

      </div>
    `;

    card.querySelector(".ytPlay").onclick = () => {

      const song = {

        title:
          decodeHTML(title),

        artist:
          channel,

        type:
          "youtube",

        videoId:
          videoId,

        duration:
          duration
      };

      playYouTubeDirect(song);
    };

    card.querySelector(".ytAdd").onclick =
      async () => {

        const exists =
          songs.some(
            s =>
              s.type === "youtube" &&
              s.videoId === videoId
          );

        if (exists) {

          alert("Lagu sudah ada di playlist");

          return;
        }

        const song = {

          title:
            decodeHTML(title),

          artist:
            channel,

          type:
            "youtube",

          videoId:
            videoId,

          duration:
            duration,

          created:
            Date.now()
        };

        const saved =
          await saveSong(song);

        songs.push(saved);

        renderPlaylist();

        updateCount();

        alert("Ditambahkan ke playlist");
      };

    results.appendChild(card);
  });
}

/* =========================================================
   YOUTUBE PLAYER
   ========================================================= */

function createYouTubePlayer(videoId) {

  if (!ytReady) {

    alert(
      "YouTube Player belum siap. Coba lagi."
    );

    return;
  }

  if (yt) {

    yt.loadVideoById(videoId);

    return;
  }

  yt =
    new YT.Player("youtubePlayer", {

      height: "1",

      width: "1",

      videoId: videoId,

      playerVars: {

        autoplay: 1,

        controls: 0,

        playsinline: 1,

        rel: 0
      },

      events: {

        onReady: event => {

          event.target.playVideo();

          startYouTubeTimer();
        },

        onStateChange:
          onYouTubeStateChange,

        onError:
          onYouTubeError
      }
    });
}

/* =========================================================
   PLAY YOUTUBE DIRECT
   ========================================================= */

function playYouTubeDirect(song) {

  currentYT = song;

  $("title").textContent =
    song.title;

  $("artist").textContent =
    song.artist;

  $("cover").textContent =
    "▶";

  createYouTubePlayer(
    song.videoId
  );

  updateMediaSession(song);
}

/* =========================================================
   PLAY YOUTUBE FROM PLAYLIST
   ========================================================= */

function playYouTube(song) {

  currentYT = song;

  $("title").textContent =
    song.title;

  $("artist").textContent =
    song.artist;

  $("cover").textContent =
    "▶";

  createYouTubePlayer(
    song.videoId
  );

  updateMediaSession(song);
}

/* =========================================================
   YOUTUBE STATE
   ========================================================= */

function onYouTubeStateChange(event) {

  if (!window.YT) return;

  if (
    event.data ===
    YT.PlayerState.PLAYING
  ) {

    $("play").textContent =
      "⏸";

    startYouTubeTimer();

  } else if (
    event.data ===
    YT.PlayerState.PAUSED
  ) {

    $("play").textContent =
      "▶";

  } else if (
    event.data ===
    YT.PlayerState.ENDED
  ) {

    $("play").textContent =
      "▶";

    stopYouTubeTimer();

    if (repeatMode) {

      yt.seekTo(0, true);
      yt.playVideo();

      return;
    }

    $("next").click();
  }
}

/* =========================================================
   YOUTUBE ERROR
   ========================================================= */

function onYouTubeError(event) {

  console.error(
    "YouTube error:",
    event.data
  );

  setStatus(
    "YouTube tidak dapat diputar"
  );
}

/* =========================================================
   YOUTUBE TIMER
   ========================================================= */

function startYouTubeTimer() {

  stopYouTubeTimer();

  ytTimer =
    setInterval(() => {

      if (!yt) return;

      const currentTime =
        yt.getCurrentTime();

      const duration =
        yt.getDuration();

      if (!duration) return;

      $("cur").textContent =
        formatTime(currentTime);

      $("dur").textContent =
        formatTime(duration);

      $("bar").value =
        (currentTime / duration) * 100;

    }, 500);
}

function stopYouTubeTimer() {

  if (ytTimer) {

    clearInterval(ytTimer);

    ytTimer = null;
  }
}

/* =========================================================
   STOP YOUTUBE
   ========================================================= */

function stopYouTube() {

  stopYouTubeTimer();

  if (yt) {

    try {
      yt.stopVideo();
    } catch (e) {}
  }

  currentYT = null;
}

/* =========================================================
   CLEAR PLAYLIST
   ========================================================= */

$("clear").onclick = async () => {

  if (!songs.length) return;

  if (
    !confirm(
      "Hapus semua lagu dari library?"
    )
  ) return;

  stopCurrent();

  await clearSongs();

  songs = [];

  current = -1;

  renderPlaylist();

  updateCount();

  $("title").textContent =
    "Belum ada lagu";

  $("artist").textContent =
    "Tambahkan musik untuk mulai";

  $("cur").textContent =
    "0:00";

  $("dur").textContent =
    "0:00";

  $("bar").value = 0;
};

/* =========================================================
   ADD BUTTON
   ========================================================= */

$("addBtn").onclick = () => {

  $("files").click();
};

/* =========================================================
   COUNT
   ========================================================= */

function updateCount() {

  const count =
    songs.length;

  $("count").textContent =
    `${count} lagu`;
}

/* =========================================================
   TIME
   ========================================================= */

function formatTime(seconds) {

  if (
    !seconds ||
    !isFinite(seconds)
  ) {
    return "0:00";
  }

  seconds =
    Math.floor(seconds);

  const minutes =
    Math.floor(seconds / 60);

  const secs =
    seconds % 60;

  return (
    minutes +
    ":" +
    String(secs).padStart(2, "0")
  );
}

/* =========================================================
   YOUTUBE ISO DURATION
   ========================================================= */

function parseISO8601Duration(duration) {

  if (!duration) return "—";

  const match =
    duration.match(
      /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/
    );

  if (!match) return "—";

  const hours =
    Number(match[1] || 0);

  const minutes =
    Number(match[2] || 0);

  const seconds =
    Number(match[3] || 0);

  const total =
    hours * 3600 +
    minutes * 60 +
    seconds;

  return formatTime(total);
}

/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeHTML(str) {

  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function decodeHTML(str) {

  const textarea =
    document.createElement("textarea");

  textarea.innerHTML = str;

  return textarea.value;
}

/* =========================================================
   SERVICE WORKER
   ========================================================= */

if ("serviceWorker" in navigator) {

  window.addEventListener(
    "load",
    () => {

      navigator.serviceWorker
        .register("sw.js")
        .catch(err => {

          console.log(
            "Service Worker:",
            err
          );
        });
    }
  );
}

/* =========================================================
   START
   ========================================================= */

init();
