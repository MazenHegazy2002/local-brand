'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import {
  Play,
  Activity,
  Clock,
  Zap,
  RefreshCw,
  Layers,
  Compass,
  Globe,
  MapPin,
  ListTodo,
} from 'lucide-react';

interface VisitorEvent {
  action: string;
  path: string;
  timestamp: string;
}

interface VisitorSession {
  sessionToken: string;
  city: string;
  country: string;
  ipAddress: string | null;
  updatedAt: string;
  createdAt: string;
  events: VisitorEvent[];
}

interface LocationLeaderboardItem {
  location: string;
  count: number;
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
  sessionsByLocation: LocationLeaderboardItem[];
  sessions: VisitorSession[];
}

export default function TrackerTab() {
  const { toast } = useToast();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rangeDays, setRangeDays] = useState(7);
  const [isPending, startTransition] = useTransition();

  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

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
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/tracker?days=${rangeDays}`);
        if (res.ok) {
          const json = await res.json();
          setData(prev => {
            if (!prev) return json;
            return {
              ...json,
              activeUsersCount: json.activeUsersCount,
              sessionsByLocation: json.sessionsByLocation,
              sessions: json.sessions,
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

  const toggleSessionExpand = (token: string) => {
    setExpandedSessions(prev => {
      const next = new Set(prev);
      if (next.has(token)) {
        next.delete(token);
      } else {
        next.add(token);
      }
      return next;
    });
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
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

          {/* User Geolocation Leaderboard & Collapsible Event Timelines */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* REAL-TIME ACTIVITY TIMELINE */}
            <div className="lg:col-span-2 panel">
              <h3 className="panel-title flex items-center gap-2 mb-6 text-slate-800 text-sm font-bold">
                <Activity size={16} className="text-blue-500" /> REAL-TIME ACTIVITY
              </h3>

              <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
                {data?.sessions.map((session, sIdx) => {
                  const isExpanded = expandedSessions.has(session.sessionToken);
                  const displayedEvents = isExpanded ? session.events : session.events.slice(-3);
                  const hiddenCount = session.events.length - displayedEvents.length;

                  return (
                    <div
                      key={session.sessionToken}
                      className="flex gap-4 border-l-2 border-indigo-100 pl-4 relative"
                    >
                      <span className="absolute -left-[6px] top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500 border border-white"></span>

                      <div className="flex-1 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-slate-850 text-sm flex items-center gap-1.5">
                              <MapPin size={13} className="text-slate-450" />
                              {session.city}, {session.country}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                              IP: {session.ipAddress || '—'} • ID:{' '}
                              {session.sessionToken.substring(5, 20)}
                            </p>
                          </div>

                          <span className="text-[10px] text-slate-400 font-medium">
                            {formatTime(session.updatedAt)}
                          </span>
                        </div>

                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 space-y-2">
                          {displayedEvents.map((evt, eIdx) => (
                            <div key={eIdx} className="flex justify-between text-xs text-slate-650">
                              <span className="font-medium">{evt.action}</span>
                              <span className="text-[10px] text-slate-400">
                                {formatTime(evt.timestamp)}
                              </span>
                            </div>
                          ))}

                          {session.events.length > 3 && (
                            <div className="pt-1.5 border-t border-slate-200/60 mt-1 flex justify-start">
                              <button
                                onClick={() => toggleSessionExpand(session.sessionToken)}
                                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 transition-colors"
                              >
                                {isExpanded ? `- Show less` : `+ ${hiddenCount} more events`}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {data?.sessions.length === 0 && (
                  <div className="text-center py-20 text-slate-400 text-xs font-medium">
                    No active sessions recorded yet.
                  </div>
                )}
              </div>
            </div>

            {/* SESSIONS BY LOCATION */}
            <div className="panel">
              <h3 className="panel-title flex items-center gap-2 mb-6 text-slate-800 text-sm font-bold">
                <Globe size={16} className="text-violet-500" /> SESSIONS BY LOCATION
              </h3>

              <div className="space-y-4">
                {data?.sessionsByLocation.map((item, idx) => {
                  const maxCount = data.sessionsByLocation[0]?.count || 1;
                  const percentage = (item.count / maxCount) * 100;
                  return (
                    <div key={item.location} className="space-y-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-750">
                          {idx + 1}. {item.location}
                        </span>
                        <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full text-[10px]">
                          {item.count}
                        </span>
                      </div>

                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}

                {data?.sessionsByLocation.length === 0 && (
                  <div className="text-center py-20 text-slate-400 text-xs">
                    No location metrics available.
                  </div>
                )}
              </div>
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
