'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Music,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Repeat,
  Shuffle,
  Heart,
  Search,
  Home,
  ListMusic,
  User,
  Users,
  Plus,
  MoreVertical,
  LogOut,
  Settings,
  Radio,
  List,
  Scissors,
  UserPlus,
  UserCheck,
  Bell,
  ChevronRight,
  X,
  Check,
  Copy,
  UserMinus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, type Song } from '@/lib/supabase';

export default function Dashboard() {
  const router = useRouter();
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const [likedSongs, setLikedSongs] = useState<Set<number>>(new Set());
  const [shuffleQueue, setShuffleQueue] = useState<Song[]>([]);
  const [showSongMenu, setShowSongMenu] = useState<number | null>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'error' | 'info', message: string} | null>(null);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const preloadRef = useRef<HTMLAudioElement | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<any | null>(null);
  const [playlistSongs, setPlaylistSongs] = useState<Song[]>([]);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState<number | null>(null);
  const [showPlayerAddToPlaylist, setShowPlayerAddToPlaylist] = useState(false);
  const [selectedPlaylistsForAdd, setSelectedPlaylistsForAdd] = useState<Set<number>>(new Set());
  const [songForPlaylistAdd, setSongForPlaylistAdd] = useState<Song | null>(null);
  const [currentQueue, setCurrentQueue] = useState<Song[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [showCustomLoop, setShowCustomLoop] = useState(false);
  const [customLoopSelection, setCustomLoopSelection] = useState<Set<number>>(new Set());
  const [customLoopQueue, setCustomLoopQueue] = useState<Song[]>([]);
  const [isCustomLoopActive, setIsCustomLoopActive] = useState(false);
  const [customLoopSearch, setCustomLoopSearch] = useState('');
  const [customLoopSource, setCustomLoopSource] = useState<Song[]>([]);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  // Vibe Loop state
  const [showVibeLoop, setShowVibeLoop] = useState(false);
  const [vibeLoopStart, setVibeLoopStart] = useState(0);
  const [vibeLoopEnd, setVibeLoopEnd] = useState(100);
  const vibeTrackRef = useRef<HTMLDivElement>(null);
  const [vibeDraggingHandle, setVibeDraggingHandle] = useState<'start' | 'end' | null>(null);
  const [isVibeLoopActive, setIsVibeLoopActive] = useState(false);
  // Friends state
  const [friendsTab, setFriendsTab] = useState<'list'|'add'|'requests'>('list');
  const [friends, setFriends] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [addFriendCode, setAddFriendCode] = useState('');
  const [friendRequestCount, setFriendRequestCount] = useState(0);
  const [viewingFriend, setViewingFriend] = useState<any | null>(null);
  const [friendPlaylists, setFriendPlaylists] = useState<any[]>([]);
  const [viewingFriendPlaylist, setViewingFriendPlaylist] = useState<any | null>(null);
  const [friendPlaylistSongs, setFriendPlaylistSongs] = useState<Song[]>([]);
  const [showCopyPlaylistModal, setShowCopyPlaylistModal] = useState<any | null>(null);
  const [copyPlaylistName, setCopyPlaylistName] = useState('');
  const [friendPlaylistsCache, setFriendPlaylistsCache] = useState<Record<number, any[]>>({});
  const [friendPlaylistSongsCache, setFriendPlaylistSongsCache] = useState<Record<number, Song[]>>({});
  const [removeFriendConfirm, setRemoveFriendConfirm] = useState<any | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const progressTrackRef = useRef<HTMLDivElement>(null);
  const timeCurrentRef = useRef<HTMLSpanElement>(null);
  const volumeBarRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const customLoopActiveRef = useRef(isCustomLoopActive);
  const customLoopQueueRef = useRef(customLoopQueue);

  // Keep refs in sync with state
  useEffect(() => {
    customLoopActiveRef.current = isCustomLoopActive;
  }, [isCustomLoopActive]);

  useEffect(() => {
    customLoopQueueRef.current = customLoopQueue;
  }, [customLoopQueue]);

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const log = `[${timestamp}] ${message}`;
    setDebugLogs(prev => [log, ...prev].slice(0, 50)); // Keep last 50 logs
    console.log(log);
  };

  // Check authentication and fetch user
  useEffect(() => {
    const checkAuth = async () => {
      // Check custom auth session
      const response = await fetch('/api/custom-auth/me');
      const result = await response.json();

      if (!result.success || !result.user) {
        router.push('/');
        return;
      }

      const user = result.user;

      setUser(user);
    };

    checkAuth();
  }, [router]);

  // Fetch songs and liked songs from database
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Fetch songs
      const { data: songsData, error: songsError } = await supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false });

      if (songsError) {
        console.error('Error fetching songs:', songsError);
      } else {
        setSongs(songsData || []);
        if (songsData && songsData.length > 0) {
          // SESSION PERSISTENCE: restore last played song
          const lastSongId = localStorage.getItem('bov_last_song_id');
          const lastPosition = parseFloat(localStorage.getItem('bov_last_position') || '0');
          const savedSong = lastSongId ? songsData.find((s: Song) => s.id === parseInt(lastSongId)) : null;
          if (savedSong) {
            setCurrentSong(savedSong);
            setCurrentQueue(songsData);
            setQueueIndex(songsData.findIndex((s: Song) => s.id === savedSong.id));
            // Start from beginning, don't restore position
            addDebugLog(`Restored last song: ${savedSong.title}`);
          } else {
            setCurrentSong(songsData[0]);
            setCurrentQueue(songsData);
            setQueueIndex(0);
            addDebugLog(`Auto-loaded first song with queue of ${songsData.length} songs`);
          }
        }
      }

      // Fetch liked songs for current user via custom API
      try {
        const res = await fetch('/api/custom-auth/liked-songs');
        const data = await res.json();
        if (data.success && data.likedSongs) {
          const likedSet = new Set<number>(data.likedSongs.map((item: any) => item.song_id));
          setLikedSongs(likedSet);
          addDebugLog(`Loaded ${data.likedSongs.length} liked songs`);
        }
      } catch (err) {
        console.error('Error fetching liked songs:', err);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  // SESSION PERSISTENCE: save current song + position every 5 seconds
  useEffect(() => {
    if (!currentSong) return;
    localStorage.setItem('bov_last_song_id', String(currentSong.id));
    const interval = setInterval(() => {
      if (audioRef.current) {
        localStorage.setItem('bov_last_position', String(audioRef.current.currentTime));
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [currentSong]);

  // ONLINE HEARTBEAT: update last_seen every 30 seconds
  useEffect(() => {
    if (!user) return;
    const heartbeat = async () => {
      await supabase
        .from('custom_users')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', user.id);
    };
    heartbeat();
    const interval = setInterval(heartbeat, 30000);
    // Mark offline on unload
    const handleUnload = () => {
      navigator.sendBeacon('/api/custom-auth/heartbeat-offline', JSON.stringify({ user_id: user.id }));
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [user]);

  // FRIENDS: fetch friends and requests
  const fetchFriends = useCallback(async () => {
    if (!user) return;
    try {
      const [frRes, reqRes] = await Promise.all([
        fetch('/api/friends'),
        fetch('/api/friends/requests')
      ]);
      const frData = await frRes.json();
      const reqData = await reqRes.json();
      if (frData.success) setFriends(frData.friends || []);
      if (reqData.success) {
        const pending = (reqData.requests || []).filter((r: any) => r.status === 'pending');
        setFriendRequests(pending);
        setFriendRequestCount(pending.length);
      }
    } catch (e) {
      console.error('Error fetching friends:', e);
    }
  }, [user]);

  // Prefetch friend's playlists and songs in background
  const prefetchFriendData = async (friendId: number) => {
    if (friendPlaylistsCache[friendId]) return; // Already cached
    try {
      const res = await fetch(`/api/friends/${friendId}/playlists`);
      const data = await res.json();
      if (data.success) {
        setFriendPlaylistsCache(prev => ({ ...prev, [friendId]: data.playlists || [] }));
        // Also prefetch songs for each playlist
        for (const pl of (data.playlists || [])) {
          if (!friendPlaylistSongsCache[pl.id]) {
            const songsRes = await fetch(`/api/friends/${friendId}/playlists/${pl.id}/songs`);
            const songsData = await songsRes.json();
            if (songsData.success) {
              setFriendPlaylistSongsCache(prev => ({ ...prev, [pl.id]: songsData.songs || [] }));
            }
          }
        }
      }
    } catch (e) {
      console.error('Error prefetching friend data:', e);
    }
  };

  useEffect(() => {
    if (user) fetchFriends();
  }, [user, fetchFriends]);

  // Real-time polling for friend requests and friends list
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchFriends();
    }, 3000);
    return () => clearInterval(interval);
  }, [user, fetchFriends]);

  const handleLogout = async () => {
    await fetch('/api/custom-auth/logout', { method: 'POST' });
    router.push('/');
  };

  const handleAdminAccess = () => {
    const code = prompt('Enter admin secret code:');
    if (code === process.env.NEXT_PUBLIC_ADMIN_SECRET_CODE) {
      router.push('/admin-control-panel');
    } else if (code) {
      alert('Invalid code!');
    }
  };

  // Audio playback control
  useEffect(() => {
    if (!audioRef.current || !currentSong) return;

    const audio = audioRef.current;

    // Set source and start loading
    audio.src = currentSong.file_url;
    audio.load();
    audio.currentTime = 0;

    addDebugLog(`Loaded new song: ${currentSong.title} - ${currentSong.file_url}`);
  }, [currentSong]);

  // AGGRESSIVE PRELOADING: Preload next 3 songs for instant playback
  useEffect(() => {
    if (!preloadRef.current || !currentSong) return;

    // Use custom loop queue if active, otherwise use shuffle or normal queue
    const activeQueue = customLoopActiveRef.current && customLoopQueueRef.current.length > 0
      ? customLoopQueueRef.current
      : isShuffle && shuffleQueue.length > 0
      ? shuffleQueue
      : currentQueue;

    if (activeQueue.length === 0) return;

    const currentIndex = activeQueue.findIndex((s) => s.id === currentSong.id);

    // Preload next 3 songs in background
    for (let i = 1; i <= 3; i++) {
      const nextIndex = currentIndex >= 0 ? (currentIndex + i) % activeQueue.length : i - 1;
      const nextSong = activeQueue[nextIndex];

      if (nextSong && nextSong.id !== currentSong.id) {
        if (i === 1) {
          // Primary preload - next song
          preloadRef.current.src = nextSong.file_url;
          preloadRef.current.load();
          addDebugLog(`Preloading next song: ${nextSong.title}`);
        } else {
          // Additional preloading in background
          const bgAudio = new Audio();
          bgAudio.preload = 'auto';
          bgAudio.src = nextSong.file_url;
          bgAudio.load();
        }
      }
    }
  }, [currentSong, queueIndex, currentQueue, isShuffle, shuffleQueue, isCustomLoopActive, customLoopQueue]);

  // CRITICAL: Preload on hover for instant playback feel
  const handleSongHover = (song: Song) => {
    if (!preloadRef.current || song.id === currentSong?.id) return;
    preloadRef.current.src = song.file_url;
    // Browser will start fetching metadata automatically
    addDebugLog(`Hover preloading: ${song.title}`);
  };

  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    if (isPlaying) {
      // Play as soon as we have enough data
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          if (err.name !== 'AbortError') {
            console.error('Playback failed:', err);
            addDebugLog(`ERROR playing audio: ${err.message} - Song: ${currentSong?.title || 'Unknown'} - URL: ${currentSong?.file_url || 'No URL'}`);
            showNotification('error', `Failed to play: ${currentSong?.title || 'Unknown song'}`);
          }
        });
      }
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateUI = () => {
      if (!audio || !progressTrackRef.current || isDraggingProgress) {
        animationFrameRef.current = requestAnimationFrame(updateUI);
        return;
      }
      
      const p = (audio.currentTime / audio.duration) * 100;
      const progressVal = isNaN(p) ? 0 : p;
      progressTrackRef.current.style.width = `${progressVal}%`;
      if (timeCurrentRef.current) {
        timeCurrentRef.current.innerText = formatTime(audio.currentTime);
      }
      
      animationFrameRef.current = requestAnimationFrame(updateUI);
    };

    const handleTimeUpdate = () => {
      // VIBE LOOP: check segment boundaries (active OR preview while modal open)
      if ((isVibeLoopActive || showVibeLoop) && audio.duration) {
        const endTime = (vibeLoopEnd / 100) * audio.duration;
        const startTime = (vibeLoopStart / 100) * audio.duration;
        if (audio.currentTime >= endTime) {
          audio.currentTime = startTime;
        }
      }
    };

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateUI);
    }

    const handleEnded = () => {
      addDebugLog(`Song ended! Queue: ${currentQueue.length} songs, Index: ${queueIndex}, Repeat: ${isRepeat}, Shuffle: ${isShuffle}, Custom Loop: ${customLoopActiveRef.current}`);

      // Track completed play
      if (currentSong) {
        trackPlay(currentSong.id, true, audio.currentTime);
      }

      // If vibe loop is active, loop back to start
      if (isVibeLoopActive && audio.duration) {
        audio.currentTime = (vibeLoopStart / 100) * audio.duration;
        audio.play();
        return;
      }

      if (isRepeat) {
        audio.currentTime = 0;
        audio.play();
        addDebugLog('Repeating current song');
      } else {
        // Auto-play next song
        if (!currentSong) {
          addDebugLog('ERROR: Cannot auto-play - no current song');
          return;
        }

        // Use custom loop queue if active
        const activeQueue = customLoopActiveRef.current && customLoopQueueRef.current.length > 0 ? customLoopQueueRef.current :
                           isShuffle && shuffleQueue.length > 0 ? shuffleQueue : currentQueue;

        if (activeQueue.length === 0) {
          addDebugLog('ERROR: Cannot auto-play - no queue');
          return;
        }

        const currentIndex = activeQueue.findIndex((s) => s.id === currentSong.id);
        const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % activeQueue.length : 0;
        const nextSong = activeQueue[nextIndex];

        addDebugLog(`Auto-play: Next song - ${nextSong.title}`);
        setCurrentSong(nextSong);
        if (!customLoopActiveRef.current) {
          setQueueIndex(nextIndex);
        }
        // Track play start for next song
        trackPlay(nextSong.id, false, 0);
        setIsPlaying(true);
      }
    };

    const handleLoadedMetadata = () => {
      audio.volume = volume / 100;
    };

    const handleCanPlay = () => {
      addDebugLog(`canplay event - readyState: ${audio.readyState}`);
      if (isPlaying && audio.paused) {
        addDebugLog('First data loaded - playing immediately!');
        audio.play().catch(err => {
          if (err.name !== 'AbortError') {
            console.error('Immediate play failed:', err);
          }
        });
      }
    };

    const handleLoadedData = () => {
      addDebugLog(`loadeddata event - readyState: ${audio.readyState}, buffered: ${audio.buffered.length > 0 ? audio.buffered.end(0) : 0}s`);
    };

    const handleProgress = () => {
      if (audio.buffered.length > 0) {
        addDebugLog(`Download progress: ${(audio.buffered.end(0) / audio.duration * 100).toFixed(1)}%`);
      }
    };

    const handleError = () => {
      if (currentSong) {
        addDebugLog(`ERROR loading audio file - Song: ${currentSong.title} - URL: ${currentSong.file_url}`);
        showNotification('error', `Cannot load: ${currentSong.title}. File may be missing or corrupted.`);
        console.error('Audio error:', audio.error);
        // Auto-skip to next song
        setTimeout(() => skipNext(), 1000);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('progress', handleProgress);
    audio.addEventListener('error', handleError);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('progress', handleProgress);
      audio.removeEventListener('error', handleError);
    };
  }, [isRepeat, volume, isDraggingProgress, isShuffle, shuffleQueue, currentSong, currentQueue, queueIndex, isPlaying, isVibeLoopActive, vibeLoopStart, vibeLoopEnd, showVibeLoop]);

  // Click outside profile to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu]);

  // Helper: convert percentage of song duration to MM:SS
  const formatPercentToTime = (percent: number) => {
    if (!audioRef.current || !audioRef.current.duration || !isFinite(audioRef.current.duration)) return '0:00';
    const seconds = (percent / 100) * audioRef.current.duration;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  // Track play for analytics
  const trackPlay = async (songId: number, completed: boolean = false, duration: number = 0) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await fetch('/api/track-play', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          song_id: songId,
          play_duration: duration,
          completed
        })
      });
    } catch (error) {
      console.error('Error tracking play:', error);
    }
  };

  const togglePlay = () => {
    setIsPlaying(prev => !prev);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow spacebar to play/pause only if not typing in an input field
      if (e.code === 'Space' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSongClick = (song: Song) => {
    // If custom loop is active and clicked song is NOT in the loop, disable custom loop
    if (isCustomLoopActive && customLoopQueue.length > 0) {
      const isInLoop = customLoopQueue.some(s => s.id === song.id);
      if (!isInLoop) {
        setIsCustomLoopActive(false);
        setCustomLoopQueue([]);
        setCustomLoopSelection(new Set());
        addDebugLog('Custom loop disabled - playing song outside loop');
        showNotification('info', 'Custom loop cleared');
      }
    }

    // Determine the queue based on current context
    let queue: Song[] = [];

    if (selectedPlaylist) {
      // Playing from a specific playlist
      queue = playlistSongs;
      addDebugLog(`Playing from playlist: ${selectedPlaylist.name} (${queue.length} songs)`);
    } else if (activeTab === 'liked') {
      // Playing from liked songs
      queue = songs.filter(s => likedSongs.has(s.id));
      addDebugLog(`Playing from liked songs (${queue.length} songs)`);
    } else {
      // Playing from all songs (Home tab)
      queue = songs;
      addDebugLog(`Playing from all songs (${queue.length} songs)`);
    }

    setCurrentQueue(queue);
    const index = queue.findIndex(s => s.id === song.id);
    setQueueIndex(index >= 0 ? index : 0);

    // INSTANT PLAYBACK: Use preloaded audio if available
    if (preloadRef.current && preloadRef.current.src === song.file_url && preloadRef.current.readyState >= 2) {
      if (audioRef.current) {
        // Swap the preloaded audio to main player
        const tempSrc = audioRef.current.src;
        audioRef.current.src = preloadRef.current.src;
        audioRef.current.currentTime = 0;
        preloadRef.current.src = tempSrc; // Old song becomes preload buffer
        addDebugLog('Using preloaded audio for instant click play!');
      }
    }

    setCurrentSong(song);
    setIsPlaying(true);
    if (progressTrackRef.current) progressTrackRef.current.style.width = '0%';
    if (timeCurrentRef.current) timeCurrentRef.current.innerText = '0:00';

    // Track play start
    trackPlay(song.id, false, 0);
  };

  const skipNext = () => {
    if (!currentSong) return;

    // Track partial play of current song
    if (audioRef.current) {
      trackPlay(currentSong.id, false, audioRef.current.currentTime);
    }

    // Use custom loop queue if active
    const activeQueue = customLoopActiveRef.current && customLoopQueueRef.current.length > 0 ? customLoopQueueRef.current :
                       isShuffle && shuffleQueue.length > 0 ? shuffleQueue : currentQueue;

    if (activeQueue.length === 0) return;

    const currentIndex = activeQueue.findIndex((s) => s.id === currentSong.id);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % activeQueue.length : 0;
    const nextSong = activeQueue[nextIndex];

    // INSTANT PLAYBACK: Use preloaded audio if available
    if (preloadRef.current && preloadRef.current.src === nextSong.file_url && preloadRef.current.readyState >= 2) {
      if (audioRef.current) {
        // Swap the preloaded audio to main player
        const tempSrc = audioRef.current.src;
        audioRef.current.src = preloadRef.current.src;
        audioRef.current.currentTime = 0;
        preloadRef.current.src = tempSrc; // Old song becomes preload buffer
        addDebugLog('Using preloaded audio for instant skip!');
      }
    }

    setCurrentSong(nextSong);
    if (!customLoopActiveRef.current && !isShuffle) {
      setQueueIndex(nextIndex);
    }
    // Track play start for next song
    trackPlay(nextSong.id, false, 0);
    setIsPlaying(true);
  };

  const skipPrevious = () => {
    if (!currentSong) return;

    // Track partial play of current song
    if (audioRef.current) {
      trackPlay(currentSong.id, false, audioRef.current.currentTime);
    }

    // Use custom loop queue if active
    const activeQueue = customLoopActiveRef.current && customLoopQueueRef.current.length > 0 ? customLoopQueueRef.current :
                       isShuffle && shuffleQueue.length > 0 ? shuffleQueue : currentQueue;

    if (activeQueue.length === 0) return;

    const currentIndex = activeQueue.findIndex((s) => s.id === currentSong.id);
    const prevIndex = (currentIndex - 1 + activeQueue.length) % activeQueue.length;
    const prevSong = activeQueue[prevIndex];

    setCurrentSong(prevSong);
    if (!customLoopActiveRef.current && !isShuffle) {
      setQueueIndex(prevIndex);
    }
    // Track play start for previous song
    trackPlay(prevSong.id, false, 0);
    setIsPlaying(true);
  };

  const toggleLike = async (songId: number) => {
    // Only logged in users can like songs
    const isLiked = likedSongs.has(songId);

    // OPTIMISTIC UPDATE: Update UI immediately for instant feedback
    setLikedSongs(prev => {
      const newLiked = new Set(prev);
      if (isLiked) newLiked.delete(songId);
      else newLiked.add(songId);
      return newLiked;
    });

    // Then sync with database in background via custom API
    try {
      if (isLiked) {
        showNotification('info', 'Removed from favorites');
        const res = await fetch('/api/custom-auth/liked-songs', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ song_id: songId })
        });
        const data = await res.json();
        
        if (!data.success) throw new Error(data.error);
      } else {
        showNotification('success', 'Added to favorites');
        const res = await fetch('/api/custom-auth/liked-songs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ song_id: songId })
        });
        const data = await res.json();
        
        if (!data.success) throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert optimistic update on error
      setLikedSongs(prev => {
        const newLiked = new Set(prev);
        if (isLiked) newLiked.add(songId);
        else newLiked.delete(songId);
        return newLiked;
      });
      showNotification('error', 'Failed to update favorites');
    }
  };

  const toggleShuffle = () => {
    if (!isShuffle) {
      // Create shuffle queue from current queue
      const queueToShuffle = currentQueue.length > 0 ? currentQueue : songs;
      const shuffled = [...queueToShuffle].sort(() => Math.random() - 0.5);
      setShuffleQueue(shuffled);
      showNotification('success', 'Shuffle enabled');
    } else {
      setShuffleQueue([]);
      showNotification('info', 'Shuffle disabled');
    }
    setIsShuffle(!isShuffle);
  };

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchPlaylists = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('playlists')
      .select('*')
      .eq('custom_user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPlaylists(data);
    }
  };

  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) {
      showNotification('error', 'Please enter a playlist name');
      return;
    }

    if (!user) {
      addDebugLog('ERROR: User not authenticated');
      showNotification('error', 'Not authenticated');
      return;
    }

    addDebugLog(`Creating playlist: "${newPlaylistName}" for user: ${user.id}`);

    const { data, error } = await supabase
      .from('playlists')
      .insert([
        {
          name: newPlaylistName,
          custom_user_id: user.id
        }
      ])
      .select();

    if (error) {
      const errorDetails = JSON.stringify(error, null, 2);
      addDebugLog(`ERROR creating playlist: ${errorDetails}`);
      showNotification('error', error.message || error.details || 'Failed to create playlist');
    } else if (data) {
      addDebugLog(`SUCCESS: Playlist created - ${JSON.stringify(data)}`);
      showNotification('success', 'Playlist created!');
      setNewPlaylistName('');
      setShowCreatePlaylist(false);
      fetchPlaylists();
    } else {
      addDebugLog('ERROR: No data and no error returned');
      showNotification('error', 'Unknown error occurred');
    }
  };

  const deletePlaylist = async (playlistId: number) => {
    const { error } = await supabase
      .from('playlists')
      .delete()
      .eq('id', playlistId);

    if (error) {
      showNotification('error', 'Failed to delete playlist');
    } else {
      showNotification('success', 'Playlist deleted');
      fetchPlaylists();
      if (selectedPlaylist?.id === playlistId) {
        setSelectedPlaylist(null);
      }
    }
  };

  const fetchPlaylistSongs = async (playlistId: number) => {
    addDebugLog(`Fetching songs for playlist ${playlistId}`);

    const { data, error } = await supabase
      .from('playlist_songs')
      .select(`
        song_id,
        songs (*)
      `)
      .eq('playlist_id', playlistId);

    if (error) {
      addDebugLog(`ERROR fetching playlist songs: ${JSON.stringify(error)}`);
      showNotification('error', 'Failed to load playlist songs');
    } else {
      const songs = data?.map((ps: any) => ps.songs).filter(Boolean) || [];
      setPlaylistSongs(songs);
      addDebugLog(`SUCCESS: Loaded ${songs.length} songs`);
    }
  };

  const loadFriendPlaylistSongs = async (friendId: number, playlistId: number) => {
    // Use cached data if available
    if (friendPlaylistSongsCache[playlistId]) {
      setFriendPlaylistSongs(friendPlaylistSongsCache[playlistId]);
      return;
    }
    const res = await fetch(`/api/friends/${friendId}/playlists/${playlistId}/songs`);
    const data = await res.json();
    if (data.success) {
      setFriendPlaylistSongs(data.songs || []);
      setFriendPlaylistSongsCache(prev => ({ ...prev, [playlistId]: data.songs || [] }));
    }
  };

  const addSongToPlaylist = async (playlistId: number, songId: number) => {
    addDebugLog(`Adding song ${songId} to playlist ${playlistId}`);

    const { error } = await supabase
      .from('playlist_songs')
      .insert([
        {
          playlist_id: playlistId,
          song_id: songId
        }
      ]);

    if (error) {
      addDebugLog(`ERROR adding song to playlist: ${JSON.stringify(error)}`);
      if (error.code === '23505') {
        showNotification('info', 'Song already in playlist');
      } else {
        showNotification('error', 'Failed to add song');
      }
    } else {
      addDebugLog('SUCCESS: Song added to playlist');
      showNotification('success', 'Added to playlist!');
      if (selectedPlaylist?.id === playlistId) {
        fetchPlaylistSongs(playlistId);
      }
    }
    setShowAddToPlaylist(null);
  };

  const addSongToMultiplePlaylists = async (playlistIds: number[], songId: number) => {
    if (playlistIds.length === 0) {
      showNotification('info', 'Please select at least one playlist');
      return;
    }

    addDebugLog(`Adding song ${songId} to ${playlistIds.length} playlists`);

    let successCount = 0;
    let alreadyExistsCount = 0;
    let errorCount = 0;

    for (const playlistId of playlistIds) {
      const { error } = await supabase
        .from('playlist_songs')
        .insert([
          {
            playlist_id: playlistId,
            song_id: songId
          }
        ]);

      if (error) {
        if (error.code === '23505') {
          alreadyExistsCount++;
          addDebugLog(`Song already in playlist ${playlistId}`);
        } else {
          errorCount++;
          addDebugLog(`ERROR adding to playlist ${playlistId}: ${JSON.stringify(error)}`);
        }
      } else {
        successCount++;
        addDebugLog(`SUCCESS: Added to playlist ${playlistId}`);
      }
    }

    // Show summary notification
    if (successCount > 0) {
      showNotification('success', `Added to ${successCount} playlist${successCount > 1 ? 's' : ''}!`);
    }
    if (alreadyExistsCount > 0) {
      showNotification('info', `Song already in ${alreadyExistsCount} playlist${alreadyExistsCount > 1 ? 's' : ''}`);
    }
    if (errorCount > 0) {
      showNotification('error', `Failed to add to ${errorCount} playlist${errorCount > 1 ? 's' : ''}`);
    }

    setShowPlayerAddToPlaylist(false);
    setSelectedPlaylistsForAdd(new Set());
  };

  const removeSongFromPlaylist = async (playlistId: number, songId: number) => {
    const { error } = await supabase
      .from('playlist_songs')
      .delete()
      .eq('playlist_id', playlistId)
      .eq('song_id', songId);

    if (error) {
      showNotification('error', 'Failed to remove song');
    } else {
      showNotification('success', 'Removed from playlist');
      fetchPlaylistSongs(playlistId);
    }
  };

  // Fetch playlists on mount
  useEffect(() => {
    if (user) {
      fetchPlaylists();
    }
  }, [user]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    setIsMuted(false);
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current || !audioRef.current.duration) return;
    const percent = Number(e.target.value) / 100;
    const newTime = audioRef.current.duration * percent;
    audioRef.current.currentTime = newTime;
    
    // Optimistic UI update during native drag
    if (progressTrackRef.current) progressTrackRef.current.style.width = `${percent * 100}%`;
    if (timeCurrentRef.current) timeCurrentRef.current.innerText = formatTime(newTime);
  };

  const searchLower = debouncedSearch.trim().toLowerCase();
  const filteredSongs = searchLower === '' ? songs : songs.filter(
    (song) =>
      song.title.toLowerCase().includes(searchLower) ||
      song.artist.toLowerCase().includes(searchLower)
  );

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 flex overflow-hidden">
      {/* Hidden Audio Elements */}
      <audio
        ref={audioRef}
        preload="metadata"
        crossOrigin="anonymous"
        playsInline
        autoPlay={false}
      />
      <audio ref={preloadRef} preload="none" crossOrigin="anonymous" style={{ display: 'none' }} />
      {/* Sidebar */}
      <motion.div
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        className="w-64 bg-black/40 backdrop-blur-xl border-r border-white/10 p-6 pb-40 flex flex-col overflow-y-auto"
      >
        {/* Logo */}
        <div className="flex items-center gap-4 mb-8">
          <svg className="w-16 h-16" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Glow effect behind vinyl */}
            <circle cx="50" cy="50" r="47" fill="url(#glowGrad)" opacity="0.6"/>

            {/* Rotating vinyl record */}
            <g>
              <animateTransform
                attributeName="transform"
                attributeType="XML"
                type="rotate"
                from="0 50 50"
                to="360 50 50"
                dur="3s"
                repeatCount="indefinite"
              />

              {/* Outer vinyl edge with border */}
              <circle cx="50" cy="50" r="45" fill="url(#vinylGrad)" stroke="url(#borderGrad)" strokeWidth="1.5"/>

              {/* Vinyl grooves */}
              <circle cx="50" cy="50" r="40" fill="none" stroke="#3a3a3a" strokeWidth="0.5" opacity="0.5"/>
              <circle cx="50" cy="50" r="35" fill="none" stroke="#3a3a3a" strokeWidth="0.5" opacity="0.5"/>
              <circle cx="50" cy="50" r="30" fill="none" stroke="#3a3a3a" strokeWidth="0.5" opacity="0.5"/>
              <circle cx="50" cy="50" r="25" fill="none" stroke="#3a3a3a" strokeWidth="0.5" opacity="0.5"/>

              {/* Center label with gradient */}
              <circle cx="50" cy="50" r="18" fill="url(#labelGrad)"/>

              {/* Subtle rotating shine bar */}
              <rect x="45" y="5" width="10" height="90" rx="5" fill="url(#shineGrad)" opacity="0.15"/>

              {/* Center hole */}
              <circle cx="50" cy="50" r="4" fill="#1a1a1a"/>
            </g>

            {/* Gradients */}
            <defs>
              <radialGradient id="glowGrad">
                <stop offset="0%" stopColor="#A855F7" stopOpacity="0.3"/>
                <stop offset="50%" stopColor="#EC4899" stopOpacity="0.2"/>
                <stop offset="100%" stopColor="#FB923C" stopOpacity="0"/>
              </radialGradient>

              <radialGradient id="vinylGrad">
                <stop offset="0%" stopColor="#4a4a4a"/>
                <stop offset="70%" stopColor="#2a2a2a"/>
                <stop offset="100%" stopColor="#1a1a1a"/>
              </radialGradient>

              <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#A855F7" stopOpacity="0.6"/>
                <stop offset="50%" stopColor="#EC4899" stopOpacity="0.6"/>
                <stop offset="100%" stopColor="#FB923C" stopOpacity="0.6"/>
              </linearGradient>

              <linearGradient id="labelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#A855F7"/>
                <stop offset="50%" stopColor="#EC4899"/>
                <stop offset="100%" stopColor="#FB923C"/>
              </linearGradient>

              <linearGradient id="shineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0"/>
                <stop offset="50%" stopColor="#ffffff" stopOpacity="0.7"/>
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
              </linearGradient>
            </defs>
          </svg>

          <span className="text-2xl font-semibold tracking-wide" style={{
            background: 'linear-gradient(135deg, #A855F7, #EC4899, #FB923C)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            letterSpacing: '0.05em'
          }}>BoxOfVibe</span>
        </div>

        {/* Navigation */}
        <nav className="space-y-2 flex-1">
          <button
            onClick={() => {
              setActiveTab('home');
              setSelectedPlaylist(null);
              setPlaylistSongs([]);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeTab === 'home'
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="font-medium">Home</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('liked');
              setSelectedPlaylist(null);
              setPlaylistSongs([]);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeTab === 'liked'
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Heart className="w-5 h-5" />
            <span className="font-medium">Liked Songs</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('playlists');
              setSelectedPlaylist(null);
              setPlaylistSongs([]);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeTab === 'playlists'
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ListMusic className="w-5 h-5" />
            <span className="font-medium">Playlists</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('friends');
              setSelectedPlaylist(null);
              setPlaylistSongs([]);
              fetchFriends();
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeTab === 'friends'
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="font-medium">Friends</span>
            {friendRequestCount > 0 && (
              <span className="ml-auto bg-pink-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {friendRequestCount}
              </span>
            )}
          </button>
        </nav>


        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-400 rounded-lg text-sm font-medium hover:from-red-500/30 hover:to-pink-500/30 border border-red-500/30 hover:border-red-500/50 transition-all group"
        >
          <LogOut className="w-4 h-4 group-hover:rotate-12 transition-transform" />
          <span>Sign Out</span>
        </button>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <motion.div
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          className="bg-[#050505] border-b border-white/10 p-6 z-40"
        >
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for songs, artists..."
                className="w-full bg-white/10 border border-white/20 rounded-full pl-12 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              />
            </div>
            <div className="flex items-center gap-3">
              {/* Hidden Admin Button */}
              <button
                onClick={handleAdminAccess}
                className="w-8 h-8 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center transition-all opacity-30 hover:opacity-100"
                title="Admin"
              >
                <Settings className="w-4 h-4 text-white/50" />
              </button>
              <div className="relative" ref={profileRef}>
                <button 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center hover:shadow-lg hover:shadow-purple-500/50 transition-all"
                >
                  <User className="w-5 h-5 text-white" />
                </button>
                
                <AnimatePresence>
                  {showProfileMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-3 w-64 bg-[#0a0a0a] border border-white/20 rounded-xl shadow-[0_0_60px_rgba(0,0,0,1)] py-2 z-50 overflow-hidden"
                    >
                      <div className="px-4 py-4 border-b border-white/10 bg-[#1a1a1a]">
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Signed in as</p>
                        <p className="text-sm font-bold text-white truncate">{user?.email}</p>
                        {user?.unique_code && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-400">Your ID:</span>
                            <span className="text-sm font-bold font-mono text-purple-400 tracking-widest">{user.unique_code}</span>
                            <button
                              onClick={() => { navigator.clipboard.writeText(user.unique_code); showNotification('success', 'ID copied!'); }}
                              className="text-gray-500 hover:text-purple-400 transition-colors"
                              title="Copy ID"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
                          <div>
                            <p className="text-xs text-gray-400">Playlists</p>
                            <p className="text-sm font-bold text-purple-400">{playlists.length}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Liked Songs</p>
                            <p className="text-sm font-bold text-pink-400">{likedSongs.size}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Friends</p>
                            <p className="text-sm font-bold text-green-400">{friends.length}</p>
                          </div>
                        </div>
                      </div>
                      <div className="py-2 bg-[#0a0a0a]">
                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            setActiveTab('home');
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2"
                        >
                          <Home className="w-4 h-4" /> Home
                        </button>
                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            setActiveTab('playlists');
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2"
                        >
                          <ListMusic className="w-4 h-4" /> Playlists
                        </button>
                      </div>
                      <div className="border-t border-white/10 pt-2 bg-[#0a0a0a]">
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-colors flex items-center gap-2"
                        >
                          <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Songs Library */}
        <div className="flex-1 overflow-y-auto p-6 pb-40">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">
              {activeTab === 'home' && 'Your Music Library'}
              {activeTab === 'liked' && 'Liked Songs'}
              {activeTab === 'playlists' && 'Your Playlists'}
              {activeTab === 'friends' && 'Friends'}
            </h1>
            {activeTab === 'home' && (
              <p className="text-gray-400">
                {filteredSongs.length} songs available
              </p>
            )}
            {activeTab === 'liked' && (
              <p className="text-gray-400">
                {likedSongs.size} liked songs
              </p>
            )}
          </div>

          {/* Content based on active tab */}
          <AnimatePresence mode="wait">
          {selectedPlaylist ? (
            <motion.div
              key={`playlist-${selectedPlaylist.id}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              {/* Back Button */}
              <button
                onClick={() => {
                  setSelectedPlaylist(null);
                  setPlaylistSongs([]);
                }}
                className="mb-6 flex items-center gap-2 px-4 py-2 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Playlists
              </button>

              <h2 className="text-2xl font-bold text-white mb-4">{selectedPlaylist.name}</h2>
              <p className="text-gray-400 mb-6">{playlistSongs.length} songs</p>

              {playlistSongs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <ListMusic className="w-16 h-16 text-gray-600 mb-4" />
                  <h3 className="text-white text-xl font-semibold mb-2">No Songs in Playlist</h3>
                  <p className="text-gray-400 text-center">Add songs from the three-dot menu on any song</p>
                </div>
              ) : (
                <motion.div
                  key={`playlist-songs-${selectedPlaylist.id}-${debouncedSearch}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="space-y-1"
                >
                    {filteredSongs.filter(song => playlistSongs.some(ps => ps.id === song.id)).map((song, index) => (
                      <div
                        key={song.id}
                        onClick={() => handleSongClick(song)}
                        className={`group relative rounded-lg px-4 py-3 border transition-colors cursor-pointer ${
                          currentSong?.id === song.id
                            ? 'border-purple-500/50 bg-white/10'
                            : 'border-white/5 bg-white/[0.02] hover:bg-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          {/* Equalizer or Play Icon */}
                          <div className="w-12 h-12 flex-shrink-0 relative">
                            {currentSong?.id === song.id ? (
                              <div className="w-full h-full flex items-center justify-center gap-0.5">
                                <div className={`eq-bar ${isPlaying ? '' : 'eq-bar-paused'}`} />
                                <div className={`eq-bar ${isPlaying ? '' : 'eq-bar-paused'}`} />
                                <div className={`eq-bar ${isPlaying ? '' : 'eq-bar-paused'}`} />
                                <div className={`eq-bar ${isPlaying ? '' : 'eq-bar-paused'}`} />
                              </div>
                            ) : (
                              <div className="w-full h-full rounded-lg bg-white/5 flex items-center justify-center opacity-60 group-hover:opacity-100 group-hover:bg-purple-500/20 transition-all">
                                <Play className="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors" />
                              </div>
                            )}
                          </div>

                          {/* Song Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-semibold truncate transition-colors ${
                              currentSong?.id === song.id ? 'text-purple-300' : 'text-white group-hover:text-purple-200'
                            }`}>
                              {song.title}
                            </h3>
                            <p className="text-gray-400 text-sm truncate">{song.artist}</p>
                          </div>

                          {/* Duration */}
                          <div className="text-gray-500 text-sm font-mono flex-shrink-0">
                            {song.duration}
                          </div>

                          {/* Status Dot */}
                          <div className="flex-shrink-0">
                            <div className={`w-2 h-2 rounded-full transition-all ${
                              currentSong?.id === song.id ? 'bg-green-500 animate-pulse shadow-lg shadow-green-500/50' : 'bg-gray-700'
                            }`} />
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Heart Button - Always visible when liked */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleLike(song.id);
                              }}
                              className={`transition-colors ${
                                likedSongs.has(song.id)
                                  ? 'text-red-500 opacity-100'
                                  : 'text-gray-400 hover:text-white opacity-0 group-hover:opacity-100'
                              }`}
                            >
                              <Heart className={`w-5 h-5 ${likedSongs.has(song.id) ? 'fill-current' : ''}`} />
                            </button>

                            {/* Remove from Playlist Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeSongFromPlaylist(selectedPlaylist.id, song.id);
                              }}
                              className="w-8 h-8 bg-red-500/20 text-red-400 rounded-lg flex items-center justify-center hover:bg-red-500/30 transition-all opacity-0 group-hover:opacity-100"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </motion.div>
              )}
            </motion.div>
          ) : activeTab === 'liked' ? (
            <motion.div
              key={`liked-songs-${debouncedSearch}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
            {likedSongs.size === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <Heart className="w-16 h-16 text-gray-600 mb-4" />
                <h3 className="text-white text-xl font-semibold mb-2">No Liked Songs Yet</h3>
                <p className="text-gray-400 text-center">Click the heart icon on songs to add them to your favorites</p>
              </div>
            ) : (
              <div className="space-y-1">
                  {filteredSongs.filter(song => likedSongs.has(song.id)).map((song, index) => (
                    <div
                      key={song.id}
                      onClick={() => handleSongClick(song)}
                      onMouseEnter={() => handleSongHover(song)}
                      className={`group relative rounded-lg px-4 py-3 border transition-colors cursor-pointer ${
                        currentSong?.id === song.id
                          ? 'border-purple-500/50 bg-white/10'
                          : 'border-white/5 bg-white/[0.02] hover:bg-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Equalizer or Play Icon */}
                        <div className="w-12 h-12 flex-shrink-0 relative">
                          {currentSong?.id === song.id ? (
                            <div className="w-full h-full flex items-center justify-center gap-0.5">
                              <div className={`eq-bar ${isPlaying ? '' : 'eq-bar-paused'}`} />
                              <div className={`eq-bar ${isPlaying ? '' : 'eq-bar-paused'}`} />
                              <div className={`eq-bar ${isPlaying ? '' : 'eq-bar-paused'}`} />
                              <div className={`eq-bar ${isPlaying ? '' : 'eq-bar-paused'}`} />
                            </div>
                          ) : (
                            <div className="w-full h-full rounded-lg bg-white/5 flex items-center justify-center opacity-60 group-hover:opacity-100 group-hover:bg-purple-500/20 transition-all">
                              <Play className="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors" />
                            </div>
                          )}
                        </div>

                        {/* Song Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-semibold truncate transition-colors ${
                            currentSong?.id === song.id ? 'text-purple-300' : 'text-white group-hover:text-purple-200'
                          }`}>
                            {song.title}
                          </h3>
                          <p className="text-gray-400 text-sm truncate">{song.artist}</p>
                        </div>

                        {/* Duration */}
                        <div className="text-gray-500 text-sm font-mono flex-shrink-0">
                          {song.duration}
                        </div>

                        {/* Status Dot */}
                        <div className="flex-shrink-0">
                          <div className={`w-2 h-2 rounded-full transition-all ${
                            currentSong?.id === song.id ? 'bg-green-500 animate-pulse shadow-lg shadow-green-500/50' : 'bg-gray-700'
                          }`} />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Heart Button - Always visible for liked songs */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLike(song.id);
                            }}
                            className="text-red-500 transition-colors opacity-100"
                          >
                            <Heart className="w-5 h-5 fill-current" />
                          </button>

                          {/* Add to Playlist Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSongForPlaylistAdd(song);
                              setSelectedPlaylistsForAdd(new Set());
                            }}
                            className="text-gray-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
            </motion.div>
          ) : activeTab === 'playlists' ? (
            <motion.div
              key="playlists"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              {/* Create Playlist Button */}
              <button
                onClick={() => setShowCreatePlaylist(true)}
                className="mb-6 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all"
              >
                <Plus className="w-5 h-5" />
                Create New Playlist
              </button>

              {/* Playlists Grid */}
              {playlists.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <ListMusic className="w-16 h-16 text-gray-600 mb-4" />
                  <h3 className="text-white text-xl font-semibold mb-2">No Playlists Yet</h3>
                  <p className="text-gray-400 text-center">Create your first playlist to organize your music</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {playlists.map((playlist, index) => (
                    <div
                      key={playlist.id}
                      onClick={() => {
                        setSelectedPlaylist(playlist);
                        fetchPlaylistSongs(playlist.id);
                      }}
                      className="group relative bg-white/5 backdrop-blur-lg rounded-lg px-6 py-4 border border-white/10 hover:bg-white/10 hover:border-purple-500/50 transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                          <ListMusic className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-white font-semibold text-lg truncate">
                          {playlist.name}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePlaylist(playlist.id);
                          }}
                          className="w-8 h-8 bg-red-500/20 hover:bg-red-500/40 rounded-lg flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <svg className="w-4 h-4 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        <div className="text-gray-400 group-hover:text-white transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : activeTab === 'friends' ? (
            <motion.div
              key="friends"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Friend Viewing - their playlists */}
              {viewingFriend && !viewingFriendPlaylist ? (
                <div>
                  <button
                    onClick={() => { setViewingFriend(null); setFriendPlaylists([]); setViewingFriendPlaylist(null); setFriendPlaylistSongs([]); }}
                    className="mb-6 flex items-center gap-2 px-4 py-2 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Friends
                  </button>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center">
                      <User className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">{viewingFriend.username}</h2>
                      <p className="text-gray-400 text-sm">ID: #{viewingFriend.unique_code}</p>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-4">Their Playlists</h3>
                  {friendPlaylists.length === 0 ? (
                    <div className="text-gray-400 text-center py-12">No public playlists yet</div>
                  ) : (
                    <div className="space-y-2">
                      {friendPlaylists.map((playlist: any) => (
                        <div key={playlist.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all">
                          <div
                            className="flex items-center gap-3 cursor-pointer flex-1"
                            onClick={async () => {
                              setViewingFriendPlaylist(playlist);
                              await loadFriendPlaylistSongs(viewingFriend.id, playlist.id);
                            }}
                            onMouseEnter={() => {
                              if (viewingFriend && !friendPlaylistSongsCache[playlist.id]) {
                                prefetchFriendData(viewingFriend.id);
                              }
                            }}
                          >
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center">
                              <ListMusic className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-white font-medium">{playlist.name}</p>
                              <p className="text-gray-400 text-sm">{playlist.song_count || 0} songs</p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setShowCopyPlaylistModal(playlist);
                              setCopyPlaylistName(playlist.name);
                            }}
                            className="px-4 py-2 bg-purple-500/20 text-purple-300 text-sm rounded-lg hover:bg-purple-500/30 transition-all border border-purple-500/30 flex items-center gap-2"
                          >
                            <Plus className="w-4 h-4" /> Add to Library
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : viewingFriend && viewingFriendPlaylist ? (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <button
                      onClick={() => { setViewingFriendPlaylist(null); setFriendPlaylistSongs([]); }}
                      className="flex items-center gap-2 px-4 py-2 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to Playlists
                    </button>
                  </div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center">
                      <ListMusic className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">{viewingFriendPlaylist.name}</h2>
                      <p className="text-gray-400 text-sm">by {viewingFriend.username} • {friendPlaylistSongs.length} songs</p>
                    </div>
                  </div>
                  {friendPlaylistSongs.length === 0 ? (
                    <div className="text-gray-400 text-center py-12">No songs in this playlist</div>
                  ) : (
                    <div className="space-y-2">
                      {friendPlaylistSongs.map((song: Song, index: number) => (
                        <motion.div
                          key={song.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.03 }}
                          className={`group flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-all ${
                            currentSong?.id === song.id
                              ? 'bg-purple-500/20 border border-purple-500/50'
                              : 'bg-white/5 hover:bg-white/10 border border-transparent'
                          }`}
                          onClick={() => {
                            setCurrentSong(song);
                            setCurrentQueue(friendPlaylistSongs);
                            setQueueIndex(index);
                            setIsPlaying(true);
                          }}
                        >
                          <div className="flex-shrink-0 w-8 text-center">
                            {currentSong?.id === song.id && isPlaying ? (
                              <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse" />
                            ) : (
                              <span className="text-gray-400 text-sm group-hover:hidden">{index + 1}</span>
                            )}
                            {!(currentSong?.id === song.id && isPlaying) && (
                              <Play className="w-4 h-4 text-white hidden group-hover:block mx-auto" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium truncate ${currentSong?.id === song.id ? 'text-purple-300' : 'text-white'}`}>
                              {song.title}
                            </p>
                            <p className="text-gray-400 text-sm truncate">{song.artist}</p>
                          </div>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleLike(song.id);
                              }}
                              className={`transition-colors ${likedSongs.has(song.id) ? 'text-pink-500' : 'text-gray-400 hover:text-pink-500'}`}
                            >
                              <Heart className={`w-4 h-4 ${likedSongs.has(song.id) ? 'fill-current' : ''}`} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSongForPlaylistAdd(song);
                                setSelectedPlaylistsForAdd(new Set());
                              }}
                              className="text-gray-400 hover:text-purple-400 transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex-shrink-0 text-gray-400 text-sm w-12 text-right">
                            {song.duration}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {/* Sub-tabs */}
                  <div className="flex gap-2 mb-6 bg-white/5 p-1 rounded-xl w-fit">
                    {(['list', 'add', 'requests'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setFriendsTab(tab)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${
                          friendsTab === tab
                            ? 'bg-purple-500/40 text-white'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {tab === 'list' && 'My Friends'}
                        {tab === 'add' && 'Add Friend'}
                        {tab === 'requests' && (
                          <span className="flex items-center gap-2">
                            Requests
                            {friendRequestCount > 0 && (
                              <span className="bg-pink-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                {friendRequestCount}
                              </span>
                            )}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* My Friends list */}
                  {friendsTab === 'list' && (
                    <div>
                      {friends.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                          <Users className="w-16 h-16 text-gray-600 mb-4" />
                          <h3 className="text-white text-xl font-semibold mb-2">No Friends Yet</h3>
                          <p className="text-gray-400">Add friends using their unique ID</p>
                          <button
                            onClick={() => setFriendsTab('add')}
                            className="mt-4 px-6 py-2 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-all border border-purple-500/30"
                          >
                            Add a Friend
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {friends.map((friend: any) => (
                            <div
                              key={friend.id}
                              className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all group"
                            >
                              <div className="flex items-center gap-4">
                                <div className="relative">
                                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                    <User className="w-6 h-6 text-white" />
                                  </div>
                                  {friend.is_online && (
                                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-black" />
                                  )}
                                </div>
                                <div>
                                  <p className="text-white font-semibold">{friend.username}</p>
                                  <p className="text-gray-400 text-sm">ID: #{friend.unique_code}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={async () => {
                                    setViewingFriend(friend);
                                    // Use cached data if available, otherwise fetch
                                    if (friendPlaylistsCache[friend.id]) {
                                      setFriendPlaylists(friendPlaylistsCache[friend.id]);
                                    } else {
                                      const res = await fetch(`/api/friends/${friend.id}/playlists`);
                                      const data = await res.json();
                                      if (data.success) {
                                        setFriendPlaylists(data.playlists || []);
                                        setFriendPlaylistsCache(prev => ({ ...prev, [friend.id]: data.playlists || [] }));
                                      }
                                    }
                                  }}
                                  onMouseEnter={() => prefetchFriendData(friend.id)}
                                  className="px-4 py-2 bg-white/5 text-gray-300 text-sm rounded-lg hover:bg-white/10 hover:text-white transition-all border border-white/10 flex items-center gap-2"
                                >
                                  <ListMusic className="w-4 h-4" /> View Playlists
                                </button>
                                <button
                                  onClick={() => setRemoveFriendConfirm(friend)}
                                  className="w-10 h-10 bg-red-500/10 text-red-400 rounded-lg flex items-center justify-center hover:bg-red-500/30 transition-all border border-red-500/30"
                                  title="Remove friend"
                                >
                                  <UserMinus className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Add Friend */}
                  {friendsTab === 'add' && (
                    <div className="max-w-md">
                      <p className="text-gray-400 mb-6">Enter your friend's unique 4-digit ID to send them a friend request.</p>
                      <div className="flex gap-3">
                        <div className="flex-1 relative">
                          <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="text"
                            value={addFriendCode}
                            onChange={(e) => setAddFriendCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            placeholder="Enter 4-digit ID..."
                            maxLength={4}
                            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 tracking-widest font-mono text-lg"
                          />
                        </div>
                        <button
                          onClick={async () => {
                            console.log('[Friend Request] Button clicked, code:', addFriendCode);
                            if (addFriendCode.length !== 4) {
                              showNotification('error', 'Enter a valid 4-digit ID');
                              return;
                            }
                            try {
                              console.log('[Friend Request] Sending request to API with code:', addFriendCode);
                              const res = await fetch('/api/friends/requests', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ unique_code: addFriendCode })
                              });
                              console.log('[Friend Request] Response status:', res.status);
                              const data = await res.json();
                              console.log('[Friend Request] Response data:', data);
                              if (data.success) {
                                showNotification('success', `Request sent to ${data.message?.split('to ')[1] || 'friend'}!`);
                                setAddFriendCode('');
                                fetchFriends();
                              } else {
                                const isAlready = data.error?.includes('already') || data.error?.includes('Already');
                                if (isAlready) {
                                  showNotification('info', data.error);
                                  setAddFriendCode('');
                                } else {
                                  showNotification('error', data.error || 'Failed to send request');
                                }
                              }
                            } catch (err) {
                              console.error('[Friend Request] Network error:', err);
                              showNotification('error', 'Network error. Check connection.');
                            }
                          }}
                          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/30 transition-all"
                        >
                          Send Request
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Friend Requests */}
                  {friendsTab === 'requests' && (
                    <div>
                      {friendRequests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                          <Bell className="w-16 h-16 text-gray-600 mb-4" />
                          <h3 className="text-white text-xl font-semibold mb-2">No Pending Requests</h3>
                          <p className="text-gray-400">Friend requests will appear here</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {friendRequests.map((req: any) => (
                            <div key={req.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                                  <User className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                  <p className="text-white font-semibold">{req.sender?.username || 'Unknown'}</p>
                                  <p className="text-gray-400 text-sm">ID: #{req.sender?.unique_code}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={async () => {
                                    const res = await fetch(`/api/friends/requests/${req.id}/accept`, { method: 'POST' });
                                    const data = await res.json();
                                    if (data.success) {
                                      showNotification('success', `${req.sender?.username} is now your friend!`);
                                      fetchFriends();
                                    }
                                  }}
                                  className="w-10 h-10 bg-green-500/20 text-green-400 rounded-lg flex items-center justify-center hover:bg-green-500/40 transition-all border border-green-500/30"
                                  title="Accept"
                                >
                                  <Check className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={async () => {
                                    const res = await fetch(`/api/friends/requests/${req.id}/reject`, { method: 'POST' });
                                    const data = await res.json();
                                    if (data.success) {
                                      showNotification('info', 'Request rejected');
                                      fetchFriends();
                                    }
                                  }}
                                  className="w-10 h-10 bg-red-500/20 text-red-400 rounded-lg flex items-center justify-center hover:bg-red-500/40 transition-all border border-red-500/30"
                                  title="Reject"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ) : loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-white text-lg">Loading songs...</div>
            </div>
          ) : filteredSongs.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-400 text-lg">No songs found</div>
            </div>
          ) : (
            <motion.div
              key={`all-songs-${debouncedSearch}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="space-y-1"
            >
                {filteredSongs.map((song, index) => (
                  <div
                    key={song.id}
                    onClick={() => handleSongClick(song)}
                    className={`group relative rounded-lg px-4 py-3 border transition-all duration-300 ease-out cursor-pointer ${
                      currentSong?.id === song.id
                        ? 'border-purple-500/50 bg-white/10'
                        : 'border-white/5 bg-white/[0.02] hover:bg-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Equalizer or Play Icon */}
                      <div className="w-12 h-12 flex-shrink-0 relative">
                        {currentSong?.id === song.id ? (
                          <div className="w-full h-full flex items-center justify-center gap-0.5">
                            {[...Array(4)].map((_, i) => (
                              <motion.div
                                key={i}
                                className="w-1 bg-purple-400 rounded-full"
                                animate={isPlaying ? {
                                  height: [`40%`, `100%`, `60%`, `80%`, `40%`]
                                } : {
                                  height: '40%'
                                }}
                                transition={{
                                  duration: 0.8,
                                  repeat: isPlaying ? Infinity : 0,
                                  ease: "easeInOut",
                                  delay: i * 0.1
                                }}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="w-full h-full rounded-lg bg-white/5 flex items-center justify-center opacity-60 group-hover:opacity-100 group-hover:bg-purple-500/20 transition-all">
                            <Play className="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors" />
                          </div>
                        )}
                      </div>

                      {/* Song Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold truncate transition-colors ${
                          currentSong?.id === song.id ? 'text-purple-300' : 'text-white group-hover:text-purple-200'
                        }`}>
                          {song.title}
                        </h3>
                        <p className="text-gray-400 text-sm truncate">{song.artist}</p>
                      </div>

                      {/* Duration */}
                      <div className="text-gray-500 text-sm font-mono flex-shrink-0">
                        {song.duration}
                      </div>

                      {/* Status Dot */}
                      <div className="flex-shrink-0">
                        <div className={`w-2 h-2 rounded-full transition-all ${
                          currentSong?.id === song.id ? 'bg-green-500 animate-pulse shadow-lg shadow-green-500/50' : 'bg-gray-700'
                        }`} />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLike(song.id);
                          }}
                          className={`transition-colors ${
                            likedSongs.has(song.id)
                              ? 'text-red-500 opacity-100'
                              : 'text-gray-400 hover:text-white opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          <Heart className={`w-5 h-5 ${likedSongs.has(song.id) ? 'fill-current' : ''}`} />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSongForPlaylistAdd(song);
                            setSelectedPlaylistsForAdd(new Set());
                          }}
                          className="text-gray-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                  </div>
                ))}
            </motion.div>
          )}
          </AnimatePresence>
        </div>

        {/* Bottom Music Player */}
        <motion.div
          initial={{ y: 200 }}
          animate={{ y: 0 }}
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-purple-900/90 via-black/90 to-pink-900/90 backdrop-blur-2xl border-t border-white/20 p-4"
        >
          <div className="max-w-screen-2xl mx-auto">
            {/* Progress Bar - Glowing Comet Trail */}
            <div className="mb-4 relative h-6 flex items-center">
              <div
                ref={progressBarRef}
                className="w-full h-1.5 cursor-pointer group relative bg-white/10 rounded-full"
              >
                {/* Background */}
                <div className="absolute inset-0 bg-white/5 rounded-full overflow-hidden" />

                {/* Filled Progress */}
                <div
                  ref={progressTrackRef}
                  className="absolute left-0 top-0 h-full rounded-full pointer-events-none transition-[width] duration-100 linear"
                  style={{ width: `0%` }}
                >
                  {/* Base gradient */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full pointer-events-none" />

                  {/* Clean playhead dot - Centered perfectly */}
                  <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 pointer-events-none z-10">
                    <div
                      className="w-3 h-3 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)] opacity-0 group-hover:opacity-100 transition-all duration-200 border-2 border-purple-600"
                    />
                    {isPlaying && (
                      <div
                        className="absolute inset-0 w-3 h-3 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.8)] opacity-100 border-2 border-purple-600 animate-pulse"
                      />
                    )}
                  </div>
                </div>

                {/* Native Range Slider - Invisible but interactive overlay */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.1"
                  defaultValue="0"
                  onChange={handleProgressChange}
                  onMouseDown={() => setIsDraggingProgress(true)}
                  onMouseUp={() => setIsDraggingProgress(false)}
                  onTouchStart={() => setIsDraggingProgress(true)}
                  onTouchEnd={() => setIsDraggingProgress(false)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              {/* Current Song Info */}
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {currentSong ? (
                  <>
                    <div className="w-14 h-14 rounded-lg flex-shrink-0 relative bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 p-0.5">
                      {/* Inner container */}
                      <div className="w-full h-full bg-black/90 rounded-lg relative overflow-hidden flex items-center justify-center">
                        {/* Smooth Spinning Vinyl Record */}
                        <motion.div
                          className="w-10 h-10 rounded-full border-2 border-gray-800 flex items-center justify-center relative shadow-[inset_0_0_10px_rgba(0,0,0,1)]"
                          style={{
                            background: 'conic-gradient(from 0deg, #111, #333, #111, #333, #111)'
                          }}
                          animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
                          transition={isPlaying ? { duration: 3, repeat: Infinity, ease: "linear" } : { duration: 0.5, ease: "easeOut" }}
                        >
                          {/* Inner Record Label */}
                          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-inner flex items-center justify-center">
                            <div className="w-1 h-1 bg-black rounded-full" />
                          </div>
                          
                          {/* Grooves */}
                          <div className="absolute inset-1 rounded-full border border-white/5" />
                          <div className="absolute inset-2 rounded-full border border-white/5" />
                        </motion.div>

                        {/* Pulsing Border Glow */}
                        <motion.div
                          className="absolute inset-0 rounded-lg"
                          style={{
                            boxShadow: isPlaying
                              ? '0 0 15px rgba(168, 85, 247, 0.4), inset 0 0 15px rgba(236, 72, 153, 0.2)'
                              : '0 0 5px rgba(168, 85, 247, 0.1)'
                          }}
                          animate={isPlaying ? {
                            boxShadow: [
                              '0 0 15px rgba(168, 85, 247, 0.4), inset 0 0 15px rgba(236, 72, 153, 0.2)',
                              '0 0 25px rgba(236, 72, 153, 0.6), inset 0 0 25px rgba(168, 85, 247, 0.3)',
                              '0 0 15px rgba(168, 85, 247, 0.4), inset 0 0 15px rgba(236, 72, 153, 0.2)'
                            ]
                          } : {}}
                          transition={{
                            duration: 3,
                            repeat: isPlaying ? Infinity : 0,
                            ease: "easeInOut"
                          }}
                        />
                      </div>

                      {/* Corner Accents */}
                      <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 blur-sm" />
                      <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 blur-sm" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-white font-semibold truncate">
                        {currentSong.title}
                      </h4>
                      <p className="text-gray-400 text-sm truncate">
                        {currentSong.artist}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(currentSong.id);
                      }}
                      className={`transition-colors flex-shrink-0 ${
                        likedSongs.has(currentSong.id) ? 'text-red-500' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Heart className={`w-5 h-5 ${likedSongs.has(currentSong.id) ? 'fill-current' : ''}`} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPlayerAddToPlaylist(true);
                        setSelectedPlaylistsForAdd(new Set());
                      }}
                      className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
                      title="Add to playlists"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <div className="text-gray-400 text-sm">No song selected</div>
                )}
              </div>

              {/* Player Controls */}
              <div className="flex flex-col items-center gap-2 flex-1 max-w-md">
                <div className="flex items-center gap-4">
                  <button
                    onClick={toggleShuffle}
                    className={`transition-colors ${
                      isShuffle ? 'text-purple-400' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Shuffle className="w-4 h-4" />
                  </button>

                  <button
                    onClick={skipPrevious}
                    className="text-white hover:scale-110 transition-transform"
                  >
                    <SkipBack className="w-5 h-5" />
                  </button>

                  <button
                    onClick={togglePlay}
                    className="w-12 h-12 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5 text-black" />
                    ) : (
                      <Play className="w-5 h-5 text-black ml-1" />
                    )}
                  </button>

                  <button
                    onClick={skipNext}
                    className="text-white hover:scale-110 transition-transform"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => setIsRepeat(!isRepeat)}
                    className={`transition-colors ${
                      isRepeat ? 'text-purple-400' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Repeat className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      // Fix: use context-aware source
                      if (activeTab === 'liked') {
                        const liked = songs.filter(s => likedSongs.has(s.id));
                        setCustomLoopSource(liked);
                      } else if (selectedPlaylist && playlistSongs.length > 0) {
                        setCustomLoopSource(playlistSongs);
                      } else {
                        setCustomLoopSource(currentQueue.length > 0 ? currentQueue : songs);
                      }
                      setCustomLoopSearch('');
                      setShowCustomLoop(!showCustomLoop);
                    }}
                    className={`transition-colors ${
                      isCustomLoopActive ? 'text-purple-400' : 'text-gray-400 hover:text-white'
                    }`}
                    title={isCustomLoopActive ? `Custom Loop (${customLoopQueue.length} songs)` : 'Custom Loop'}
                  >
                    <List className="w-4 h-4" />
                  </button>

                  {/* Vibe Loop Button */}
                  <button
                    onClick={() => setShowVibeLoop(true)}
                    className={`transition-colors relative ${
                      isVibeLoopActive ? 'text-orange-400' : 'text-gray-400 hover:text-white'
                    }`}
                    title="Vibe Loop – loop a segment"
                  >
                    <Scissors className="w-4 h-4" />
                    {isVibeLoopActive && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-center gap-2 text-sm text-gray-300 font-mono mt-1 -ml-8">
                  <span ref={timeCurrentRef} className="w-[45px] text-right">0:00</span>
                  <span className="text-gray-500">/</span>
                  <span className="w-[45px] text-left">{currentSong?.duration || '0:00'}</span>
                </div>
              </div>

              {/* Volume Control */}
              <div className="flex items-center gap-3 flex-1 justify-end">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>
                <div
                  ref={volumeBarRef}
                  className="w-24 bg-white/20 rounded-full h-1 relative group flex flex-col justify-center"
                >
                  <motion.div
                    className="bg-white h-full rounded-full absolute left-0 top-0 pointer-events-none transition-[width] duration-100 linear"
                    style={{ width: `${volume}%` }}
                    transition={{ type: "tween", duration: 0 }}
                  >
                    <div 
                      className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 pointer-events-none" 
                    >
                      <div className="w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_8px_rgba(255,255,255,0.5)] border-2 border-white" />
                    </div>
                  </motion.div>
                  
                  {/* Native Range Slider - Invisible but interactive overlay */}
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={volume}
                    onChange={handleVolumeChange}
                    onMouseDown={() => setIsDraggingVolume(true)}
                    onMouseUp={() => setIsDraggingVolume(false)}
                    onTouchStart={() => setIsDraggingVolume(true)}
                    onTouchEnd={() => setIsDraggingVolume(false)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Create Playlist Modal */}
      <AnimatePresence>
        {showCreatePlaylist && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowCreatePlaylist(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-gray-900 to-black border border-white/20 rounded-2xl p-8 max-w-md w-full mx-4"
            >
              <h2 className="text-2xl font-bold text-white mb-6">Create New Playlist</h2>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Playlist Name</label>
                <input
                  type="text"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="My Awesome Playlist"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                  autoFocus
                  onKeyPress={(e) => e.key === 'Enter' && createPlaylist()}
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreatePlaylist(false)}
                  className="flex-1 px-4 py-3 bg-white/5 text-white rounded-lg font-medium hover:bg-white/10 transition-all border border-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={createPlaylist}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all"
                >
                  Create
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add to Multiple Playlists Modal */}
      <AnimatePresence>
        {showPlayerAddToPlaylist && currentSong && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => {
              setShowPlayerAddToPlaylist(false);
              setSelectedPlaylistsForAdd(new Set());
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-gray-900 to-black border border-white/20 rounded-2xl p-8 max-w-md w-full mx-4"
            >
              <h2 className="text-2xl font-bold text-white mb-2">Add to Playlists</h2>
              <p className="text-gray-400 text-sm mb-6">
                Select playlists to add &quot;{currentSong.title}&quot;
              </p>

              {playlists.length === 0 ? (
                <div className="text-center py-8">
                  <ListMusic className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No playlists yet</p>
                  <button
                    onClick={() => {
                      setShowPlayerAddToPlaylist(false);
                      setShowCreatePlaylist(true);
                    }}
                    className="mt-4 px-4 py-2 bg-purple-500/20 text-purple-300 rounded-lg text-sm hover:bg-purple-500/30 transition-all"
                  >
                    Create Playlist
                  </button>
                </div>
              ) : (
                <>
                  <div className="max-h-64 overflow-y-auto mb-6 space-y-2">
                    {playlists.map((playlist) => {
                      const isSelected = selectedPlaylistsForAdd.has(playlist.id);
                      return (
                        <label
                          key={playlist.id}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-purple-500/20 border border-purple-500/50'
                              : 'bg-white/5 border border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const newSelected = new Set(selectedPlaylistsForAdd);
                              if (e.target.checked) {
                                newSelected.add(playlist.id);
                              } else {
                                newSelected.delete(playlist.id);
                              }
                              setSelectedPlaylistsForAdd(newSelected);
                            }}
                            className="w-4 h-4 accent-purple-500 cursor-pointer"
                          />
                          <div className="flex-1">
                            <div className="text-white font-medium">{playlist.name}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowPlayerAddToPlaylist(false);
                        setSelectedPlaylistsForAdd(new Set());
                      }}
                      className="flex-1 px-4 py-3 bg-white/5 text-white rounded-lg font-medium hover:bg-white/10 transition-all border border-white/10"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        addSongToMultiplePlaylists(Array.from(selectedPlaylistsForAdd), currentSong.id);
                      }}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={selectedPlaylistsForAdd.size === 0}
                    >
                      Add to {selectedPlaylistsForAdd.size > 0 ? selectedPlaylistsForAdd.size : ''} Playlist{selectedPlaylistsForAdd.size !== 1 ? 's' : ''}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Song to Multiple Playlists Modal (from song list) */}
      <AnimatePresence>
        {songForPlaylistAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => {
              setSongForPlaylistAdd(null);
              setSelectedPlaylistsForAdd(new Set());
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-gray-900 to-black border border-white/20 rounded-2xl p-8 max-w-md w-full mx-4"
            >
              <h2 className="text-2xl font-bold text-white mb-2">Add to Playlists</h2>
              <p className="text-gray-400 text-sm mb-6">
                Select playlists to add &quot;{songForPlaylistAdd.title}&quot;
              </p>

              {playlists.length === 0 ? (
                <div className="text-center py-8">
                  <ListMusic className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No playlists yet</p>
                  <button
                    onClick={() => {
                      setSongForPlaylistAdd(null);
                      setShowCreatePlaylist(true);
                    }}
                    className="mt-4 px-4 py-2 bg-purple-500/20 text-purple-300 rounded-lg text-sm hover:bg-purple-500/30 transition-all"
                  >
                    Create Playlist
                  </button>
                </div>
              ) : (
                <>
                  <div className="max-h-64 overflow-y-auto mb-6 space-y-2">
                    {playlists.map((playlist) => {
                      const isSelected = selectedPlaylistsForAdd.has(playlist.id);
                      return (
                        <label
                          key={playlist.id}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-purple-500/20 border border-purple-500/50'
                              : 'bg-white/5 border border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const newSelected = new Set(selectedPlaylistsForAdd);
                              if (e.target.checked) {
                                newSelected.add(playlist.id);
                              } else {
                                newSelected.delete(playlist.id);
                              }
                              setSelectedPlaylistsForAdd(newSelected);
                            }}
                            className="w-4 h-4 accent-purple-500 cursor-pointer"
                          />
                          <div className="flex-1">
                            <div className="text-white font-medium">{playlist.name}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setSongForPlaylistAdd(null);
                        setSelectedPlaylistsForAdd(new Set());
                      }}
                      className="flex-1 px-4 py-3 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-all font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        if (selectedPlaylistsForAdd.size === 0) {
                          showNotification('error', 'Please select at least one playlist');
                          return;
                        }

                        for (const playlistId of selectedPlaylistsForAdd) {
                          await addSongToPlaylist(playlistId, songForPlaylistAdd.id);
                        }

                        setSongForPlaylistAdd(null);
                        setSelectedPlaylistsForAdd(new Set());
                      }}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={selectedPlaylistsForAdd.size === 0}
                    >
                      Add to {selectedPlaylistsForAdd.size} {selectedPlaylistsForAdd.size === 1 ? 'Playlist' : 'Playlists'}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Loop Modal */}
      <AnimatePresence>
        {showCustomLoop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => {
              setShowCustomLoop(false);
              if (!isCustomLoopActive) setCustomLoopSelection(new Set());
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-gray-900 to-black border border-white/20 rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">Custom Loop</h2>
                  <p className="text-gray-400 text-sm mt-1">
                    {isCustomLoopActive ? `Looping ${customLoopQueue.length} selected songs` :
                     `Select from: ${selectedPlaylist ? selectedPlaylist.name : activeTab === 'liked' ? 'Liked Songs' : 'All Songs'} (${customLoopSource.length} songs)`}
                  </p>
                </div>
                {/* Search inside custom loop */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={customLoopSearch}
                    onChange={e => setCustomLoopSearch(e.target.value)}
                    placeholder="Search..."
                    className="pl-9 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <button
                  onClick={() => {
                    setShowCustomLoop(false);
                    if (!isCustomLoopActive) {
                      setCustomLoopSelection(new Set());
                    }
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 mb-4 mt-4">
                {(customLoopSource.length > 0 ? customLoopSource : currentQueue)
                  .filter(song => customLoopSearch === '' || song.title.toLowerCase().includes(customLoopSearch.toLowerCase()) || song.artist.toLowerCase().includes(customLoopSearch.toLowerCase()))
                  .map((song, index) => (
                  <motion.div
                    key={song.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => {
                      if (isCustomLoopActive) {
                        // If loop is active, clicking plays the song
                        const loopIndex = customLoopQueue.findIndex(s => s.id === song.id);
                        if (loopIndex >= 0) {
                          setCurrentSong(song);
                          setIsPlaying(true);
                          trackPlay(song.id, false, 0);
                          setShowCustomLoop(false);
                        }
                      } else {
                        // If loop is not active, clicking toggles selection
                        setCustomLoopSelection(prev => {
                          const newSelection = new Set(prev);
                          if (newSelection.has(song.id)) {
                            newSelection.delete(song.id);
                          } else {
                            newSelection.add(song.id);
                          }
                          return newSelection;
                        });
                      }
                    }}
                    className={`group flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-all ${
                      isCustomLoopActive && customLoopQueue.find(s => s.id === song.id) && currentSong?.id === song.id
                        ? 'bg-purple-500/20 border border-purple-500/50'
                        : customLoopSelection.has(song.id)
                        ? 'bg-purple-500/10 border border-purple-500/30'
                        : 'bg-white/5 hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    {!isCustomLoopActive && (
                      <div className="flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={customLoopSelection.has(song.id)}
                          onChange={() => {}}
                          className="w-4 h-4 rounded border-gray-600 text-purple-500 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    )}

                    <div className="flex-shrink-0 w-8 text-center">
                      {isCustomLoopActive && customLoopQueue.find(s => s.id === song.id) && currentSong?.id === song.id ? (
                        <div className="flex items-center justify-center">
                          <div className={`w-3 h-3 bg-purple-500 rounded-full ${isPlaying ? 'animate-pulse' : ''}`}></div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">{index + 1}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${
                        (isCustomLoopActive && customLoopQueue.find(s => s.id === song.id) && currentSong?.id === song.id) || customLoopSelection.has(song.id)
                          ? 'text-purple-300'
                          : 'text-white'
                      }`}>
                        {song.title}
                      </p>
                      <p className="text-gray-400 text-sm truncate">{song.artist}</p>
                    </div>

                    <div className="flex-shrink-0 text-gray-400 text-sm">
                      {song.duration}
                    </div>
                  </motion.div>
                  ))}
              </div>

              {!isCustomLoopActive && (
                <div className="flex gap-3 pt-4 border-t border-white/10">
                  <button
                    onClick={() => {
                      const src = customLoopSource.length > 0 ? customLoopSource : currentQueue;
                      const allSelected = customLoopSelection.size === src.length;
                      if (allSelected) {
                        setCustomLoopSelection(new Set());
                      } else {
                        setCustomLoopSelection(new Set(src.map(s => s.id)));
                      }
                    }}
                    className="px-4 py-2 bg-white/5 text-gray-300 rounded-lg text-sm hover:bg-white/10 transition-all border border-white/10"
                  >
                    {customLoopSelection.size === (customLoopSource.length > 0 ? customLoopSource : currentQueue).length ? 'Deselect All' : 'Select All'}
                  </button>
                  <button
                    onClick={() => {
                      if (customLoopSelection.size === 0) {
                        showNotification('error', 'Please select at least one song');
                        return;
                      }
                      const src = customLoopSource.length > 0 ? customLoopSource : currentQueue;
                      const selectedSongs = src.filter(s => customLoopSelection.has(s.id));
                      setCustomLoopQueue(selectedSongs);
                      setIsCustomLoopActive(true);

                      // Start playing the first song from the custom loop immediately
                      if (selectedSongs.length > 0) {
                        setCurrentSong(selectedSongs[0]);
                        setIsPlaying(true);
                        if (progressTrackRef.current) progressTrackRef.current.style.width = '0%';
                        if (timeCurrentRef.current) timeCurrentRef.current.innerText = '0:00';
                        trackPlay(selectedSongs[0].id, false, 0);
                        addDebugLog(`Started custom loop with ${selectedSongs.length} songs`);
                      }

                      setShowCustomLoop(false);
                      showNotification('success', `Looping ${selectedSongs.length} songs`);
                    }}
                    disabled={customLoopSelection.size === 0}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Apply Loop ({customLoopSelection.size} selected)
                  </button>
                </div>
              )}

              {isCustomLoopActive && (
                <div className="flex gap-3 pt-4 border-t border-white/10">
                  <button
                    onClick={() => {
                      setIsCustomLoopActive(false);
                      setCustomLoopQueue([]);
                      setCustomLoopSelection(new Set());
                      setShowCustomLoop(false);
                      showNotification('info', 'Custom loop disabled');
                    }}
                    className="flex-1 px-4 py-3 bg-red-500/20 text-red-300 rounded-lg font-medium hover:bg-red-500/30 transition-all border border-red-500/50"
                  >
                    Clear Loop
                  </button>
                  <button
                    onClick={() => setShowCustomLoop(false)}
                    className="flex-1 px-4 py-3 bg-white/5 text-white rounded-lg font-medium hover:bg-white/10 transition-all border border-white/10"
                  >
                    Close
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vibe Loop Modal */}
      <AnimatePresence>
        {showVibeLoop && currentSong && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowVibeLoop(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-gray-900 to-black border border-orange-500/30 rounded-2xl p-8 max-w-lg w-full mx-4"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Scissors className="w-6 h-6 text-orange-400" />
                    Vibe Loop
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">Select the part you want to loop</p>
                </div>
                <button onClick={() => setShowVibeLoop(false)} className="text-gray-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-white font-medium truncate">{currentSong.title}</p>
                <p className="text-gray-400 text-sm">{currentSong.artist}</p>
              </div>

              {/* Segment bar */}
              <div className="mb-8 mt-4">
                <div 
                  className="relative w-full h-8 flex items-center cursor-pointer touch-none select-none mb-4"
                  ref={vibeTrackRef}
                  onPointerDown={(e) => {
                    if (!vibeTrackRef.current) return;
                    const rect = vibeTrackRef.current.getBoundingClientRect();
                    const percent = ((e.clientX - rect.left) / rect.width) * 100;
                    const distStart = Math.abs(percent - vibeLoopStart);
                    const distEnd = Math.abs(percent - vibeLoopEnd);
                    setVibeDraggingHandle(distStart < distEnd ? 'start' : 'end');
                  }}
                  onPointerMove={(e) => {
                    if (!vibeDraggingHandle || !vibeTrackRef.current) return;
                    const rect = vibeTrackRef.current.getBoundingClientRect();
                    let percent = ((e.clientX - rect.left) / rect.width) * 100;
                    percent = Math.max(0, Math.min(100, Math.round(percent * 2) / 2));
                    
                    if (vibeDraggingHandle === 'start') {
                      setVibeLoopStart(Math.min(percent, vibeLoopEnd - 1));
                    } else {
                      setVibeLoopEnd(Math.max(percent, vibeLoopStart + 1));
                    }
                    
                    // Jump to START of loop region and play
                    if (audioRef.current && audioRef.current.duration) {
                      const startTime = Math.min(vibeLoopStart, vibeLoopEnd - 1);
                      const startSeconds = (startTime / 100) * audioRef.current.duration;
                      audioRef.current.currentTime = startSeconds;
                      if (!isPlaying) {
                        audioRef.current.play().catch(console.error);
                        setIsPlaying(true);
                      }
                    }
                  }}
                  onPointerUp={() => {
                    if (vibeDraggingHandle) {
                      setVibeDraggingHandle(null);
                    }
                  }}
                  onPointerLeave={() => {
                    if (vibeDraggingHandle) {
                      setVibeDraggingHandle(null);
                    }
                  }}
                >
                  {/* Track base */}
                  <div className="absolute w-full h-2 bg-white/10 rounded-full" />
                  
                  {/* Highlight */}
                  <div
                    className="absolute h-2 bg-orange-500/80 pointer-events-none"
                    style={{ left: `${vibeLoopStart}%`, width: `${vibeLoopEnd - vibeLoopStart}%` }}
                  />

                  {/* Start Thumb */}
                  <div
                    onPointerDown={(e) => { e.stopPropagation(); setVibeDraggingHandle('start'); }}
                    className={`absolute w-6 h-6 bg-white border-[6px] border-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.8)] -ml-3 transition-transform ${vibeDraggingHandle === 'start' ? 'scale-125' : 'hover:scale-110'}`}
                    style={{ left: `${vibeLoopStart}%` }}
                  />

                  {/* End Thumb */}
                  <div
                    onPointerDown={(e) => { e.stopPropagation(); setVibeDraggingHandle('end'); }}
                    className={`absolute w-6 h-6 bg-white border-[6px] border-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.8)] -ml-3 transition-transform ${vibeDraggingHandle === 'end' ? 'scale-125' : 'hover:scale-110'}`}
                    style={{ left: `${vibeLoopEnd}%` }}
                  />
                </div>
                
                <div className="flex justify-between text-xs text-gray-400 mt-2 px-1 text-center font-mono">
                  <span className="w-16 text-left">START<br/><b className="text-white">{formatPercentToTime(vibeLoopStart)}</b></span>
                  <span className="text-orange-400 mt-2"><b>LOOPING {formatPercentToTime(vibeLoopEnd - vibeLoopStart)}</b></span>
                  <span className="w-16 text-right">END<br/><b className="text-white">{formatPercentToTime(vibeLoopEnd)}</b></span>
                </div>
              </div>


              <div className="flex gap-3">
                {isVibeLoopActive && (
                  <button
                    onClick={() => {
                      setIsVibeLoopActive(false);
                      setShowVibeLoop(false);
                      showNotification('info', 'Vibe Loop deactivated');
                    }}
                    className="flex-1 px-4 py-3 bg-red-500/20 text-red-300 rounded-lg font-medium hover:bg-red-500/30 transition-all border border-red-500/50"
                  >
                    Stop Vibe Loop
                  </button>
                )}
                <button
                  onClick={() => {
                    // Seek to start point
                    if (audioRef.current && audioRef.current.duration) {
                      audioRef.current.currentTime = (vibeLoopStart / 100) * audioRef.current.duration;
                    }
                    setIsVibeLoopActive(true);
                    if (!isPlaying) setIsPlaying(true);
                    setShowVibeLoop(false);
                    showNotification('success', 'Vibe Loop activated!');
                  }}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-orange-500/30 transition-all"
                >
                  🎵 Activate Vibe Loop
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Friends — Copy Playlist Modal */}
      <AnimatePresence>
        {showCopyPlaylistModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowCopyPlaylistModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-gray-900 to-black border border-white/20 rounded-2xl p-8 max-w-md w-full mx-4"
            >
              <h2 className="text-2xl font-bold text-white mb-2">Copy Playlist</h2>
              <p className="text-gray-400 text-sm mb-6">Give this playlist a name in your library</p>
              <input
                type="text"
                value={copyPlaylistName}
                onChange={(e) => setCopyPlaylistName(e.target.value)}
                placeholder={showCopyPlaylistModal?.name || 'My Playlist'}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 mb-6"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCopyPlaylistModal(null)}
                  className="flex-1 px-4 py-3 bg-white/5 text-white rounded-lg font-medium hover:bg-white/10 border border-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const name = copyPlaylistName.trim() || showCopyPlaylistModal?.name;
                    if (!name || !user) return;
                    // Create new playlist
                    const { data: newPl, error: plErr } = await supabase
                      .from('playlists').insert([{ name, custom_user_id: user.id }]).select().single();
                    if (plErr || !newPl) { showNotification('error', 'Failed to create playlist'); return; }
                    // Copy songs
                    const songRes = await fetch(`/api/friends/${viewingFriend?.id}/playlists/${showCopyPlaylistModal.id}/songs`);
                    const songData = await songRes.json();
                    if (songData.songs && songData.songs.length > 0) {
                      await supabase.from('playlist_songs').insert(
                        songData.songs.map((s: any) => ({ playlist_id: newPl.id, song_id: s.id }))
                      );
                    }
                    showNotification('success', `Playlist "${name}" added to your library!`);
                    fetchPlaylists();
                    setShowCopyPlaylistModal(null);
                    setCopyPlaylistName('');
                  }}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium"
                >
                  Add to My Library
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Remove Friend Confirmation */}
      <AnimatePresence>
        {removeFriendConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60]"
            onClick={() => setRemoveFriendConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-gray-900 to-black border border-red-500/30 rounded-2xl p-6 max-w-sm w-full mx-4"
            >
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <UserMinus className="w-7 h-7 text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Remove Friend</h3>
                <p className="text-gray-400 text-sm">Are you sure you want to remove <span className="text-white font-semibold">{removeFriendConfirm.username}</span> from your friends?</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setRemoveFriendConfirm(null)}
                  className="flex-1 px-4 py-3 bg-white/5 text-gray-300 rounded-lg font-medium hover:bg-white/10 transition-all border border-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const res = await fetch('/api/friends', {
                      method: 'DELETE',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ friendId: removeFriendConfirm.id })
                    });
                    const data = await res.json();
                    if (data.success) {
                      showNotification('success', `${removeFriendConfirm.username} removed from friends`);
                      setFriendPlaylistsCache(prev => { const n = { ...prev }; delete n[removeFriendConfirm.id]; return n; });
                      fetchFriends();
                    }
                    setRemoveFriendConfirm(null);
                  }}
                  className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-all"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-44 right-6 z-50"
          >
            <div className={`bg-gradient-to-br from-gray-900 to-black border rounded-xl p-4 shadow-lg max-w-sm ${
              notification.type === 'success'
                ? 'border-green-500/50 shadow-green-500/10'
                : notification.type === 'error'
                ? 'border-red-500/50 shadow-red-500/10'
                : 'border-blue-500/50 shadow-blue-500/10'
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {notification.type === 'success' ? '✅' : notification.type === 'error' ? '❌' : 'ℹ️'}
                </span>
                <p className={`font-medium text-sm ${
                  notification.type === 'success'
                    ? 'text-green-200'
                    : notification.type === 'error'
                    ? 'text-red-200'
                    : 'text-blue-200'
                }`}>{notification.message}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


