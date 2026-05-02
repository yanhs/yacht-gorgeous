let scApiLoaded = false;
  function loadSCApi() {
    if (scApiLoaded) return;
    scApiLoaded = true;
    const s = document.createElement('script');
    s.src = 'https://w.soundcloud.com/player/api.js';
    s.onload = () => { setTimeout(initWidgets, 300); };
    document.head.appendChild(s);
  }

  let playlistOpen = false;
  let isPlaying = false;
  let playingCount = 0;
  let lastVolume = 80;
  const widgets = [];
  const widgetIds = ['scWidget1', 'scWidget2', 'scWidget3', 'scWidget4', 'scWidget5'];

  const volSlider = document.getElementById('volSlider');
  const volLevel = document.getElementById('volLevel');
  const volIconSvg = document.getElementById('volIcon');

  // Seek positions per widget (ms)
  // 0: 🌅 Daydream 0:39 | 1: 🐬 Really Sayin 0:40 | 2: 🎉 I Feel Good 0:20 | 3: 💍 Don't Worry 0:25 | 4: 🏢 Shakin — no seek
  const seekConfig = [0, 80000, 20000, 25000, 0];
  const seekDone = [false, false, false, false, false];
  const widgetReady = [false, false, false, false, false];

  function initWidgets() {
    try {
      widgetIds.forEach((id, idx) => {
        const el = document.getElementById(id);
        if (!el) return;
        const w = SC.Widget(el);
        widgets[idx] = w;
        w.bind(SC.Widget.Events.READY, () => {
          widgetReady[idx] = true;
          w.setVolume(lastVolume);
          console.log('SC widget ' + idx + ' ready');
        });
        w.bind(SC.Widget.Events.PLAY, () => {
          playingCount++;
          updateBtn();
          if (seekConfig[idx] && !seekDone[idx]) {
            seekDone[idx] = true;
            w.seekTo(seekConfig[idx]);
          }
        });
        w.bind(SC.Widget.Events.PAUSE, () => { playingCount = Math.max(0, playingCount - 1); updateBtn(); });
        w.bind(SC.Widget.Events.FINISH, () => { playingCount = Math.max(0, playingCount - 1); updateBtn(); seekDone[idx] = false; });
      });
    } catch(e) { console.error('initWidgets error:', e); }
  }

  let iframesLoaded = false;
  function loadIframes() {
    if (iframesLoaded) return;
    iframesLoaded = true;
    widgetIds.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.dataset.src && !el.src) {
        el.src = el.dataset.src;
      }
    });
    loadSCApi();
  }

  // Metallic click sound via Web Audio API
  let audioCtx = null;
  function playClickSound() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtx;
      const t = ctx.currentTime;

      // 1. Soft brass "tink" — latch releasing
      const osc1 = ctx.createOscillator();
      const g1 = ctx.createGain();
      const filt1 = ctx.createBiquadFilter();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(900, t);
      osc1.frequency.exponentialRampToValueAtTime(350, t + 0.06);
      filt1.type = 'lowpass';
      filt1.frequency.setValueAtTime(2000, t);
      g1.gain.setValueAtTime(0.15, t);
      g1.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc1.connect(filt1);
      filt1.connect(g1);
      g1.connect(ctx.destination);
      osc1.start(t);
      osc1.stop(t + 0.12);

      // 2. Warm resonant thud — hinge opening
      const osc2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      const filt2 = ctx.createBiquadFilter();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(180, t + 0.05);
      osc2.frequency.exponentialRampToValueAtTime(80, t + 0.2);
      filt2.type = 'lowpass';
      filt2.frequency.setValueAtTime(600, t + 0.05);
      g2.gain.setValueAtTime(0.12, t + 0.05);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc2.connect(filt2);
      filt2.connect(g2);
      g2.connect(ctx.destination);
      osc2.start(t + 0.05);
      osc2.stop(t + 0.25);

      // 3. Subtle high harmonic ring — polished brass overtone
      const osc3 = ctx.createOscillator();
      const g3 = ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(2400, t + 0.02);
      osc3.frequency.exponentialRampToValueAtTime(1800, t + 0.15);
      g3.gain.setValueAtTime(0.04, t + 0.02);
      g3.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc3.connect(g3);
      g3.connect(ctx.destination);
      osc3.start(t + 0.02);
      osc3.stop(t + 0.2);
    } catch(e) {}
  }

  function togglePlaylist() {
    playlistOpen = !playlistOpen;
    document.getElementById('playlistPanel').classList.toggle('open', playlistOpen);
    document.getElementById('musicBtn').classList.toggle('lid-open', playlistOpen);
    playClickSound();
    if (playlistOpen) loadIframes();
  }

  // ===== VINYL TRACK NAVIGATION =====
  const vinylTracks = [
    { icon: '🌅', name: "Ain't No Mountain", cruise: 'SUNSET CRUISE' },
    { icon: '🐬', name: 'Like It Like That', cruise: 'DOLPHIN WATCHING' },
    { icon: '🎉', name: 'I Got You (I Feel Good)', cruise: 'CELEBRATION CRUISE' },
    { icon: '💍', name: "Don't Worry Be Happy", cruise: 'ROMANTIC CRUISE' },
    { icon: '🏢', name: "Shakin' All Over", cruise: 'CORPORATE EVENT' }
  ];
  let currentVinylTrack = 0;

  // Build dots
  (function() {
    const dotsEl = document.getElementById('vinylDots');
    if (!dotsEl) return;
    for (let i = 0; i < vinylTracks.length; i++) {
      const d = document.createElement('div');
      d.className = 'vinyl-dot-ind' + (i === 0 ? ' active' : '');
      dotsEl.appendChild(d);
    }
  })();

  function showVinylTrack(idx) {
    const wasPlaying = isPlaying;
    // Pause all
    widgets.forEach((w, i) => { if (w) try { w.pause(); } catch(e){} });
    playingCount = 0;
    currentVinylTrack = idx;
    const t = vinylTracks[idx];
    document.getElementById('vTrackIcon').textContent = t.icon;
    document.getElementById('vTrackNameArc').textContent = t.name;
    document.getElementById('vTrackCruiseArc').textContent = t.cruise;
    // Update dots
    document.querySelectorAll('.vinyl-dot-ind').forEach((d, i) => {
      d.classList.toggle('active', i === idx);
    });
    // Auto-play new track if was playing
    if (wasPlaying && widgets[idx] && widgetReady[idx]) {
      seekDone[idx] = false;
      widgets[idx].play();
    } else {
      updateBtn();
    }
  }

  function vinylNext() {
    showVinylTrack((currentVinylTrack + 1) % vinylTracks.length);
  }
  function vinylPrev() {
    showVinylTrack((currentVinylTrack - 1 + vinylTracks.length) % vinylTracks.length);
  }

  function updateBtn() {
    isPlaying = playingCount > 0;
    const btn = document.getElementById('musicBtn');
    const icon = btn.querySelector('.play-icon');
    btn.classList.toggle('playing', isPlaying);
    icon.textContent = isPlaying ? '⏸' : '▶';
    icon.style.opacity = isPlaying ? '0' : '1';
    // Spin the whole disc (panel)
    const panel = document.getElementById('playlistPanel');
    if (panel) panel.classList.toggle('spinning', isPlaying);
    // Update vinyl play button
    const vpb = document.getElementById('vinylPlayBtn');
    if (vpb) vpb.textContent = isPlaying ? '⏸' : '▶';
  }

  let _vinylRetry = 0;
  function vinylTogglePlay() {
    // Ensure iframes & API are loaded
    loadIframes();
    const idx = currentVinylTrack;
    if (!widgets[idx] || !widgetReady[idx]) {
      // Widget not ready yet — show loading state and retry
      const vpb = document.getElementById('vinylPlayBtn');
      if (vpb) vpb.textContent = '⏳';
      if (_vinylRetry < 15) {
        _vinylRetry++;
        setTimeout(vinylTogglePlay, 600);
      } else {
        if (vpb) vpb.textContent = '▶';
        _vinylRetry = 0;
      }
      return;
    }
    _vinylRetry = 0;
    if (isPlaying) {
      widgets[idx].pause();
    } else {
      // Pause all others first
      widgets.forEach((w, i) => {
        if (w && i !== idx) { try { w.pause(); } catch(e){} }
      });
      playingCount = 0;
      seekDone[idx] = false;
      widgets[idx].play();
    }
  }

  // Volume control for all widgets
  let wasPaused = []; // track which widgets were playing before mute

  function applyVolume(val) {
    val = parseInt(val);
    widgets.forEach((w, i) => {
      try {
        w.setVolume(val);
        // If volume is 0, pause playing widgets; if restored, resume them
        if (val === 0) {
          w.isPaused(function(paused) {
            if (!paused) {
              wasPaused[i] = true;
              w.pause();
            }
          });
        } else if (wasPaused[i]) {
          wasPaused[i] = false;
          w.play();
        }
      } catch(e) {}
    });
  }

  function updateVolumeUI(val) {
    val = Math.max(0, Math.min(100, parseInt(val)));
    volSlider.value = val;
    volSlider.style.setProperty('--val', val + '%');
    volLevel.textContent = val + '%';
    applyVolume(val);
    if (val === 0) {
      volIconSvg.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>';
    } else if (val < 50) {
      volIconSvg.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>';
    } else {
      volIconSvg.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>';
    }
  }

  volSlider.addEventListener('input', function() {
    const val = parseInt(this.value);
    lastVolume = val > 0 ? val : lastVolume;
    updateVolumeUI(val);
  });
  volSlider.addEventListener('change', function() {
    const val = parseInt(this.value);
    lastVolume = val > 0 ? val : lastVolume;
    updateVolumeUI(val);
  });
  volSlider.addEventListener('touchstart', function(e) { e.stopPropagation(); }, { passive: true });
  volSlider.addEventListener('touchmove', function(e) { e.stopPropagation(); }, { passive: true });

  function volDown() {
    const val = Math.max(0, parseInt(volSlider.value) - 10);
    lastVolume = val > 0 ? val : lastVolume;
    updateVolumeUI(val);
  }

  function volUp() {
    const val = Math.min(100, parseInt(volSlider.value) + 10);
    lastVolume = val > 0 ? val : lastVolume;
    updateVolumeUI(val);
  }

  function toggleMute() {
    if (parseInt(volSlider.value) > 0) {
      lastVolume = parseInt(volSlider.value) || 80;
      updateVolumeUI(0);
    } else {
      updateVolumeUI(lastVolume);
    }
  }

  // Close playlist on click outside
  document.addEventListener('click', (e) => {
    if (playlistOpen && !e.target.closest('#playlistPanel') && !e.target.closest('#musicBtn')) {
      playlistOpen = false;
      document.getElementById('playlistPanel').classList.remove('open');
    }
  });

  // ===== MUSIC SECTION INTEGRATION =====

  function openMusicTab() {
    showTab('music');
    // Ensure SC iframes are loaded
    loadIframes();
    // Open the floating playlist panel if not already open
    if (!playlistOpen) {
      playlistOpen = true;
      document.getElementById('playlistPanel').classList.add('open');
      document.getElementById('musicBtn').classList.add('lid-open');
    }
  }

  function musicPlayTrack(idx) {
    showVinylTrack(idx);
    // Small delay to let track switch, then ensure playing
    setTimeout(function() {
      if (!isPlaying) {
        vinylTogglePlay();
      }
    }, 100);
    updateMusicSection();
  }

  function musicVinylPlayCurrent() {
    vinylTogglePlay();
    // Sync after toggle
    setTimeout(updateMusicSection, 200);
  }

  function updateMusicSection() {
    var cards = document.querySelectorAll('.music-track-card');
    cards.forEach(function(card) {
      var idx = parseInt(card.getAttribute('data-track'));
      card.classList.toggle('active', idx === currentVinylTrack);
      card.classList.toggle('playing', idx === currentVinylTrack && isPlaying);
      var playBtn = card.querySelector('.music-track-play');
      if (playBtn) {
        playBtn.textContent = (idx === currentVinylTrack && isPlaying) ? '⏸' : '▶';
      }
    });

    // Update inline vinyl
    var t = vinylTracks[currentVinylTrack];
    var vinylIcon = document.getElementById('musicVinylIcon');
    var vinylName = document.getElementById('musicVinylName');
    var vinylCruise = document.getElementById('musicVinylCruise');
    var vinylPlay = document.getElementById('musicVinylPlayBtn');
    var vinylDisc = document.getElementById('musicVinyl');
    if (vinylIcon) vinylIcon.textContent = t.icon;
    if (vinylName) vinylName.textContent = t.name;
    if (vinylCruise) vinylCruise.textContent = t.cruise;
    if (vinylPlay) vinylPlay.textContent = isPlaying ? '⏸' : '▶';
    if (vinylDisc) vinylDisc.classList.toggle('spinning', isPlaying);
  }

  // Patch the existing updateBtn to also sync the music section
  var _origUpdateBtn = updateBtn;
  updateBtn = function() {
    _origUpdateBtn();
    updateMusicSection();
  };

  // Music section volume controls
  function musicVolSliderInput(val) {
    val = parseInt(val);
    lastVolume = val > 0 ? val : lastVolume;
    updateVolumeUI(val);
    syncMusicVolUI(val);
  }

  function musicVolChange(delta) {
    var current = parseInt(document.getElementById('musicVolSlider').value);
    var val = Math.max(0, Math.min(100, current + delta));
    lastVolume = val > 0 ? val : lastVolume;
    updateVolumeUI(val);
    syncMusicVolUI(val);
  }

  function musicToggleMute() {
    var slider = document.getElementById('musicVolSlider');
    if (parseInt(slider.value) > 0) {
      lastVolume = parseInt(slider.value) || 80;
      updateVolumeUI(0);
      syncMusicVolUI(0);
    } else {
      updateVolumeUI(lastVolume);
      syncMusicVolUI(lastVolume);
    }
  }

  function syncMusicVolUI(val) {
    val = Math.max(0, Math.min(100, parseInt(val)));
    var slider = document.getElementById('musicVolSlider');
    var pct = document.getElementById('musicVolPct');
    var iconSvg = document.getElementById('musicVolIconSvg');
    if (slider) {
      slider.value = val;
      slider.style.setProperty('--val', val + '%');
    }
    if (pct) pct.textContent = val + '%';
    if (iconSvg) {
      if (val === 0) {
        iconSvg.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>';
      } else if (val < 50) {
        iconSvg.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>';
      } else {
        iconSvg.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>';
      }
    }
  }

  // Also patch updateVolumeUI to sync the music section slider
  var _origUpdateVolumeUI = updateVolumeUI;
  updateVolumeUI = function(val) {
    _origUpdateVolumeUI(val);
    syncMusicVolUI(val);
  };
