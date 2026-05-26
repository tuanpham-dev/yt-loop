import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { YouTubePlayer, type PlayerHandle } from '../player/YouTubePlayer';
import { RangeSlider } from '../player/RangeSlider';
import { usePlaybackController } from '../player/usePlaybackController';
import { ErrorBanner } from '../ui/ErrorBanner';
import { useActiveItem, useDispatch, usePlaylists } from '../state/PlaylistsContext';
import { TopBar } from './TopBar';

const supportsDocPip = 'documentPictureInPicture' in window;

export function RootLayout() {
  const playerRef = useRef<PlayerHandle>(null);
  const controls = usePlaybackController(playerRef);
  const activeItem = useActiveItem();
  const dispatch = useDispatch();
  const { activePlaylistId, isPlaying } = usePlaylists();

  const [isPip, setIsPip] = useState(false);
  const [isDocPipOpen, setIsDocPipOpen] = useState(false);
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
      const pipWin: Window = await (window as any).documentPictureInPicture.requestWindow({
        width: 480,
        height: 314,
      });
      docPipWinRef.current = pipWin;
      setIsDocPipOpen(true);

      const safeTitle = activeItem.title
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const embedSrc =
        `https://www.youtube.com/embed/${activeItem.videoId}` +
        `?autoplay=1&start=${startSec}&rel=0&playsinline=1&enablejsapi=1`;

      // Write a full HTML document — YouTube rejects embeds in about:blank (error 153).
      pipWin.document.open();
      pipWin.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;background:#000;overflow:hidden;display:flex;flex-direction:column}
#player{flex:1;width:100%;border:none;display:block}
#bar{background:#fdfbf7;display:flex;align-items:center;gap:5px;padding:5px 8px;border-top:2px solid #2d2d2d;flex-shrink:0}
#ttl{flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-family:sans-serif;font-size:12px;font-weight:bold;color:#2d2d2d}
.btn{background:#fdfbf7;color:#2d2d2d;border:2px solid #2d2d2d;padding:3px 10px;border-radius:4px;cursor:pointer;font-size:13px;line-height:1.3}
.btn:hover{background:#fff9c4}
#pp{background:#ff4d4d;color:#fff;border-color:#2d2d2d}
#pp:hover{background:#ff6b6b}
</style></head><body>
<iframe id="player" src="${embedSrc}" allow="autoplay; fullscreen" allowfullscreen></iframe>
<div id="bar">
  <span id="ttl">${safeTitle}</span>
  <button class="btn" id="pv">⏮</button>
  <button class="btn" id="pp">⏸</button>
  <button class="btn" id="nx">⏭</button>
</div>
<script>
(function(){
  var fr=document.getElementById('player'),pp=document.getElementById('pp'),
      ttl=document.getElementById('ttl'),playing=false;

  // Register as a listener so YouTube sends onStateChange/onReady events back.
  fr.addEventListener('load',function(){
    fr.contentWindow.postMessage(JSON.stringify({event:'listening',id:1}),'*');
  });

  function ytCmd(fn){
    fr.contentWindow.postMessage(JSON.stringify({event:'command',func:fn,args:[]}),'*');
  }
  document.getElementById('pv').onclick=function(){window.opener.postMessage({type:'pip:prev'},'*');};
  document.getElementById('nx').onclick=function(){window.opener.postMessage({type:'pip:next'},'*');};
  pp.onclick=function(){ytCmd(playing?'pauseVideo':'playVideo');};

  window.addEventListener('message',function(e){
    if(e.source===fr.contentWindow){
      try{
        var d=typeof e.data==='string'?JSON.parse(e.data):e.data;
        if(d&&d.event==='onReady'){ytCmd('playVideo');}
        if(d&&d.event==='infoDelivery'&&d.info&&d.info.currentTime!=null){
          window.opener.postMessage({type:'pip:time',t:d.info.currentTime},'*');
        }
        if(d&&d.event==='onStateChange'){
          if(d.info===0){window.opener.postMessage({type:'pip:next'},'*');}
          else if(d.info===1){playing=true;pp.textContent='⏸';}
          else if(d.info===2){playing=false;pp.textContent='▶';}
        }
      }catch(x){}
      return;
    }
    if(!e.data||typeof e.data!=='object')return;
    if(e.data.type==='pip:load'){
      fr.src='https://www.youtube.com/embed/'+e.data.videoId+
        '?autoplay=1&start='+(e.data.startSec||0)+'&rel=0&playsinline=1&enablejsapi=1';
      ttl.textContent=e.data.title||'';
      playing=false;pp.textContent='⏸';
    }
  });
})();
</script>
</body></html>`);
      pipWin.document.close();

      pipWin.addEventListener('pagehide', () => {
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
      if (type === 'pip:next') { lastPipTimeRef.current = 0; dispatch({ type: 'NEXT' }); }
      if (type === 'pip:prev') { lastPipTimeRef.current = 0; dispatch({ type: 'PREV' }); }
      if (type === 'pip:time') lastPipTimeRef.current = e.data.t;
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [isDocPipOpen, dispatch]);

  // When active item changes while pip is open, push the new video into the pip window.
  // Dep is activeItem?.id only — we intentionally skip the initial render
  // (initial video is already written by document.write in openDocPip).
  const prevPipItemIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeItem || !docPipWinRef.current) return;
    if (prevPipItemIdRef.current === activeItem.id) return;
    prevPipItemIdRef.current = activeItem.id;
    docPipWinRef.current.postMessage(
      { type: 'pip:load', videoId: activeItem.videoId, startSec: 0, title: activeItem.title },
      '*',
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeItem?.id]);

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

  return (
    <div className="flex min-h-full flex-col text-ink">
      <TopBar controls={controls} />

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
                ? 'fixed bottom-4 right-4 z-50 w-72 overflow-hidden rounded-sketch border-[3px] border-ink bg-ink shadow-[6px_6px_0_0_rgba(45,45,45,0.45)]'
                : 'relative overflow-hidden rounded-sketch border-[3px] border-ink bg-ink shadow-sketch'
            }
          >
            <YouTubePlayer ref={playerRef} {...controls.playerHandlers} />

            {/* Document PiP button — overlaid top-right of the video, desktop only */}
            {supportsDocPip && activeItem && !isPip && !isDocPipOpen && (
              <button
                type="button"
                onClick={openDocPip}
                aria-label="Open picture-in-picture"
                title="Picture-in-picture"
                className="absolute right-2 top-2 hidden rounded border-2 border-ink/60 bg-ink/50 px-2 py-1 font-hand text-xs text-paper backdrop-blur-sm hover:bg-ink/75 md:block"
              >
                ⧉ PiP
              </button>
            )}

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
          <div className="mt-4">
            <RangeSlider
              startSec={activeItem.startSec}
              endSec={activeItem.endSec}
              duration={controls.duration}
              currentTime={controls.currentTime}
              onChangeStart={onChangeStart}
              onChangeEnd={onChangeEnd}
              onCommitStart={onCommitStart}
            />
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
