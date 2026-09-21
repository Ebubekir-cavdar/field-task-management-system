import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Mic, Download, AlertTriangle, Loader2 } from 'lucide-react';

export default function AudioPlayer({ src, title = 'Saha Sesli Açıklaması' }) {
  const audioRef = useRef(null);
  const [effectiveSrc, setEffectiveSrc] = useState(src);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setIsError(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    if (!src) {
      setIsLoading(false);
      setEffectiveSrc(null);
      return;
    }

    // If the URL ends with .m4a, check if a .wav version is available on the server
    if (src.endsWith('.m4a')) {
      const wavUrl = src.slice(0, -4) + '.wav';
      fetch(wavUrl, { method: 'HEAD' })
        .then((res) => {
          if (!isCancelled) {
            if (res.ok) {
              setEffectiveSrc(wavUrl);
            } else {
              setEffectiveSrc(src);
            }
          }
        })
        .catch(() => {
          if (!isCancelled) setEffectiveSrc(src);
        });
    } else {
      setEffectiveSrc(src);
    }

    return () => {
      isCancelled = true;
    };
  }, [src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !effectiveSrc) return;

    setIsLoading(true);
    setIsError(false);

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
      setIsLoading(false);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = (e) => {
      console.warn('Audio playback error:', e);
      setIsError(true);
      setIsLoading(false);
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    if (audio.readyState >= 1) {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
      setIsLoading(false);
    }

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [effectiveSrc]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || isError || isLoading) return;
    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.warn('Audio play toggle error:', err);
      setIsError(true);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio) return;
    const seekTime = Number(e.target.value);
    audio.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const formatTime = (timeInSec) => {
    if (isNaN(timeInSec) || !isFinite(timeInSec)) return '00:00';
    const mins = Math.floor(timeInSec / 60);
    const secs = Math.floor(timeInSec % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const downloadFilename = effectiveSrc?.endsWith('.wav') ? 'ses_kaydi.wav' : 'ses_kaydi.m4a';

  return (
    <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5 flex flex-col gap-2.5">
      {effectiveSrc && (
        <audio
          ref={audioRef}
          src={effectiveSrc}
          preload="metadata"
          crossOrigin="anonymous"
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-300 font-semibold">
          <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
            <Mic className="w-3.5 h-3.5" />
          </div>
          <span>{title}</span>
        </div>
        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
          {isLoading && <Loader2 className="w-3 h-3 animate-spin text-blue-400" />}
          <span>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Error state fallback */}
      {isError ? (
        <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-between gap-2 text-xs text-amber-300">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Tarayıcı bu ses dosyasını oynatamadı.</span>
          </div>
          <a
            href={effectiveSrc || src}
            target="_blank"
            rel="noreferrer"
            download={downloadFilename}
            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 rounded text-[11px] font-bold text-amber-200 flex items-center gap-1 shrink-0"
          >
            <Download className="w-3.5 h-3.5" /> İndir
          </a>
        </div>
      ) : (
        /* Player controls */
        <div className="flex items-center gap-3">
          {/* Play/Pause Button */}
          <button
            type="button"
            onClick={togglePlay}
            disabled={isLoading || !effectiveSrc}
            className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white flex items-center justify-center shadow-md shadow-blue-500/20 transition-all shrink-0 active:scale-95 cursor-pointer"
            title={isPlaying ? 'Duraklat' : 'Oynat'}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-4 h-4 fill-white" />
            ) : (
              <Play className="w-4 h-4 fill-white ml-0.5" />
            )}
          </button>

          {/* Scrubber timeline */}
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            disabled={isLoading || !duration}
            className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50"
          />

          {/* Mute Button */}
          <button
            type="button"
            onClick={toggleMute}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
            title={isMuted ? 'Sesi Aç' : 'Sesi Kapat'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Direct Download Link */}
          <a
            href={effectiveSrc || src}
            target="_blank"
            rel="noreferrer"
            download={downloadFilename}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
            title={`Sesi İndir (${downloadFilename})`}
          >
            <Download className="w-4 h-4" />
          </a>
        </div>
      )}
    </div>
  );
}
