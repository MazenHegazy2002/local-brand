'use client';

import React, { useEffect, useRef, useState, useTransition } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { Activity, Clock, Compass, Globe, Layers, MapPin, RefreshCw, Zap } from 'lucide-react';

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Type definitions                                                           */
/* ──────────────────────────────────────────────────────────────────────────── */

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

interface ActiveUser {
  sessionToken: string;
  city: string;
  country: string;
  ipAddress: string | null;
  currentPath: string;
  updatedAt: string;
}

interface RecentVisit {
  id: string;
  path: string;
  eventType: string;
  city: string | null;
  country: string | null;
  referrer: string;
  ipAddress: string | null;
  loadTimeMs: number | null;
  durationSec: number;
  createdAt: string;
}

interface LocationItem {
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
  activeUsers: ActiveUser[];
  recentVisits: RecentVisit[];
  sessionsByLocation: LocationItem[];
  sessions: VisitorSession[];
}

const REFRESH_INTERVAL = 10; // seconds

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Component                                                                  */
/* ──────────────────────────────────────────────────────────────────────────── */

export default function TrackerTab() {
  const { toast } = useToast();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rangeDays, setRangeDays] = useState(7);
  const [isPending, startTransition] = useTransition();
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  /* Live countdown until next auto-refresh */
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  /* ── data fetching ─────────────────────────────────────────────────────── */

  const fetchData = async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await fetch(`/api/admin/tracker?days=${rangeDays}`);
      if (res.ok) {
        setData(await res.json());
        setLastUpdated(new Date());
      } else {
        if (showSpinner) toast({ variant: 'error', title: 'Failed to load analytics' });
      }
    } catch {
      /* swallow */
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  /* ── auto-refresh every REFRESH_INTERVAL seconds ─────────────────────── */

  useEffect(() => {
    fetchData(true);

    const interval = setInterval(() => {
      fetchData(false);
      setCountdown(REFRESH_INTERVAL);
    }, REFRESH_INTERVAL * 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeDays]);

  /* ── countdown ticker ────────────────────────────────────────────────── */

  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(REFRESH_INTERVAL);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? REFRESH_INTERVAL : prev - 1));
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [rangeDays, lastUpdated]);

  const handleRefresh = () => {
    startTransition(async () => {
      await fetchData(true);
      setCountdown(REFRESH_INTERVAL);
    });
  };

  /* ── helpers ─────────────────────────────────────────────────────────── */

  const getSpeedRating = (ms: number | null) => {
    if (!ms || ms <= 0) return { label: 'Unknown', color: 'bg-slate-400 text-white' };
    if (ms < 1000) return { label: 'Fast', color: 'bg-emerald-500 text-white' };
    if (ms < 3000) return { label: 'Moderate', color: 'bg-amber-500 text-white' };
    return { label: 'Slow', color: 'bg-rose-500 text-white' };
  };

  const fmtDuration = (sec: number) => {
    if (sec < 60) return `${sec}s`;
    return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  };

  const fmtTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const fmtDateTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return '';
    }
  };

  const toggleSession = (token: string) => {
    setExpandedSessions(prev => {
      const next = new Set(prev);
      next.has(token) ? next.delete(token) : next.add(token);
      return next;
    });
  };

  const eventBadge = (type: string) => {
    const map: Record<string, string> = {
      ADD_TO_CART: 'bg-blue-100 text-blue-700',
      CHECKOUT_STARTED: 'bg-amber-100 text-amber-700',
      PURCHASE: 'bg-emerald-100 text-emerald-700',
      PAGE_VIEW: 'bg-slate-100 text-slate-600',
    };
    return map[type] ?? 'bg-slate-100 text-slate-600';
  };

  /* ── render ──────────────────────────────────────────────────────────── */

  return (
    <div className="tracker-panel">
      {/* ── Header / Controls ─────────────────────────────────────────── */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="range-selector">
            {[1, 7, 30].map(d => (
              <button
                key={d}
                onClick={() => setRangeDays(d)}
                className={rangeDays === d ? 'active' : ''}
              >
                {d === 1 ? 'Today' : `${d} Days`}
              </button>
            ))}
          </div>
          <button
            onClick={handleRefresh}
            disabled={isPending}
            className="refresh-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600"
          >
            <RefreshCw size={13} className={isPending ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* live countdown */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
            Next refresh in{' '}
            <span className="font-bold text-slate-600 tabular-nums">{countdown}s</span>
            {lastUpdated && (
              <span className="ml-1 text-slate-300">
                · Updated{' '}
                {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          {/* active visitors badge */}
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
            {data?.activeUsersCount ?? 0} active now
          </div>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex h-64 items-center justify-center text-slate-400 text-sm font-medium">
          Loading metrics…
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── KPI cards ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card">
              <div className="card-header">
                <span className="card-subtitle">Total Pageviews</span>
                <Layers size={15} className="text-blue-500" />
              </div>
              <div className="card-value">{(data?.totalViews ?? 0).toLocaleString()}</div>
              <span className="card-foot">In selected range</span>
            </div>
            <div className="card">
              <div className="card-header">
                <span className="card-subtitle">Unique Sessions</span>
                <Compass size={15} className="text-violet-500" />
              </div>
              <div className="card-value">{(data?.uniqueSessions ?? 0).toLocaleString()}</div>
              <span className="card-foot">Distinct visitors</span>
            </div>
            <div className="card">
              <div className="card-header">
                <span className="card-subtitle">Avg Load Speed</span>
                <Zap size={15} className="text-amber-500" />
              </div>
              <div className="card-value">
                {data?.avgLoadTime ? `${(data.avgLoadTime / 1000).toFixed(2)}s` : '—'}
              </div>
              <span
                className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${getSpeedRating(data?.avgLoadTime ?? null).color}`}
              >
                {getSpeedRating(data?.avgLoadTime ?? null).label}
              </span>
            </div>
            <div className="card">
              <div className="card-header">
                <span className="card-subtitle">Avg Session Time</span>
                <Clock size={15} className="text-emerald-500" />
              </div>
              <div className="card-value">
                {data?.avgDuration ? fmtDuration(data.avgDuration) : '—'}
              </div>
              <span className="card-foot">Active engagement</span>
            </div>
          </div>

          {/* ── REAL-TIME ACTIVITY + SESSIONS BY LOCATION ─────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Real-time activity timeline */}
            <div className="lg:col-span-2 panel">
              <h3 className="panel-title">
                <Activity size={15} className="text-blue-500" /> REAL-TIME ACTIVITY
              </h3>
              <div className="space-y-5 max-h-[520px] overflow-y-auto pr-1 mt-4">
                {(data?.sessions ?? []).map(session => {
                  const isExpanded = expandedSessions.has(session.sessionToken);
                  const displayed = isExpanded ? session.events : session.events.slice(-3);
                  const hidden = session.events.length - displayed.length;
                  return (
                    <div
                      key={session.sessionToken}
                      className="border-l-2 border-indigo-100 pl-4 relative"
                    >
                      <span className="absolute -left-[6px] top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-white" />
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-slate-800 text-sm flex items-center gap-1">
                            <MapPin size={12} className="text-slate-400" />
                            {session.city}, {session.country}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            IP: {session.ipAddress ?? '—'} · ID:{' '}
                            {session.sessionToken.substring(5, 20)}
                          </p>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {fmtTime(session.updatedAt)}
                        </span>
                      </div>
                      <div className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100 space-y-1.5">
                        {displayed.map((evt, i) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span className="font-medium text-slate-700">{evt.action}</span>
                            <span className="text-[10px] text-slate-400">
                              {fmtTime(evt.timestamp)}
                            </span>
                          </div>
                        ))}
                        {session.events.length > 3 && (
                          <div className="pt-1 border-t border-slate-200/60">
                            <button
                              onClick={() => toggleSession(session.sessionToken)}
                              className="text-[10px] font-bold text-blue-600 hover:text-blue-800"
                            >
                              {isExpanded ? '− Show less' : `+ ${hidden} more events`}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {!data?.sessions?.length && (
                  <p className="text-center py-16 text-slate-400 text-xs">No sessions yet.</p>
                )}
              </div>
            </div>

            {/* Sessions by location leaderboard */}
            <div className="panel">
              <h3 className="panel-title">
                <Globe size={15} className="text-violet-500" /> SESSIONS BY LOCATION
              </h3>
              <div className="space-y-4 mt-4">
                {(data?.sessionsByLocation ?? []).map((item, idx) => {
                  const max = data?.sessionsByLocation[0]?.count ?? 1;
                  return (
                    <div key={item.location} className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-700">
                          {idx + 1}. {item.location}
                        </span>
                        <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full text-[10px]">
                          {item.count}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${(item.count / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {!data?.sessionsByLocation?.length && (
                  <p className="text-center py-16 text-slate-400 text-xs">No location data yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* ── OLD VIEWS ────────────────────────────────────────────────── */}

          {/* Top paths + Referrers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="panel">
              <h3 className="panel-title">
                <Compass size={15} className="text-blue-500" /> Top Landing Pages
              </h3>
              <div className="space-y-2.5 mt-4">
                {(data?.topPaths ?? []).map(p => (
                  <div key={p.path} className="flex justify-between items-center text-xs">
                    <span className="font-mono text-slate-600 bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5 max-w-[260px] truncate">
                      {p.path}
                    </span>
                    <span className="font-bold text-blue-700 bg-blue-50 rounded-full px-2 py-0.5 text-[10px]">
                      {p.count} hits
                    </span>
                  </div>
                ))}
                {!data?.topPaths?.length && (
                  <p className="text-center py-8 text-slate-400 text-xs">No pages logged yet.</p>
                )}
              </div>
            </div>

            <div className="panel">
              <h3 className="panel-title">
                <Globe size={15} className="text-violet-500" /> Entry Channels / Referrers
              </h3>
              <div className="space-y-2.5 mt-4">
                {(data?.topReferrers ?? []).map(r => (
                  <div key={r.name} className="flex justify-between items-center text-xs">
                    <span className="font-medium text-slate-600 flex items-center gap-1.5">
                      <Compass size={11} className="text-slate-300" />
                      {r.name}
                    </span>
                    <span className="font-bold text-violet-700 bg-violet-50 rounded-full px-2 py-0.5 text-[10px]">
                      {r.count}
                    </span>
                  </div>
                ))}
                {!data?.topReferrers?.length && (
                  <p className="text-center py-8 text-slate-400 text-xs">No referrers yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Active right now */}
          <div className="panel">
            <h3 className="panel-title">
              <Activity size={15} className="text-emerald-500" />
              Live Visitors (active ≤ 2 min ago)
              <span className="ml-auto text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
                {data?.activeUsersCount ?? 0} online
              </span>
            </h3>
            <div className="overflow-x-auto mt-4">
              <table className="tracker-table w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 pr-4">Location</th>
                    <th className="py-2.5 pr-4">Current Page</th>
                    <th className="py-2.5 pr-4">IP</th>
                    <th className="py-2.5">Last seen</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.activeUsers ?? []).map(u => (
                    <tr
                      key={u.sessionToken}
                      className="border-b border-slate-50 hover:bg-slate-50/50"
                    >
                      <td className="py-2.5 pr-4 font-semibold text-slate-700">
                        <span className="flex items-center gap-1">
                          <MapPin size={11} className="text-slate-400" />
                          {u.city}, {u.country}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-slate-600">{u.currentPath}</td>
                      <td className="py-2.5 pr-4 text-slate-400 font-mono text-[10px]">
                        {u.ipAddress ?? '—'}
                      </td>
                      <td className="py-2.5 font-semibold text-emerald-600 text-[11px]">
                        {fmtTime(u.updatedAt)}
                      </td>
                    </tr>
                  ))}
                  {!data?.activeUsers?.length && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        No visitors online in the last 2 minutes.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent visit log */}
          <div className="panel">
            <h3 className="panel-title">
              <Layers size={15} className="text-blue-400" /> Full Visit Log (last 50 entries)
            </h3>
            <div className="overflow-x-auto mt-4">
              <table className="tracker-table w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 pr-4">Time</th>
                    <th className="py-2.5 pr-4">Location</th>
                    <th className="py-2.5 pr-4">Path</th>
                    <th className="py-2.5 pr-4">Event</th>
                    <th className="py-2.5 pr-4">Referrer</th>
                    <th className="py-2.5 pr-4">Load</th>
                    <th className="py-2.5">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.recentVisits ?? []).map(v => {
                    const speed = getSpeedRating(v.loadTimeMs);
                    return (
                      <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-2.5 pr-4 text-slate-500 text-[10px] whitespace-nowrap">
                          {fmtDateTime(v.createdAt)}
                        </td>
                        <td className="py-2.5 pr-4 font-semibold text-slate-700 whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            <MapPin size={10} className="text-slate-400 shrink-0" />
                            {v.city ? `${v.city}, ${v.country}` : '—'}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 font-mono text-slate-600 max-w-[180px] truncate">
                          {v.path}
                        </td>
                        <td className="py-2.5 pr-4">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${eventBadge(v.eventType)}`}
                          >
                            {v.eventType.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-slate-400 max-w-[140px] truncate">
                          {v.referrer}
                        </td>
                        <td className="py-2.5 pr-4">
                          {v.loadTimeMs ? (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${speed.color}`}
                            >
                              {v.loadTimeMs}ms
                            </span>
                          ) : (
                            <span className="text-slate-300 text-[10px]">SSR</span>
                          )}
                        </td>
                        <td className="py-2.5 font-semibold text-slate-600">
                          {fmtDuration(v.durationSec)}
                        </td>
                      </tr>
                    );
                  })}
                  {!data?.recentVisits?.length && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No visit logs yet.
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
          background: #f1f5f9;
          border-radius: 8px;
          padding: 2px;
          border: 1px solid #e2e8f0;
        }
        .range-selector button {
          border: none;
          background: transparent;
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          padding: 5px 12px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .range-selector button.active {
          background: #fff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          color: #1e3a8a;
        }
        .card {
          background: #fff;
          border: 1px solid #f1f5f9;
          border-radius: 16px;
          padding: 18px;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03);
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .card-subtitle {
          font-size: 10px;
          color: #64748b;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
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
          margin-top: 5px;
        }
        .panel {
          background: #fff;
          border: 1px solid #f1f5f9;
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03);
        }
        .panel-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 800;
          color: #1e293b;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .tracker-table th {
          padding-bottom: 8px;
        }
        .refresh-btn {
          transition: background 0.15s;
        }
      `}</style>
    </div>
  );
}
