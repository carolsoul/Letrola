import { useState, useCallback, useEffect, useRef } from 'react';

// Mapeia os nomes dos sons para os arquivos de áudio
const soundMap = {
  'musica-mundo-1': '/musica-mundo-1.mp3',
  'musica-mundo-2': '/musica-mundo-2.mp3',
  'musica-mundo-3': '/musica-mundo-3.mp3',
  'musica-mundo-4': '/musica-mundo-4.mp3',
  'musica-mundo-5': '/musica-mundo-5.mp3',
  'musica-mundo-6': '/musica-mundo-6.mp3',
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
  const currentDialogueRef = useRef(null); // Ref para a fala atual

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

  // --- NOVA FUNÇÃO: playAudioFile ---
  // Esta função toca um áudio diretamente pelo caminho do arquivo (filePath)
  const playAudioFile = useCallback((filePath, isLoop = false) => {
    if (!filePath) {
      console.warn("Nenhum arquivo de áudio fornecido.");
      return null;
    }

    const isMusic = isLoop;
    // Não toca a fala se os efeitos sonoros (SFX) estiverem mutados
    if (!isMusic && isSfxMuted) return null;

    const audio = new Audio(filePath);
    audio.loop = isLoop;

    if (isMusic) {
      audio.volume = MUSIC_VOLUME;
      if (currentMusicRef.current) {
        currentMusicRef.current.pause();
      }
      audio.muted = isMusicMuted;
      currentMusicRef.current = audio;
    } else {
      // É um SFX (diálogo)
      audio.volume = SFX_VOLUME;
      
      // Para qualquer diálogo que ainda esteja tocando
      if (currentDialogueRef.current) {
        currentDialogueRef.current.pause();
      }
      currentDialogueRef.current = audio; // Armazena a referência do novo áudio
    }

    audio.play().catch(error => {
      if (error.name !== 'NotAllowedError') {
        console.error(`Erro ao tocar ${filePath}:`, error);
      }
    });

    return audio;
  }, [isSfxMuted, isMusicMuted]); // Adiciona dependências

  // --- NOVA FUNÇÃO: stopDialogue ---
  // Para a fala atual (útil ao fechar o modal)
  const stopDialogue = useCallback(() => {
    if (currentDialogueRef.current) {
      currentDialogueRef.current.pause();
      currentDialogueRef.current.currentTime = 0;
      currentDialogueRef.current = null;
    }
  }, []); // Sem dependências, pois só mexe no ref


  const toggleMusic = useCallback(() => {
    playSound('click');
    setIsMusicMuted(prev => !prev);
  }, [playSound]);

  const toggleSfx = useCallback(() => {
    playSound('click');
    setIsSfxMuted(prev => !prev);
  }, [playSound]);

  // Adiciona as novas funções ao retorno do hook
  return { 
    playSound, 
    playAudioFile, // Adicionado
    stopDialogue,  // Adicionado
    isMusicMuted, 
    isSfxMuted, 
    toggleMusic, 
    toggleSfx 
  };
};