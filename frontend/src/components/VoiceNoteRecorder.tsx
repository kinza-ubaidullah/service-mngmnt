import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, Play, Pause, Trash2 } from 'lucide-react';

interface VoiceNoteRecorderProps {
  value: string;
  onChange: (dataUrl: string) => void;
}

const getSupportedMimeType = (): string => {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) || '';
};

const VoiceNoteRecorder: React.FC<VoiceNoteRecorderProps> = ({ value, onChange }) => {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playError, setPlayError] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mimeTypeRef = useRef('');
  const blobUrlRef = useRef<string | null>(null);

  const revokeBlobUrl = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  };

  useEffect(() => () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    revokeBlobUrl();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  }, []);

  useEffect(() => {
    if (!value) {
      revokeBlobUrl();
      setPlaying(false);
      setPlayError('');
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    }
  }, [value]);

  const getPlaybackSrc = () => blobUrlRef.current || value;

  const startRecording = async () => {
    try {
      setPlayError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      mimeTypeRef.current = mimeType;
      const options = mimeType ? { mimeType } : undefined;
      const recorder = new MediaRecorder(stream, options);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const type = mimeTypeRef.current || chunksRef.current[0]?.type || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        if (blob.size === 0) {
          setPlayError('Recording empty — try again');
          return;
        }

        revokeBlobUrl();
        blobUrlRef.current = URL.createObjectURL(blob);
        const reader = new FileReader();
        reader.onload = () => onChange(reader.result as string);
        reader.readAsDataURL(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setRecording(true);
      setDuration(0);
      timerRef.current = window.setInterval(() => {
        setDuration((d) => {
          if (d >= 120) {
            stopRecording();
            return d;
          }
          return d + 1;
        });
      }, 1000);
    } catch {
      alert('Microphone access denied. Please allow mic permission.');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.requestData();
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  const togglePlay = async () => {
    const src = getPlaybackSrc();
    if (!src) return;

    const audio = audioRef.current ?? new Audio();
    audioRef.current = audio;

    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }

    try {
      setPlayError('');
      audio.pause();
      audio.currentTime = 0;
      audio.src = src;
      audio.load();
      audio.onended = () => setPlaying(false);
      audio.onerror = () => {
        setPlaying(false);
        setPlayError('Cannot play audio — re-record');
      };
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
      setPlayError('Tap play again or re-record');
    }
  };

  const handleDelete = () => {
    revokeBlobUrl();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setPlaying(false);
    setPlayError('');
    onChange('');
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="bg-white border border-slate-200/70 rounded-2xl p-4">
      <audio ref={audioRef} className="hidden" preload="auto" />

      {!value && !recording && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">Tap mic to record voice note</p>
          <button
            type="button"
            onClick={startRecording}
            className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-all active:scale-95"
          >
            <Mic size={22} className="text-white" />
          </button>
        </div>
      )}

      {recording && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-bold text-red-400">{formatTime(duration)}</span>
            <div className="flex-1 h-1 bg-mint-50 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 animate-pulse rounded-full" style={{ width: '60%' }} />
            </div>
          </div>
          <button
            type="button"
            onClick={stopRecording}
            className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center"
          >
            <Square size={16} className="text-white" fill="white" />
          </button>
        </div>
      )}

      {value && !recording && (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-mint-600 shrink-0"
            >
              {playing ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
            </button>
            <div className="flex-1 h-8 bg-mint-100 border border-mint-300/40 rounded-xl flex items-center px-3">
              <div className="flex gap-0.5 items-end h-4">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-0.5 rounded-full transition-colors ${playing ? 'bg-emerald-400' : 'bg-emerald-400/70'}`}
                    style={{ height: `${20 + (i % 5) * 12}%` }}
                  />
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={handleDelete}
              className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg shrink-0"
            >
              <Trash2 size={18} />
            </button>
          </div>
          {playError && <p className="text-[10px] text-red-400">{playError}</p>}
        </div>
      )}
    </div>
  );
};

export default VoiceNoteRecorder;
