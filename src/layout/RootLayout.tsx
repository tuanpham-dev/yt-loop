import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { YouTubePlayer, type PlayerHandle } from '../player/YouTubePlayer';
import { RangeSlider } from '../player/RangeSlider';
import { usePlaybackController } from '../player/usePlaybackController';
import { ErrorBanner } from '../ui/ErrorBanner';
import { useActiveItem, useActivePlaylist, useDispatch, usePlaylists } from '../state/PlaylistsContext';
import { TopBar } from './TopBar';

const supportsDocPip = 'documentPictureInPicture' in window;

export function RootLayout() {
  const playerRef = useRef<PlayerHandle>(null);
  const activeItem = useActiveItem();
  const activePlaylist = useActivePlaylist();
  const dispatch = useDispatch();
  const { activePlaylistId, isPlaying } = usePlaylists();

  const [isPip, setIsPip] = useState(false);
  const [isDocPipOpen, setIsDocPipOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const savedVolumeRef = useRef(100);
  // pipNavSeq increments on every pip prev/next so the pip:load effect fires
  // even when the active item id doesn't change (single-item playlists).
  const [pipNavSeq, setPipNavSeq] = useState(0);

  useEffect(() => {
    if (activeItem && activePlaylist) {
      document.title = `YouTube Loop - ${activePlaylist.name} - ${activeItem.title}`;
    } else {
      document.title = 'YouTube Loop';
    }
  }, [activeItem, activePlaylist]);

  // Carries the PiP playhead into the main player when the PiP window closes.
  const pipResumeRef = useRef<number | null>(null);
  const controls = usePlaybackController(playerRef, isDocPipOpen, pipResumeRef);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const docPipWinRef = useRef<Window | null>(null);
  // Prevents the observer from re-activating scroll-PiP while scrolling back to the player.
  const pipLockedRef = useRef(false);
  const activeItemRef = useRef(activeItem);
  useEffect(() => { activeItemRef.current = activeItem; }, [activeItem]);

  useEffect(() => {
    const el = playerContainerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (window.innerWidth < 768 || !activeItemRef.current || isDocPipOpen) return;
        if (!entry.isIntersecting && !pipLockedRef.current) {
          setIsPip(true);
        } else if (entry.isIntersecting) {
          pipLockedRef.current = false;
          setIsPip(false);
        }
      },
      { threshold: 0 },
    );
    observer.observe(el);
    const onResize = () => { if (window.innerWidth < 768) setIsPip(false); };
    window.addEventListener('resize', onResize);
    return () => { observer.disconnect(); window.removeEventListener('resize', onResize); };
  }, [isDocPipOpen]);

  useEffect(() => { if (!activeItem) setIsPip(false); }, [activeItem]);

  // Tracks the last known currentTime reported by the pip player via infoDelivery.
  const lastPipTimeRef = useRef(0);

  const openDocPip = useCallback(async () => {
    if (!supportsDocPip || !activeItem) return;
    const startSec = Math.floor(playerRef.current?.getCurrentTime() ?? 0);
    lastPipTimeRef.current = startSec;
    dispatch({ type: 'SET_PLAYING', isPlaying: false });

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // 16:9 exactly (480x270): the window matches the video's aspect ratio so
      // Chrome doesn't resize/reposition it when playback starts. Controls are
      // overlaid on the video (see styles below) rather than in a separate strip,
      // which would make the window taller than 16:9 and trigger that resize.
      const pipWin: Window = await (window as any).documentPictureInPicture.requestWindow({
        width: 480,
        height: 270,
      });
      docPipWinRef.current = pipWin;
      setIsDocPipOpen(true);

      const safeTitle = activeItem.title
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const rawOrigin = window.location.origin;
      const videoId = activeItem.videoId;

      // Drive the PiP player with the official YouTube IFrame API instead of a
      // hand-rolled postMessage handshake. The official API reliably establishes
      // the event channel, so onStateChange (ENDED) actually fires and the
      // playlist auto-advances when a video finishes. A full HTML document is
      // required — YouTube rejects embeds in about:blank (error 153).
      pipWin.document.open();
      pipWin.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;background:#000;overflow:hidden}
body{position:relative}
/* Video fills the whole 16:9 window; controls overlay on top so the window
   stays exactly 16:9 and Chrome won't resize/move it when playback starts. */
#player{position:absolute;inset:0;width:100%;height:100%;border:none;display:block}
#bar{position:absolute;left:0;right:0;bottom:0;z-index:2;display:flex;align-items:center;gap:5px;padding:6px 8px;background:linear-gradient(to top,rgba(0,0,0,.78),rgba(0,0,0,0));opacity:0;transition:opacity .15s}
body:hover #bar{opacity:1}
#ttl{flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-family:sans-serif;font-size:12px;font-weight:bold;color:#fff;text-shadow:0 1px 2px #000}
.btn{background:rgba(253,251,247,.94);color:#2d2d2d;border:2px solid #2d2d2d;padding:3px 10px;border-radius:4px;cursor:pointer;font-size:13px;line-height:1.3}
.btn:hover{background:#fff9c4}
#pp{background:#ff4d4d;color:#fff;border-color:#2d2d2d}
#pp:hover{background:#ff6b6b}
</style></head><body>
<div id="player"></div>
<div id="bar">
  <span id="ttl">${safeTitle}</span>
  <button class="btn" id="pv">⏮</button>
  <button class="btn" id="pp">⏸</button>
  <button class="btn" id="nx">⏭</button>
</div>
<script>
(function(){
  var player=null,playing=true,ORIGIN='${rawOrigin}',
      INITIAL_VIDEO='${videoId}',INITIAL_START=${startSec},
      pp=document.getElementById('pp'),ttl=document.getElementById('ttl');

  function toOpener(t){if(window.opener)window.opener.postMessage({type:t},'*');}

  document.getElementById('pv').onclick=function(){toOpener('pip:prev');};
  document.getElementById('nx').onclick=function(){toOpener('pip:next');};
  pp.onclick=function(){if(!player)return;if(playing)player.pauseVideo();else player.playVideo();};

  window.onYouTubeIframeAPIReady=function(){
    player=new YT.Player('player',{
      width:'100%',height:'100%',videoId:INITIAL_VIDEO,
      playerVars:{autoplay:1,start:INITIAL_START,rel:0,playsinline:1,modestbranding:1,origin:ORIGIN},
      events:{
        onReady:function(e){e.target.playVideo();},
        onStateChange:function(e){
          // 0=ENDED 1=PLAYING 2=PAUSED
          if(e.data===0){toOpener('pip:next');}
          else if(e.data===1){playing=true;pp.textContent='⏸';}
          else if(e.data===2){playing=false;pp.textContent='▶';}
        }
      }
    });
  };
  var s=document.createElement('script');
  s.src='https://www.youtube.com/iframe_api';
  document.head.appendChild(s);

  // Keep the window locked to 16:9 as the user resizes. Chrome snaps a Document
  // PiP window to the playing video's aspect ratio (~1s after play), repositioning
  // it — very visible after a manual resize. Pre-snapping to 16:9 ourselves means
  // the window is already correct when playback starts, so Chrome never moves it.
  var relocking=false;
  function lockAspect(){
    if(relocking)return;
    var iw=window.innerWidth,targetH=Math.round(iw*9/16);
    if(Math.abs(window.innerHeight-targetH)>2){
      relocking=true;
      // resizeTo needs user activation in a PiP window — present during a user
      // drag-resize (where we want this), absent for Chrome's own snap (where the
      // aspect is already correct, so the throw is harmless).
      try{window.resizeTo(iw+(window.outerWidth-window.innerWidth),targetH+(window.outerHeight-window.innerHeight));}catch(e){}
      setTimeout(function(){relocking=false;},60);
    }
  }
  window.addEventListener('resize',lockAspect);

  // Report position so the opener can resume the main player at the right spot on close.
  setInterval(function(){
    if(player&&player.getCurrentTime&&window.opener){
      window.opener.postMessage({type:'pip:time',t:player.getCurrentTime()},'*');
    }
  },1000);

  // Opener pushes the next/prev video in here; loadVideoById autoplays it.
  window.addEventListener('message',function(e){
    if(!e.data||typeof e.data!=='object')return;
    if(e.data.type==='pip:load'&&player){
      ttl.textContent=e.data.title||'';
      playing=true;pp.textContent='⏸';
      player.loadVideoById({videoId:e.data.videoId,startSeconds:e.data.startSec||0});
    }
  });
})();
</script>
</body></html>`);
      pipWin.document.close();

      pipWin.addEventListener('pagehide', () => {
        // Resume the main player at the PiP playhead. seekTo covers the case where
        // the video is unchanged (no reload); pipResumeRef covers the case where
        // PiP advanced to a new video, so the controller's reload starts there.
        pipResumeRef.current = lastPipTimeRef.current;
        playerRef.current?.seekTo(lastPipTimeRef.current);
        docPipWinRef.current = null;
        setIsDocPipOpen(false);
        dispatch({ type: 'SET_PLAYING', isPlaying: true });
      });
    } catch {
      setIsDocPipOpen(false);
    }
  }, [activeItem, dispatch]);

  // Forward pip:prev / pip:next to main state while pip window is open.
  useEffect(() => {
    if (!isDocPipOpen) return;
    const onMsg = (e: MessageEvent) => {
      if (e.source !== docPipWinRef.current) return;
      const type = e.data?.type;
      if (type === 'pip:next') { lastPipTimeRef.current = 0; dispatch({ type: 'NEXT' }); setPipNavSeq((n) => n + 1); }
      if (type === 'pip:prev') { lastPipTimeRef.current = 0; dispatch({ type: 'PREV' }); setPipNavSeq((n) => n + 1); }
      if (type === 'pip:time') lastPipTimeRef.current = e.data.t;
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [isDocPipOpen, dispatch]);

  // When active item changes or pip nav fires (even for same item), push the video into the pip window.
  // docPipWinRef.current is null until the pip window opens, so the initial render is a no-op.
  useEffect(() => {
    if (!activeItem || !docPipWinRef.current) return;
    docPipWinRef.current.postMessage(
      { type: 'pip:load', videoId: activeItem.videoId, startSec: 0, title: activeItem.title },
      '*',
    );
  // pipNavSeq triggers this even when activeItem.id is unchanged (single-item playlists).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeItem?.id, pipNavSeq]);

  const expandPip = () => {
    pipLockedRef.current = true;
    setIsPip(false);
    playerContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const onChangeStart = useCallback(
    (sec: number) => {
      if (!activeItem || !activePlaylistId) return;
      dispatch({
        type: 'UPDATE_ITEM',
        playlistId: activePlaylistId,
        itemId: activeItem.id,
        patch: { startSec: sec },
      });
    },
    [dispatch, activeItem, activePlaylistId],
  );

  const onChangeEnd = useCallback(
    (sec: number) => {
      if (!activeItem || !activePlaylistId) return;
      dispatch({
        type: 'UPDATE_ITEM',
        playlistId: activePlaylistId,
        itemId: activeItem.id,
        patch: { endSec: sec },
      });
    },
    [dispatch, activeItem, activePlaylistId],
  );

  const onCommitStart = useCallback((sec: number) => {
    playerRef.current?.seekTo(sec);
  }, []);

  const toggleMute = useCallback(() => {
    if (!activeItem || !activePlaylistId) return;
    if (isMuted) {
      setIsMuted(false);
      dispatch({ type: 'SET_VOLUME', playlistId: activePlaylistId, itemId: activeItem.id, volume: savedVolumeRef.current });
    } else {
      savedVolumeRef.current = activeItem.volume || 100;
      setIsMuted(true);
      dispatch({ type: 'SET_VOLUME', playlistId: activePlaylistId, itemId: activeItem.id, volume: 0 });
    }
  }, [activeItem, activePlaylistId, dispatch, isMuted]);

  return (
    <div className="flex min-h-full flex-col text-ink">
      <TopBar />

      <div className="mx-auto w-full max-w-5xl px-4 pt-4">
        <div
          ref={playerContainerRef}
          className={activeItem ? 'block' : 'sr-only'}
          aria-hidden={!activeItem}
        >
          {/* Spacer: preserves layout height while player is fixed in PiP */}
          {isPip && <div className="aspect-video w-full" aria-hidden />}

          <div
            className={
              isPip
                ? 'fixed bottom-4 right-4 z-50 w-72 overflow-hidden rounded-sketch border-[3px] border-ink bg-ink shadow-[6px_6px_0_0_rgba(45,45,45,0.45)] [transform:translateZ(0)]'
                : 'overflow-hidden rounded-sketch border-[3px] border-ink bg-ink shadow-sketch'
            }
          >
            <YouTubePlayer ref={playerRef} {...controls.playerHandlers} />

            {isPip && activeItem && (
              <div className="flex items-center gap-1.5 bg-paper px-2 py-1.5">
                <span className="min-w-0 flex-1 truncate font-hand text-xs font-bold text-ink">
                  {activeItem.title}
                </span>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'PREV' })}
                  aria-label="Previous"
                  className="rounded border-2 border-ink px-1.5 py-0.5 font-hand text-sm leading-none hover:bg-sticky-yellow"
                >
                  {'<'}
                </button>
                <button
                  type="button"
                  onClick={controls.togglePlay}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  className="rounded border-2 border-ink bg-accent px-2 py-0.5 font-hand text-sm font-bold leading-none text-paper hover:opacity-90"
                >
                  {isPlaying ? '❚❚' : '▶'}
                </button>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'NEXT' })}
                  aria-label="Next"
                  className="rounded border-2 border-ink px-1.5 py-0.5 font-hand text-sm leading-none hover:bg-sticky-yellow"
                >
                  {'>'}
                </button>
                <button
                  type="button"
                  onClick={expandPip}
                  aria-label="Expand player"
                  title="Back to player"
                  className="rounded border-2 border-ink px-1.5 py-0.5 font-hand text-sm leading-none hover:bg-sticky-green"
                >
                  ↗
                </button>
              </div>
            )}
          </div>
        </div>

        {activeItem && !isPip ? (
          <div className="mt-4 select-none overflow-hidden rounded-sketch-sm border-[3px] border-ink bg-paper-50 shadow-sketch-sm">
            <RangeSlider
              startSec={activeItem.startSec}
              endSec={activeItem.endSec}
              duration={controls.duration}
              currentTime={controls.currentTime}
              onChangeStart={onChangeStart}
              onChangeEnd={onChangeEnd}
              onCommitStart={onCommitStart}
            />

            {/* Player controls row */}
            <div className="flex items-center justify-between bg-paper px-4 py-3 sm:grid sm:grid-cols-[1fr_auto_1fr]">
              {/* Left spacer — desktop only, balances the right volume group */}
              <div className="hidden sm:block">
                {controls.duration <= 0 && (
                  <span className="font-hand text-xs text-ink-soft">Waiting for duration…</span>
                )}
              </div>

              {/* Transport buttons — left on mobile, centered on desktop */}
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  type="button"
                  onClick={controls.prev}
                  aria-label="Previous"
                  className="rounded-full border-2 border-ink bg-paper p-2 text-ink shadow-sketch-press transition-transform hover:bg-sticky-yellow active:scale-95"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                    <path d="M6 6h2v12H6V6zm3.5 6L18 18V6L9.5 12z"/>
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={controls.togglePlay}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  className="mx-1 flex h-11 w-11 items-center justify-center rounded-full border-2 border-ink bg-accent text-paper shadow-sketch-sm transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-sketch-press active:scale-95 active:shadow-none"
                >
                  {isPlaying ? (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 translate-x-[1px]">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  )}
                </button>

                <button
                  type="button"
                  onClick={controls.next}
                  aria-label="Next"
                  className="rounded-full border-2 border-ink bg-paper p-2 text-ink shadow-sketch-press transition-transform hover:bg-sticky-yellow active:scale-95"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                    <path d="M6 6v12l8.5-6zM16.5 6h2v12h-2z"/>
                  </svg>
                </button>
              </div>

              {/* Right: mute + volume slider + pip */}
              <div className="flex items-center justify-end gap-2">
                {/* Mute toggle */}
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                  className="rounded-full border-2 border-ink bg-paper p-2 text-ink shadow-sketch-press transition-transform hover:bg-sticky-yellow active:scale-95"
                >
                  {isMuted ? (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                    </svg>
                  )}
                </button>

                {/* Volume slider */}
                <div className="relative h-9 w-20 sm:w-24">
                  <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full border-2 border-ink bg-paper" />
                  <div
                    className="absolute top-1/2 h-2 -translate-y-1/2 rounded-l-full border-y-2 border-l-2 border-ink bg-accent/60"
                    style={{ width: `${activeItem.volume}%` }}
                  />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={activeItem.volume}
                    onChange={(e) => {
                      if (!activePlaylistId) return;
                      if (isMuted) setIsMuted(false);
                      dispatch({
                        type: 'SET_VOLUME',
                        playlistId: activePlaylistId,
                        itemId: activeItem.id,
                        volume: parseInt(e.target.value, 10),
                      });
                    }}
                    className="vol-thumb absolute inset-0 m-0 w-full"
                    aria-label="Volume"
                  />
                </div>

                {/* PiP */}
                {supportsDocPip && !isDocPipOpen && (
                  <button
                    type="button"
                    onClick={openDocPip}
                    aria-label="Open picture-in-picture"
                    title="Picture-in-picture"
                    className="hidden rounded-full border-2 border-ink bg-paper p-2 text-ink shadow-sketch-press transition-transform hover:bg-sticky-yellow active:scale-95 md:block"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                      <path d="M19 7h-8v6h8V7zm2-4H3C1.9 3 1 3.9 1 5v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {controls.error ? (
          <div className="mt-3">
            <ErrorBanner message={controls.error} onDismiss={controls.clearError} />
          </div>
        ) : null}
      </div>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
