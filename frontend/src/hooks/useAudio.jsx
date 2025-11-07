import { useState, useCallback, useEffect, useRef } from 'react';

// Mapeia os nomes dos sons para os arquivos de áudio
const soundMap = {
  'musica-mundo-1': '/musica-mundo-1.mp3',
  'musica-mundo-2': '/musica-mundo-2.mp3',
  'musica-mundo-3': '/musica-mundo-3.mp3',
  'musica-mundo-4': '/musica-mundo-4.mp3',
  'musica-mundo-5': '/musica-mundo-4.mp3',
  click: '/click.mp3',
  vitoria: '/vitoria.mp3',
  derrota: '/derrota.mp3',
  'fase-acerto': '/fase-acerto.mp3',
  'fase-erro': '/fase-erro.mp3',
  'som-pegar-item': '/som-pegar-item.mp3',
  'som-pular': '/som-pular.mp3',
};

// --- CONTROLES DE VOLUME ---
const MUSIC_VOLUME = 0.2; // 30% do volume para música de fundo
const SFX_VOLUME = 1.0;   // 100% do volume para efeitos sonoros

// Hook principal
export const useAudio = () => {
  const [isMusicMuted, setIsMusicMuted] = useState(() => localStorage.getItem('isMusicMuted') === 'true');
  const [isSfxMuted, setIsSfxMuted] = useState(() => localStorage.getItem('isSfxMuted') === 'true');

  const currentMusicRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('isMusicMuted', isMusicMuted);
    if (currentMusicRef.current) {
      currentMusicRef.current.muted = isMusicMuted;
    }
  }, [isMusicMuted]);

  useEffect(() => {
    localStorage.setItem('isSfxMuted', isSfxMuted);
  }, [isSfxMuted]);

  const playSound = useCallback((soundName, isLoop = false) => {
    if (!soundMap[soundName]) {
      console.warn(`Som "${soundName}" não encontrado.`);
      return null;
    }

    const isMusic = isLoop;
    if (!isMusic && isSfxMuted) return null;

    const audio = new Audio(soundMap[soundName]);
    audio.loop = isLoop;

    // --- LÓGICA DE VOLUME ADICIONADA AQUI ---
    if (isMusic) {
      audio.volume = MUSIC_VOLUME;
      if (currentMusicRef.current) {
        currentMusicRef.current.pause();
      }
      audio.muted = isMusicMuted;
      currentMusicRef.current = audio;
    } else {
      audio.volume = SFX_VOLUME;
    }

    audio.play().catch(error => {
      if (error.name !== 'NotAllowedError') {
        console.error(`Erro ao tocar ${soundName}:`, error);
      }
    });

    return audio;
  }, [isSfxMuted, isMusicMuted]);

  const toggleMusic = useCallback(() => {
    playSound('click');
    setIsMusicMuted(prev => !prev);
  }, [playSound]);

  const toggleSfx = useCallback(() => {
    playSound('click');
    setIsSfxMuted(prev => !prev);
  }, [playSound]);

  return { playSound, isMusicMuted, isSfxMuted, toggleMusic, toggleSfx };
};