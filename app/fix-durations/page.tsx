'use client';

import { useState } from 'react';

export default function FixDurationsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [progress, setProgress] = useState('');
  const [currentSong, setCurrentSong] = useState('');
  const [stats, setStats] = useState({ current: 0, total: 0, updated: 0, failed: 0 });

  const handleFix = async () => {
    setLoading(true);
    setResult(null);
    setProgress('Starting duration fix...');
    setStats({ current: 0, total: 0, updated: 0, failed: 0 });

    try {
      const eventSource = new EventSource('/api/fix-durations', {
        // @ts-ignore
        method: 'POST'
      });

      // Fallback: use fetch with streaming
      const response = await fetch('/api/fix-durations', {
        method: 'POST',
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.substring(6));

              if (data.type === 'start') {
                setStats(prev => ({ ...prev, total: data.total }));
                setProgress(`Processing ${data.total} songs...`);
              } else if (data.type === 'progress') {
                setStats({
                  current: data.current,
                  total: data.total,
                  updated: data.updated,
                  failed: data.failed
                });
                setCurrentSong(data.songTitle);
                setProgress(`Processing song ${data.current}/${data.total}...`);
              } else if (data.type === 'complete') {
                setResult({
                  success: true,
                  message: `Updated ${data.updated} songs, ${data.failed} failed`,
                  updated: data.updated,
                  failed: data.failed,
                  total: data.total,
                  errors: data.errors
                });
                setProgress('');
                setLoading(false);
              } else if (data.error) {
                setResult({ success: false, error: data.error });
                setProgress('');
                setLoading(false);
              }
            }
          }
        }
      }
    } catch (error: any) {
      setResult({ success: false, error: error.message });
      setProgress('');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-8">
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 max-w-2xl w-full border border-white/20">
        <h1 className="text-3xl font-bold text-white mb-4">Fix Song Durations</h1>
        <p className="text-gray-300 mb-6">
          This will update all 634 songs with real durations from their MP3 files.
          This process will take 10-20 minutes.
        </p>

        <button
          onClick={handleFix}
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold text-lg hover:shadow-2xl hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Fixing Durations...' : 'Start Duration Fix'}
        </button>

        {progress && (
          <div className="mt-6 p-4 bg-blue-500/20 border border-blue-500/50 rounded-xl">
            <p className="text-blue-200 font-semibold mb-2">{progress}</p>
            {stats.total > 0 && (
              <>
                <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
                    style={{ width: `${(stats.current / stats.total) * 100}%` }}
                  />
                </div>
                <div className="text-sm text-gray-300 space-y-1">
                  <p>Current: {currentSong}</p>
                  <div className="flex justify-between">
                    <span>Updated: {stats.updated}</span>
                    <span>Failed: {stats.failed}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {result && (
          <div className={`mt-6 p-4 rounded-xl border ${
            result.success
              ? 'bg-green-500/20 border-green-500/50'
              : 'bg-red-500/20 border-red-500/50'
          }`}>
            <h2 className={`font-bold mb-2 ${result.success ? 'text-green-200' : 'text-red-200'}`}>
              {result.success ? 'Success!' : 'Error'}
            </h2>
            <p className={result.success ? 'text-green-100' : 'text-red-100'}>
              {result.message || result.error}
            </p>
            {result.success && (
              <div className="mt-4 text-sm text-gray-300">
                <p>Updated: {result.updated}</p>
                <p>Failed: {result.failed}</p>
                <p>Total: {result.total}</p>
              </div>
            )}
            {result.errors && result.errors.length > 0 && (
              <div className="mt-4 text-sm text-red-200">
                <p className="font-semibold mb-2">First few errors:</p>
                <ul className="list-disc list-inside">
                  {result.errors.slice(0, 5).map((err: any, i: number) => (
                    <li key={i}>{err.title}: {err.error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
