'use client';

import { useState, useEffect } from 'react';
import {
  Music, Upload, Trash2, Users, Disc, ArrowLeft, Plus, X, Check,
  BarChart3, Settings, TrendingUp, Download, Eye, Clock, HardDrive,
  Activity, Signal, Database, Edit, UserX, PlayCircle, Calendar, FileText,
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
            className={`fixed top-4 left-1/2 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 min-w-[400px] backdrop-blur-xl border ${
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
        className="bg-black/40 backdrop-blur-xl border-b border-white/10 p-6"
      >
        <div className="max-w-[1800px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <svg className="w-16 h-16" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                  <h1 className="text-2xl font-bold" style={{
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
              className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 text-white rounded-xl font-bold text-lg hover:shadow-2xl hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
            >
              {syncing ? (
                <>
                  <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Syncing from Cloudflare R2...</span>
                </>
              ) : (
                <>
                  <Download className="w-6 h-6" />
                  <span>Sync from Cloudflare R2</span>
                </>
              )}
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'songs', label: 'Songs', icon: Music },
              { id: 'users', label: 'Users', icon: Users },
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
      <div className="max-w-[1800px] mx-auto p-6">
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
              <div className="p-6 border-b border-white/10">
                <h2 className="text-xl font-bold text-white">All Songs - Complete Details</h2>
                <p className="text-gray-400 text-sm">{songs.length} songs in library</p>
              </div>

              <div className="overflow-x-auto">
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
                          <p className="text-gray-400 text-xs">Last: {'N/A'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-gray-400 text-xs">{new Date(song.created_at).toLocaleDateString()}</p>
                          <p className="text-gray-500 text-xs">By: {song.uploaded_by}</p>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setSelectedSong(song)}
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
              <div className="p-6 border-b border-white/10">
                <h2 className="text-xl font-bold text-white">All Users - Complete Details</h2>
                <p className="text-gray-400 text-sm">{users.length} registered users</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Username</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Password</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Online</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Unique ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
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
                          {/* Online status dot */}
                          {(() => {
                            const isOnline = user.last_seen && (Date.now() - new Date(user.last_seen).getTime()) < 90000;
                            return isOnline ? (
                              <div className="flex items-center gap-2">
                                <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50" />
                                <span className="text-green-400 text-xs font-medium">Online</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="w-3 h-3 bg-gray-600 rounded-full" />
                                <span className="text-gray-500 text-xs">
                                  {user.last_seen ? `${Math.round((Date.now() - new Date(user.last_seen).getTime()) / 60000)}m ago` : 'Never'}
                                </span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-purple-400 font-mono font-bold tracking-widest text-lg">#{user.unique_code || '----'}</span>
                        </td>
                        <td className="px-6 py-4">
                          {user.is_blocked ? (
                            <div>
                              <span className="inline-block px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">
                                Blocked
                              </span>
                              {user.blocked_reason && (
                                <p className="text-gray-500 text-xs mt-1">{user.blocked_reason}</p>
                              )}
                            </div>
                          ) : (
                            <span className="inline-block px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                              Active
                            </span>
                          )}
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
              className="bg-gradient-to-br from-gray-900 to-purple-900 rounded-2xl p-8 max-w-2xl w-full border border-white/20"
            >
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-white">Complete Song Details</h2>
                <button onClick={() => setSelectedSong(null)} className="text-gray-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6">
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
                    <p className="text-gray-400 text-sm">Play Count</p>
                    <p className="text-purple-400 font-bold">{selectedSong.play_count} plays</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Last Played</p>
                    <p className="text-white">{'N/A'}</p>
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
