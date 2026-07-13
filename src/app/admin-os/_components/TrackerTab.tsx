'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import {
  Play,
  Activity,
  Clock,
  Zap,
  ExternalLink,
  RefreshCw,
  Layers,
  Compass,
  Globe,
} from 'lucide-react';

interface RecentVisit {
  id: string;
  path: string;
  referrer: string;
  userAgent: string;
  ipAddress: string | null;
  loadTimeMs: number | null;
  durationSec: number;
  createdAt: string;
}

interface ActiveUser {
  sessionToken: string;
  path: string;
  referrer: string | null;
  userAgent: string;
  updatedAt: string;
}

interface PathStat {
  path: string;
  count: number;
}

interface ReferrerStat {
  name: string;
  count: number;
}

interface AnalyticsData {
  totalViews: number;
  uniqueSessions: number;
  avgLoadTime: number;
  avgDuration: number;
  topPaths: PathStat[];
  topReferrers: ReferrerStat[];
  activeUsersCount: number;
  activeUsers: ActiveUser[];
  recentVisits: RecentVisit[];
}

export default function TrackerTab() {
  const { toast } = useToast();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rangeDays, setRangeDays] = useState(7);
  const [isPending, startTransition] = useTransition();

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tracker?days=${rangeDays}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        toast({
          variant: 'error',
          title: 'Analytics Load Failed',
          description: 'Failed to retrieve visitor tracking metrics.',
        });
      }
    } catch {
      // swallow
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
    // Setup automatic interval to refresh active users every 10 seconds
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/tracker?days=${rangeDays}`);
        if (res.ok) {
          const json = await res.json();
          setData(prev => {
            if (!prev) return json;
            return {
              ...json,
              // Update live stats dynamically
              activeUsersCount: json.activeUsersCount,
              activeUsers: json.activeUsers,
            };
          });
        }
      } catch {
        // ignore background fetch errors
      }
    }, 10000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeDays]);

  const handleRefresh = () => {
    startTransition(async () => {
      await loadAnalytics();
    });
  };

  const getSpeedRating = (ms: number | null) => {
    if (ms === null || ms <= 0) return { label: 'Unknown', color: 'bg-slate-500 text-slate-100' };
    if (ms < 1000) return { label: 'Fast (LCP)', color: 'bg-emerald-500 text-white' };
    if (ms < 3000) return { label: 'Moderate', color: 'bg-amber-500 text-white' };
    return { label: 'Slow', color: 'bg-rose-500 text-white' };
  };

  const formatDuration = (sec: number) => {
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="tracker-panel">
      {/* Filters Header */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="range-selector">
            <button onClick={() => setRangeDays(1)} className={rangeDays === 1 ? 'active' : ''}>
              Today
            </button>
            <button onClick={() => setRangeDays(7)} className={rangeDays === 7 ? 'active' : ''}>
              7 Days
            </button>
            <button onClick={() => setRangeDays(30)} className={rangeDays === 30 ? 'active' : ''}>
              30 Days
            </button>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isPending}
            className="refresh-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-650"
          >
            <RefreshCw size={13} className={isPending ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Live indicator badge */}
        <div className="live-badge flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm">
          <span className="live-dot w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>{data?.activeUsersCount || 0} active visitors online</span>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex h-96 items-center justify-center text-slate-400 font-medium">
          Loading metrics...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Level Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card">
              <div className="card-header flex justify-between items-center">
                <span className="card-subtitle">Total Pageviews</span>
                <Layers size={16} className="text-blue-500" />
              </div>
              <div className="card-value">{data?.totalViews.toLocaleString() || 0}</div>
              <span className="card-foot">Total hits in selected range</span>
            </div>

            <div className="card">
              <div className="card-header flex justify-between items-center">
                <span className="card-subtitle">Unique Sessions</span>
                <Compass size={16} className="text-violet-500" />
              </div>
              <div className="card-value">{data?.uniqueSessions.toLocaleString() || 0}</div>
              <span className="card-foot">Distinct visitor sessions</span>
            </div>

            <div className="card">
              <div className="card-header flex justify-between items-center">
                <span className="card-subtitle">Avg Page Load Speed</span>
                <Zap size={16} className="text-amber-500" />
              </div>
              <div className="card-value">
                {data?.avgLoadTime ? `${(data.avgLoadTime / 1000).toFixed(2)}s` : '—'}
              </div>
              <span
                className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${getSpeedRating(data?.avgLoadTime || null).color}`}
              >
                {getSpeedRating(data?.avgLoadTime || null).label}
              </span>
            </div>

            <div className="card">
              <div className="card-header flex justify-between items-center">
                <span className="card-subtitle">Avg Session Duration</span>
                <Clock size={16} className="text-emerald-500" />
              </div>
              <div className="card-value">
                {data?.avgDuration ? formatDuration(data.avgDuration) : '—'}
              </div>
              <span className="card-foot">Average active engagement</span>
            </div>
          </div>

          {/* Breakdown Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Visited Paths */}
            <div className="panel">
              <h3 className="panel-title flex items-center gap-2 mb-4 text-slate-800 text-sm font-bold">
                <Compass size={16} className="text-blue-500" /> Top Landing Pages / Paths
              </h3>
              <div className="space-y-3">
                {data?.topPaths.map((p, i) => (
                  <div key={p.path} className="flex justify-between items-center text-xs">
                    <span className="font-mono text-slate-600 bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5 max-w-[280px] truncate">
                      {p.path}
                    </span>
                    <span className="font-bold text-slate-700 bg-blue-50 text-blue-700 rounded-full px-2 py-0.5">
                      {p.count} hits
                    </span>
                  </div>
                ))}
                {data?.topPaths.length === 0 && (
                  <div className="text-center py-10 text-slate-400 text-xs">
                    No pages logged yet.
                  </div>
                )}
              </div>
            </div>

            {/* Top Traffic Referrers */}
            <div className="panel">
              <h3 className="panel-title flex items-center gap-2 mb-4 text-slate-800 text-sm font-bold">
                <Globe size={16} className="text-violet-500" /> Entry Channels / Referrers
              </h3>
              <div className="space-y-3">
                {data?.topReferrers.map((r, i) => (
                  <div key={r.name} className="flex justify-between items-center text-xs">
                    <span className="font-medium text-slate-650 flex items-center gap-1.5">
                      <Compass size={12} className="text-slate-400" />
                      {r.name}
                    </span>
                    <span className="font-bold text-slate-700 bg-violet-50 text-violet-700 rounded-full px-2 py-0.5">
                      {r.count} refs
                    </span>
                  </div>
                ))}
                {data?.topReferrers.length === 0 && (
                  <div className="text-center py-10 text-slate-400 text-xs">
                    No referrers logged.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Active online users details */}
          <div className="panel">
            <h3 className="panel-title flex items-center gap-2 mb-4 text-slate-800 text-sm font-bold">
              <Activity size={16} className="text-emerald-500" /> Live Traffic Timeline (Active
              Visitors)
            </h3>
            <div className="overflow-x-auto">
              <table className="tracker-table w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5">Session ID</th>
                    <th className="py-2.5">Current Path</th>
                    <th className="py-2.5">Referrer</th>
                    <th className="py-2.5">User Agent</th>
                    <th className="py-2.5">Last Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.activeUsers.map(u => (
                    <tr
                      key={u.sessionToken}
                      className="border-b border-slate-50 hover:bg-slate-50/50"
                    >
                      <td className="py-3 font-mono text-slate-500">
                        {u.sessionToken.substring(5, 13)}...
                      </td>
                      <td className="py-3 font-medium text-slate-700">{u.path}</td>
                      <td
                        className="py-3 text-slate-400 text-[11px] truncate max-w-[150px]"
                        title={u.referrer || 'Direct'}
                      >
                        {u.referrer ? new URL(u.referrer).hostname : 'Direct'}
                      </td>
                      <td
                        className="py-3 text-slate-400 text-[10px] truncate max-w-[180px]"
                        title={u.userAgent}
                      >
                        {u.userAgent}
                      </td>
                      <td className="py-3 font-semibold text-emerald-600">Active now</td>
                    </tr>
                  ))}
                  {data?.activeUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        No active users online in the last 2 minutes.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent timeline logs */}
          <div className="panel">
            <h3 className="panel-title flex items-center gap-2 mb-4 text-slate-800 text-sm font-bold">
              <Play size={16} className="text-blue-500" /> Visitor Session Logs (Last 50 Entries)
            </h3>
            <div className="overflow-x-auto">
              <table className="tracker-table w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5">Time</th>
                    <th className="py-2.5">Visited Path</th>
                    <th className="py-2.5">Referrer</th>
                    <th className="py-2.5">Page Load Speed</th>
                    <th className="py-2.5">Time Spent</th>
                    <th className="py-2.5">IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.recentVisits.map(visit => {
                    const speed = getSpeedRating(visit.loadTimeMs);
                    return (
                      <tr key={visit.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-3 text-slate-500 text-[11px]">
                          {new Date(visit.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 font-medium text-slate-700">{visit.path}</td>
                        <td className="py-3 text-slate-500">{visit.referrer}</td>
                        <td className="py-3">
                          {visit.loadTimeMs ? (
                            <span
                              className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${speed.color}`}
                            >
                              {visit.loadTimeMs} ms
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Pending / SSR</span>
                          )}
                        </td>
                        <td className="py-3 font-bold text-slate-650">
                          {formatDuration(visit.durationSec)}
                        </td>
                        <td className="py-3 text-slate-400 font-mono text-[10px]">
                          {visit.ipAddress || '—'}
                        </td>
                      </tr>
                    );
                  })}
                  {data?.recentVisits.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        No logs recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .tracker-panel {
          font-family: 'Inter', sans-serif;
        }
        .range-selector {
          display: flex;
          border: 1px border-slate-200;
          background: #f1f5f9;
          border-radius: 8px;
          padding: 2px;
        }
        .range-selector button {
          border: none;
          background: transparent;
          font-size: 11px;
          font-weight: 700;
          color: #475569;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .range-selector button.active {
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          color: #1e3b8a;
        }
        .card {
          background: #ffffff;
          border: 1px solid #f1f5f9;
          border-radius: 16px;
          padding: 18px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
        }
        .card-subtitle {
          font-size: 11px;
          color: #64748b;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .card-value {
          font-size: 26px;
          font-weight: 900;
          color: #0f172a;
          margin-top: 8px;
        }
        .card-foot {
          font-size: 10px;
          color: #94a3b8;
          display: block;
          margin-top: 6px;
        }
        .panel {
          background: #ffffff;
          border: 1px solid #f1f5f9;
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
        }
      `}</style>
    </div>
  );
}
