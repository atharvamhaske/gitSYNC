import React, { useState, useEffect } from 'react';
import Button from '../Button';
import { getStorageData, setStorageData } from '../../utils/storage';

function Dashboard() {
  const [repoUrl, setRepoUrl] = useState('');
  const [syncedProblems, setSyncedProblems] = useState([]);
  const [stats, setStats] = useState({ easy: 0, medium: 0, hard: 0 });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const data = await getStorageData(['repoUrl', 'syncedProblems']);
      setRepoUrl(data.repoUrl || '');
      
      const problems = data.syncedProblems || [];
      setSyncedProblems(problems);
      
      // Calculate stats
      const newStats = { easy: 0, medium: 0, hard: 0 };
      problems.forEach(p => {
        if (p.difficulty) {
          newStats[p.difficulty.toLowerCase()]++;
        }
      });
      setStats(newStats);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const handleDisconnect = async () => {
    if (confirm('Are you sure you want to disconnect? This will remove your GitHub connection.')) {
      await setStorageData({
        githubToken: null,
        repoUrl: null,
        onboardingComplete: false,
        syncedProblems: []
      });
      window.location.reload();
    }
  };

  const repoName = repoUrl ? repoUrl.split('/').slice(-2).join('/') : '';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-heading text-2xl text-black mb-1">GitSync</h1>
        <p className="font-body text-sm text-gray-500">
          Syncing to{' '}
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-black underline"
          >
            {repoName}
          </a>
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="border border-gray-200 p-4 text-center">
          <p className="font-heading text-2xl text-black">{stats.easy}</p>
          <p className="font-body text-xs text-gray-500 mt-1">Easy</p>
        </div>
        <div className="border border-gray-200 p-4 text-center">
          <p className="font-heading text-2xl text-black">{stats.medium}</p>
          <p className="font-body text-xs text-gray-500 mt-1">Medium</p>
        </div>
        <div className="border border-gray-200 p-4 text-center">
          <p className="font-heading text-2xl text-black">{stats.hard}</p>
          <p className="font-body text-xs text-gray-500 mt-1">Hard</p>
        </div>
      </div>

      {/* Recent Syncs */}
      <div className="flex-1">
        <h2 className="font-heading text-lg text-black mb-3">Recent Syncs</h2>
        
        {syncedProblems.length === 0 ? (
          <div className="border border-dashed border-gray-200 p-6 text-center">
            <p className="font-body text-sm text-gray-500">
              No problems synced yet.
            </p>
            <p className="font-body text-xs text-gray-400 mt-1">
              Solve a LeetCode problem to see it here.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {syncedProblems.slice(0, 5).map((problem, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 border-b border-gray-100"
              >
                <div>
                  <p className="font-body text-sm text-black">{problem.name}</p>
                  <p className="font-body text-xs text-gray-400">{problem.language}</p>
                </div>
                <span className={`font-body text-xs px-2 py-1 ${
                  problem.difficulty === 'Easy' ? 'bg-green-50 text-green-700' :
                  problem.difficulty === 'Medium' ? 'bg-yellow-50 text-yellow-700' :
                  'bg-red-50 text-red-700'
                }`}>
                  {problem.difficulty}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status */}
      <div className="mt-6 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500"></div>
        <p className="font-body text-xs text-gray-500">Auto-sync enabled</p>
      </div>

      {/* Disconnect */}
      <div className="mt-4">
        <Button variant="outline" onClick={handleDisconnect}>
          Disconnect
        </Button>
      </div>
    </div>
  );
}

export default Dashboard;
