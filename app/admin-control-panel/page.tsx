'use client';

import { useState, useEffect } from 'react';
import {
  Music, Upload, Trash2, Users, Disc, ArrowLeft, Plus, X, Check,
  BarChart3, Settings, TrendingUp, Download, Eye, Clock, HardDrive,
  Activity, Signal, Database, Edit, UserX, PlayCircle, Calendar, FileText,
  Radio, RefreshCw, Zap, ToggleLeft, ToggleRight, AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, type Song } from '@/lib/supabase';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('overview');
  const [songs, setSongs] = useState<Song[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [selectedSong, setSelectedSong] = useState<any>(null);
  const [songPlayStats, setSongPlayStats] = useState<{username: string; count: number; last_played: string}[]>([]);
  const [loadingPlayStats, setLoadingPlayStats] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Form states
  const [songTitle, setSongTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [albumName, setAlbumName] = useState('');
  const [duration, setDuration] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileSize, setFileSize] = useState('');
  const [showDeletePanel, setShowDeletePanel] = useState(false);
  const [selectedSongsToDelete, setSelectedSongsToDelete] = useState<number[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<File[]>([]);

  // Discover tab state
  const [pendingSongs, setPendingSongs] = useState<any[]>([]);
  const [loadingDiscover, setLoadingDiscover] = useState(false);
  const [discoverFilter, setDiscoverFilter] = useState<'all' | 'spotify' | 'shazam' | 'trending'>('all');
  const [selectedPending, setSelectedPending] = useState<number[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [exploreEnabled, setExploreEnabled] = useState(false);
  const [togglingExplore, setTogglingExplore] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'info';
    message: string;
  }>({ show: false, type: 'success', message: '' });

  // Show notification helper
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ show: true, type, message });
    setTimeout(() => {
      setNotification({ show: false, type, message: '' });
    }, 5000);
  };

  // Fetch per-user play stats via server-side API (uses service role key, bypasses RLS)
  const fetchSongPlayStats = async (songId: number) => {
    setLoadingPlayStats(true);
    setSongPlayStats([]);
    try {
      const res = await fetch(`/api/admin/song-play-stats?song_id=${songId}`);
      const data = await res.json();
      if (data.stats) setSongPlayStats(data.stats);
    } catch { /* silently ignore */ }
    setLoadingPlayStats(false);
  };

  const fetchPendingSongs = async () => {
    setLoadingDiscover(true);
    try {
      const res = await fetch('/api/admin/pending-songs');
      const data = await res.json();
      if (data.songs) setPendingSongs(data.songs);
    } catch { /* ignore */ }
    setLoadingDiscover(false);
  };

  const fetchExploreToggle = async () => {
    try {
      const res = await fetch('/api/admin/explore-toggle');
      const data = await res.json();
      if (typeof data.enabled === 'boolean') setExploreEnabled(data.enabled);
    } catch { /* ignore */ }
  };

  const handleToggleExplore = async () => {
    setTogglingExplore(true);
    try {
      const res = await fetch('/api/admin/explore-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !exploreEnabled }),
      });
      const data = await res.json();
      if (typeof data.enabled === 'boolean') setExploreEnabled(data.enabled);
      showNotification('success', `Explore tab ${data.enabled ? 'enabled' : 'disabled'} for users`);
    } catch {
      showNotification('error', 'Failed to update Explore setting');
    }
    setTogglingExplore(false);
  };

  const handleDownloadSelected = async () => {
    if (selectedPending.length === 0) {
      showNotification('error', 'Select at least one song to download');
      return;
    }
    setDownloading(true);
    try {
      const res = await fetch('/api/download-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song_ids: selectedPending }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Download failed');
      showNotification('success', `Download started for ${selectedPending.length} song${selectedPending.length > 1 ? 's' : ''}. Check status in a few minutes.`);
      setSelectedPending([]);
      setTimeout(fetchPendingSongs, 2000);
    } catch (err: any) {
      showNotification('error', err.message);
    }
    setDownloading(false);
  };

  // No authentication required - secret URL access only
  useEffect(() => {
    setIsAdmin(true);
  }, []);

  // Fetch songs from database
  useEffect(() => {
    if (!isAdmin) return;

    const fetchSongs = async () => {
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching songs:', error);
      } else {
        setSongs(data || []);
      }
    };

    fetchSongs();
  }, [isAdmin]);

  // Fetch users from custom_users table
  useEffect(() => {
    if (!isAdmin) return;

    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/admin/users');
        const result = await response.json();

        if (result.success) {
          setUsers(result.users || []);
        } else {
          console.error('Error fetching users:', result.error);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
      setLoading(false);
    };

    fetchUsers();
  }, [isAdmin]);

  useEffect(() => {
    if (activeTab === 'discover') {
      fetchPendingSongs();
      fetchExploreToggle();
    }
  }, [activeTab]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const mp3Files = files.filter(file => file.name.endsWith('.mp3'));

    if (mp3Files.length === 0) {
      showNotification('error', 'Please select MP3 files!');
      return;
    }

    if (mp3Files.length !== files.length) {
      showNotification('info', `${files.length - mp3Files.length} non-MP3 files were skipped.`);
    }

    setUploadQueue(mp3Files);
    setUploadProgress({ current: 0, total: mp3Files.length });
    setUploading(true);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < mp3Files.length; i++) {
      const file = mp3Files[i];
      setUploadProgress({ current: i + 1, total: mp3Files.length });

      try {
        // TODO: Implement R2 upload
        failCount++;
        console.error(`Upload not implemented for ${file.name}`);
      } catch (error: any) {
        console.error(`Failed to upload ${file.name}:`, error);
        failCount++;
      }
    }

    // Refresh songs list
    const { data } = await supabase
      .from('songs')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setSongs(data);

    setUploading(false);
    setUploadQueue([]);
    setShowUploadForm(false);

    if (failCount === 0) {
      showNotification('success', `Upload complete! Successfully uploaded ${successCount} song${successCount > 1 ? 's' : ''}`);
    } else {
      showNotification('error', `Upload finished with errors. Success: ${successCount}, Failed: ${failCount}`);
    }
  };


  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to permanently delete this user?')) return;

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', userId }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete user');
      }

      setUsers(users.filter((u) => u.id !== userId));
      showNotification('success', 'User deleted successfully');
    } catch (error: any) {
      showNotification('error', 'Failed to delete user: ' + error.message);
    }
  };

  const handleBlockUser = async (userId: number, reason?: string) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'block', userId, reason }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to block user');
      }

      // Update local state
      setUsers(users.map((u) => u.id === userId ? { ...u, is_blocked: true } : u));
      showNotification('success', 'User blocked successfully');
    } catch (error: any) {
      showNotification('error', 'Failed to block user: ' + error.message);
    }
  };

  const handleUnblockUser = async (userId: number) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unblock', userId }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to unblock user');
      }

      // Update local state
      setUsers(users.map((u) => u.id === userId ? { ...u, is_blocked: false } : u));
      showNotification('success', 'User unblocked successfully');
    } catch (error: any) {
      showNotification('error', 'Failed to unblock user: ' + error.message);
    }
  };

  const toggleSongSelection = (songId: number) => {
    setSelectedSongsToDelete((prev) =>
      prev.includes(songId) ? prev.filter((id) => id !== songId) : [...prev, songId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedSongsToDelete.length === songs.length) {
      setSelectedSongsToDelete([]);
    } else {
      setSelectedSongsToDelete(songs.map((s) => s.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedSongsToDelete.length === 0) {
      showNotification('error', 'Please select at least one song to delete!');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('songs')
        .delete()
        .in('id', selectedSongsToDelete);

      if (error) throw error;

      setSongs(songs.filter((s) => !selectedSongsToDelete.includes(s.id)));
      setSelectedSongsToDelete([]);
      setShowDeletePanel(false);
      showNotification('success', `Successfully deleted ${selectedSongsToDelete.length} song${selectedSongsToDelete.length > 1 ? 's' : ''}!`);
    } catch (error: any) {
      showNotification('error', 'Failed to delete songs: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncFromR2 = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/sync-from-r2', {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Sync failed');
      }

      // Refresh songs list
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error) {
        setSongs(data || []);
      }

      if (result.synced > 0 || result.deleted > 0) {
        let message = '';
        if (result.synced > 0) message += `Added ${result.synced} song${result.synced > 1 ? 's' : ''}`;
        if (result.deleted > 0) {
          if (message) message += ', ';
          message += `Deleted ${result.deleted} song${result.deleted > 1 ? 's' : ''}`;
        }
        showNotification('success', `Sync complete! ${message}`);
      } else {
        showNotification('info', 'Everything in sync. No changes needed.');
      }
    } catch (error: any) {
      showNotification('error', 'Sync failed: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900">
      {/* Notification */}
      <AnimatePresence>
        {notification.show && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className={`fixed top-4 left-1/2 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 w-[90vw] max-w-[500px] backdrop-blur-xl border ${
              notification.type === 'success'
                ? 'bg-green-500/20 border-green-500/50 text-green-400'
                : notification.type === 'error'
                ? 'bg-red-500/20 border-red-500/50 text-red-400'
                : 'bg-blue-500/20 border-blue-500/50 text-blue-400'
            }`}
          >
            {notification.type === 'success' && <Check className="w-6 h-6 flex-shrink-0" />}
            {notification.type === 'error' && <X className="w-6 h-6 flex-shrink-0" />}
            {notification.type === 'info' && <Activity className="w-6 h-6 flex-shrink-0" />}
            <p className="font-medium flex-1">{notification.message}</p>
            <button
              onClick={() => setNotification({ ...notification, show: false })}
              className="hover:opacity-70 transition-opacity"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="bg-black/40 backdrop-blur-xl border-b border-white/10 p-4 md:p-6"
      >
        <div className="max-w-[1800px] mx-auto">
          <div className="flex items-center justify-between mb-4 md:mb-6 gap-3">
            <div className="flex items-center gap-3">
              <svg className="w-10 h-10 md:w-16 md:h-16" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="47" fill="url(#glowGradAdmin)" opacity="0.6"/>
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
                  <circle cx="50" cy="50" r="45" fill="url(#vinylGradAdmin)" stroke="url(#borderGradAdmin)" strokeWidth="1.5"/>
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#3a3a3a" strokeWidth="0.5" opacity="0.5"/>
                  <circle cx="50" cy="50" r="35" fill="none" stroke="#3a3a3a" strokeWidth="0.5" opacity="0.5"/>
                  <circle cx="50" cy="50" r="30" fill="none" stroke="#3a3a3a" strokeWidth="0.5" opacity="0.5"/>
                  <circle cx="50" cy="50" r="25" fill="none" stroke="#3a3a3a" strokeWidth="0.5" opacity="0.5"/>
                  <circle cx="50" cy="50" r="18" fill="url(#labelGradAdmin)"/>
                  <rect x="45" y="5" width="10" height="90" rx="5" fill="url(#shineGradAdmin)" opacity="0.15"/>
                  <circle cx="50" cy="50" r="4" fill="#1a1a1a"/>
                </g>
                <defs>
                  <radialGradient id="glowGradAdmin">
                    <stop offset="0%" stopColor="#A855F7" stopOpacity="0.3"/>
                    <stop offset="50%" stopColor="#EC4899" stopOpacity="0.2"/>
                    <stop offset="100%" stopColor="#FB923C" stopOpacity="0"/>
                  </radialGradient>
                  <radialGradient id="vinylGradAdmin">
                    <stop offset="0%" stopColor="#4a4a4a"/>
                    <stop offset="70%" stopColor="#2a2a2a"/>
                    <stop offset="100%" stopColor="#1a1a1a"/>
                  </radialGradient>
                  <linearGradient id="borderGradAdmin" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#A855F7" stopOpacity="0.6"/>
                    <stop offset="50%" stopColor="#EC4899" stopOpacity="0.6"/>
                    <stop offset="100%" stopColor="#FB923C" stopOpacity="0.6"/>
                  </linearGradient>
                  <linearGradient id="labelGradAdmin" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#A855F7"/>
                    <stop offset="50%" stopColor="#EC4899"/>
                    <stop offset="100%" stopColor="#FB923C"/>
                  </linearGradient>
                  <linearGradient id="shineGradAdmin" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0"/>
                    <stop offset="50%" stopColor="#ffffff" stopOpacity="0.7"/>
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
                  </linearGradient>
                </defs>
              </svg>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg md:text-2xl font-bold" style={{
                    background: 'linear-gradient(135deg, #A855F7, #EC4899, #FB923C)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}>BoxOfVibe</h1>
                  <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded font-semibold">ADMIN</span>
                </div>
                <p className="text-gray-400 text-sm">Manage your music library</p>
              </div>
            </div>

            <button
              onClick={handleSyncFromR2}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 md:px-8 md:py-4 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 text-white rounded-xl font-bold text-sm md:text-lg hover:shadow-2xl hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {syncing ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              <span className="hidden sm:inline">{syncing ? 'Syncing...' : 'Sync from R2'}</span>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'songs', label: 'Songs', icon: Music },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'discover', label: 'Discover', icon: Radio },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto p-3 md:p-6">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Simple Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Disc className="w-6 h-6 text-purple-400" />
                  </div>
                </div>
                <p className="text-gray-400 text-sm">Total Songs</p>
                <p className="text-white text-3xl font-bold">{songs.length}</p>
              </div>

              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-pink-500/20 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-pink-400" />
                  </div>
                </div>
                <p className="text-gray-400 text-sm">Total Users</p>
                <p className="text-white text-3xl font-bold">{users.length}</p>
              </div>
            </div>

            {/* Recent Songs & User Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Songs */}
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                <h3 className="text-xl font-bold text-white mb-4">Recently Added Songs</h3>
                <div className="space-y-3">
                  {songs.slice(0, 10).map((song) => (
                    <div key={song.id} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-purple-400 rounded-full mt-2"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white truncate">{song.title} by {song.artist}</p>
                        <p className="text-gray-500 text-xs">{new Date(song.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                  {songs.length === 0 && (
                    <p className="text-gray-400 text-center py-4">No songs uploaded yet</p>
                  )}
                </div>
              </div>

              {/* User Details */}
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                <h3 className="text-xl font-bold text-white mb-4">User Login Details</h3>
                <div className="space-y-4">
                  {users.slice(0, 10).map((user) => (
                    <div key={user.id} className="bg-white/5 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-white font-semibold text-sm">{user.username || 'No name'}</p>
                        {user.is_blocked ? (
                          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">Blocked</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">Active</span>
                        )}
                      </div>
                      <p className="text-yellow-400 text-sm font-mono">Password: {user.password}</p>
                      <p className="text-gray-500 text-xs mt-1">
                        Joined: {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                  {users.length === 0 && (
                    <p className="text-gray-400 text-center py-4">No users registered yet</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* SONGS TAB */}
        {activeTab === 'songs' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
              <div className="p-4 md:p-6 border-b border-white/10">
                <h2 className="text-lg md:text-xl font-bold text-white">All Songs</h2>
                <p className="text-gray-400 text-sm">{songs.length} songs in library</p>
              </div>

              {/* Mobile cards */}
              <div className="block md:hidden divide-y divide-white/10">
                {songs.map((song) => (
                  <div key={song.id} className="flex items-center gap-3 p-4">
                    <img src={song.cover_url} alt={song.title} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{song.title}</p>
                      <p className="text-gray-400 text-xs truncate">{song.artist}</p>
                      <p className="text-purple-400 text-xs font-bold">{song.play_count} plays</p>
                    </div>
                    <button
                      onClick={() => { setSelectedSong(song); fetchSongPlayStats(song.id); }}
                      className="p-2 bg-blue-500/20 text-blue-400 rounded-lg flex-shrink-0"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {songs.length === 0 && <p className="text-gray-400 text-center py-8 text-sm">No songs yet</p>}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Song</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">File Info</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Statistics</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Upload Info</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {songs.map((song) => (
                      <tr key={song.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img src={song.cover_url} alt={song.title} className="w-12 h-12 rounded-lg object-cover" />
                            <div>
                              <p className="text-white font-semibold">{song.title}</p>
                              <p className="text-gray-400 text-sm">{song.artist}</p>
                              <p className="text-gray-500 text-xs">{song.album}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-white text-sm">{song.file_size}</p>
                          <p className="text-gray-400 text-xs">{song.bitrate} • {song.format}</p>
                          <p className="text-gray-500 text-xs">{song.duration}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-purple-400 font-bold">{song.play_count} plays</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-gray-400 text-xs">{new Date(song.created_at).toLocaleDateString()}</p>
                          <p className="text-gray-500 text-xs">By: {song.uploaded_by}</p>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => { setSelectedSong(song); fetchSongPlayStats(song.id); }}
                            className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-all"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
              <div className="p-4 md:p-6 border-b border-white/10">
                <h2 className="text-lg md:text-xl font-bold text-white">All Users</h2>
                <p className="text-gray-400 text-sm">{users.length} registered users</p>
              </div>

              {/* Mobile cards */}
              <div className="block md:hidden divide-y divide-white/10">
                {users.map((user) => {
                  const diff = user.last_seen ? Date.now() - new Date(user.last_seen).getTime() : null;
                  const isOnline = diff !== null && diff < 90000;
                  const secs = diff ? Math.floor(diff / 1000) : 0;
                  const mins = diff ? Math.floor(diff / 60000) : 0;
                  const hours = diff ? Math.floor(diff / 3600000) : 0;
                  const days = diff ? Math.floor(diff / 86400000) : 0;
                  const weeks = Math.floor(days / 7);
                  const months = Math.floor(days / 30);
                  const years = Math.floor(days / 365);
                  const onlineLabel = diff === null ? 'Never'
                    : isOnline ? 'Online'
                    : years  >= 1 ? `${years}y ago`
                    : months >= 1 ? `${months}mo ago`
                    : weeks  >= 1 ? `${weeks}w ago`
                    : days   >= 1 ? `${days}d ago`
                    : hours  >= 1 ? `${hours}h ago`
                    : mins   >= 1 ? `${mins}m ago`
                    : `${secs}s ago`;
                  return (
                    <div key={user.id} className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-bold">{user.username || 'No username'}</p>
                          <p className="text-yellow-400 font-mono text-sm">{user.password}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
                          <span className={`text-xs ${isOnline ? 'text-green-400' : 'text-gray-500'}`}>{onlineLabel}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-purple-400 font-mono text-sm font-bold">#{user.unique_code || '----'}</span>
                          <p className="text-gray-500 text-xs">Joined {new Date(user.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-2">
                          {user.is_blocked ? (
                            <button onClick={() => handleUnblockUser(user.id)} className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs">Unblock</button>
                          ) : (
                            <button onClick={() => handleBlockUser(user.id)} className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-lg text-xs">Block</button>
                          )}
                          <button onClick={() => handleDeleteUser(user.id)} className="p-1.5 bg-red-500/20 text-red-400 rounded-lg">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {users.length === 0 && <p className="text-gray-400 text-center py-8 text-sm">No users yet</p>}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Username</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Password</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Online</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Unique ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Joined</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-white font-semibold text-lg">{user.username || 'No username'}</p>
                            <p className="text-gray-500 text-xs">ID: {user.id}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-yellow-400 font-mono text-lg font-bold">{user.password}</p>
                        </td>
                        <td className="px-6 py-4">
                          {(() => {
                            if (!user.last_seen) return (
                              <div className="flex items-center gap-2">
                                <span className="w-3 h-3 bg-gray-600 rounded-full" />
                                <span className="text-gray-500 text-xs">Never</span>
                              </div>
                            );
                            const diff = Date.now() - new Date(user.last_seen).getTime();
                            const isOnline = diff < 90000;
                            const secs  = Math.floor(diff / 1000);
                            const mins  = Math.floor(diff / 60000);
                            const hours = Math.floor(diff / 3600000);
                            const days  = Math.floor(diff / 86400000);
                            const weeks = Math.floor(days / 7);
                            const months= Math.floor(days / 30);
                            const years = Math.floor(days / 365);
                            const label = isOnline ? 'Online'
                              : years  >= 1 ? `${years}y ago`
                              : months >= 1 ? `${months}mo ago`
                              : weeks  >= 1 ? `${weeks}w ago`
                              : days   >= 1 ? `${days}d ago`
                              : hours  >= 1 ? `${hours}h ago`
                              : mins   >= 1 ? `${mins}m ago`
                              : `${secs}s ago`;
                            return (
                              <div className="flex items-center gap-2">
                                <span className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500 animate-pulse shadow-lg shadow-green-500/50' : 'bg-gray-600'}`} />
                                <span className={`text-xs font-medium ${isOnline ? 'text-green-400' : 'text-gray-500'}`}>{label}</span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-purple-400 font-mono font-bold tracking-widest text-lg">#{user.unique_code || '----'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-gray-400 text-sm">{new Date(user.created_at).toLocaleDateString()}</p>
                          {user.last_login && (
                            <p className="text-gray-500 text-xs">Last: {new Date(user.last_login).toLocaleDateString()}</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            {user.is_blocked ? (
                              <button
                                onClick={() => handleUnblockUser(user.id)}
                                className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-all text-sm"
                              >
                                Unblock
                              </button>
                            ) : (
                              <button
                                onClick={() => handleBlockUser(user.id)}
                                className="px-3 py-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg transition-all text-sm"
                              >
                                Block
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* DISCOVER TAB */}
        {activeTab === 'discover' && (() => {
          const filtered = pendingSongs.filter(s =>
            discoverFilter === 'all' ? true : s.source?.toLowerCase() === discoverFilter
          );
          const allFilteredSelected = filtered.length > 0 && filtered.every(s => selectedPending.includes(s.id));

          const statusBadge = (status: string) => {
            const map: Record<string, { bg: string; text: string }> = {
              pending:     { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
              downloading: { bg: 'bg-blue-500/20',   text: 'text-blue-400'   },
              done:        { bg: 'bg-green-500/20',  text: 'text-green-400'  },
              failed:      { bg: 'bg-red-500/20',    text: 'text-red-400'    },
            };
            const s = map[status] || map['pending'];
            return (
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${s.bg} ${s.text}`}>
                {status}
              </span>
            );
          };

          return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {/* Top bar */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-white">Discover Queue</h2>
                  <span className="px-2 py-0.5 bg-white/10 text-gray-400 text-xs rounded">{pendingSongs.length} pending</span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Explore toggle */}
                  <button
                    onClick={handleToggleExplore}
                    disabled={togglingExplore}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all disabled:opacity-50"
                  >
                    {exploreEnabled
                      ? <ToggleRight className="w-5 h-5 text-green-400" />
                      : <ToggleLeft className="w-5 h-5 text-gray-500" />}
                    <span className={`text-sm font-medium ${exploreEnabled ? 'text-green-400' : 'text-gray-400'}`}>
                      Explore {exploreEnabled ? 'ON' : 'OFF'}
                    </span>
                  </button>

                  {/* Refresh */}
                  <button
                    onClick={fetchPendingSongs}
                    disabled={loadingDiscover}
                    className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-gray-400 hover:text-white disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingDiscover ? 'animate-spin' : ''}`} />
                  </button>

                  {/* Download selected */}
                  <button
                    onClick={handleDownloadSelected}
                    disabled={downloading || selectedPending.length === 0}
                    className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {downloading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    Download {selectedPending.length > 0 ? `(${selectedPending.length})` : 'Selected'}
                  </button>
                </div>
              </div>

              {/* Source filter tabs */}
              <div className="flex gap-2">
                {(['all', 'spotify', 'shazam', 'trending'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => { setDiscoverFilter(f); setSelectedPending([]); }}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                      discoverFilter === f
                        ? 'bg-white/15 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Song list */}
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
                {loadingDiscover ? (
                  <div className="flex items-center justify-center py-16 text-gray-500">
                    <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading...
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-500">
                    <Radio className="w-10 h-10 opacity-30" />
                    <p className="text-sm">No songs in queue{discoverFilter !== 'all' ? ` from ${discoverFilter}` : ''}.</p>
                    <p className="text-xs opacity-60">Songs added via Make.com automation will appear here.</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={allFilteredSelected}
                            onChange={() => {
                              if (allFilteredSelected) {
                                setSelectedPending(prev => prev.filter(id => !filtered.map(s => s.id).includes(id)));
                              } else {
                                setSelectedPending(prev => [...new Set([...prev, ...filtered.map(s => s.id)])]);
                              }
                            }}
                            className="w-4 h-4 accent-purple-500 cursor-pointer"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Song</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Source</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Added</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {filtered.map(song => (
                        <tr
                          key={song.id}
                          onClick={() => setSelectedPending(prev =>
                            prev.includes(song.id) ? prev.filter(id => id !== song.id) : [...prev, song.id]
                          )}
                          className={`cursor-pointer transition-colors hover:bg-white/5 ${
                            selectedPending.includes(song.id) ? 'bg-purple-500/10' : ''
                          }`}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedPending.includes(song.id)}
                              onChange={() => {}}
                              className="w-4 h-4 accent-purple-500 pointer-events-none"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {song.cover_url ? (
                                <img src={song.cover_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                                  <Music className="w-4 h-4 text-gray-500" />
                                </div>
                              )}
                              <div>
                                <p className="text-white font-medium text-sm">{song.title || 'Unknown'}</p>
                                <p className="text-gray-400 text-xs">{song.artist || '—'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                              song.source === 'spotify'  ? 'bg-green-500/15 text-green-400' :
                              song.source === 'shazam'   ? 'bg-blue-500/15 text-blue-400'   :
                              song.source === 'trending' ? 'bg-orange-500/15 text-orange-400':
                              'bg-white/10 text-gray-400'
                            }`}>
                              {song.source || 'unknown'}
                            </span>
                          </td>
                          <td className="px-4 py-3">{statusBadge(song.status || 'pending')}</td>
                          <td className="px-4 py-3">
                            <p className="text-gray-400 text-xs">
                              {song.created_at ? new Date(song.created_at).toLocaleDateString() : '—'}
                            </p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          );
        })()}

      </div>

      {/* Song Detail Modal */}
      <AnimatePresence>
        {selectedSong && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedSong(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-gray-900 to-purple-900 rounded-2xl p-4 md:p-8 max-w-2xl w-full border border-white/20 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-start mb-4 md:mb-6">
                <h2 className="text-lg md:text-2xl font-bold text-white">Song Details</h2>
                <button onClick={() => setSelectedSong(null)} className="text-gray-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <img src={selectedSong.cover_url} alt={selectedSong.title} className="w-full rounded-xl mb-4" />
                  <h3 className="text-xl font-bold text-white">{selectedSong.title}</h3>
                  <p className="text-gray-400">{selectedSong.artist}</p>
                  <p className="text-gray-500 text-sm">{selectedSong.album}</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-gray-400 text-sm">File Size</p>
                    <p className="text-white font-semibold">{selectedSong.file_size}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Bitrate / Format</p>
                    <p className="text-white font-semibold">{selectedSong.bitrate} • {selectedSong.format}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Duration</p>
                    <p className="text-white font-semibold">{selectedSong.duration}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Total Plays</p>
                    <p className="text-purple-400 font-bold">{selectedSong.play_count} plays</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Uploaded</p>
                    <p className="text-white">{new Date(selectedSong.created_at).toLocaleDateString()}</p>
                  </div>

                  <div>
                    <p className="text-gray-400 text-sm">File URL</p>
                    <p className="text-blue-400 text-xs truncate">{selectedSong.file_url}</p>
                  </div>
                </div>
              </div>

              {/* Per-user play breakdown */}
              <div className="mt-6 border-t border-white/10 pt-5">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <PlayCircle className="w-4 h-4 text-purple-400" />
                  Plays by User
                </h3>
                {loadingPlayStats ? (
                  <p className="text-gray-500 text-sm">Loading...</p>
                ) : songPlayStats.length === 0 ? (
                  <p className="text-gray-500 text-sm">No play history yet.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {songPlayStats.map((stat, i) => (
                      <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-2">
                        <div className="flex items-center gap-3">
                          <span className="text-gray-500 text-xs w-5 text-right">{i + 1}.</span>
                          <span className="text-white font-medium">{stat.username}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-gray-400 text-xs">
                            Last: {(() => {
                              const diff = Date.now() - new Date(stat.last_played).getTime();
                              const mins = Math.floor(diff / 60000);
                              const hours = Math.floor(diff / 3600000);
                              const days = Math.floor(diff / 86400000);
                              return days >= 1 ? `${days}d ago` : hours >= 1 ? `${hours}h ago` : mins >= 1 ? `${mins}m ago` : 'Just now';
                            })()}
                          </span>
                          <span className="text-purple-400 font-bold text-sm min-w-[4rem] text-right">
                            {stat.count} {stat.count === 1 ? 'play' : 'plays'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
