import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Activity,
  AlertTriangle,
  CheckCircle,
  BrainCircuit,
  RefreshCw,
} from 'lucide-react';
import StatsCard from '../components/StatsCard';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import { integrationsApi } from '../api/integrations';
import type { Integration } from '../api/integrations';
import { runsApi } from '../api/runs';
import type { IntegrationRunSummary } from '../api/runs';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [runs, setRuns] = useState<IntegrationRunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [intData, runData] = await Promise.all([
        integrationsApi.list(),
        runsApi.list(),
      ]);
      setIntegrations(intData);
      setRuns(runData);
    } catch (err: any) {
      console.error('[Dashboard] Fetch error:', err);
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalIntegrations = integrations.length;
  const activeIntegrations = integrations.filter((i) => i.isActive).length;
  const failedRuns = runs.filter(
    (r) => r.status === 'Failed' || r.status === 'Completed_With_Errors'
  ).length;
  const completedRuns = runs.filter((r) => r.status === 'Completed').length;

  const recentFailed = runs
    .filter((r) => r.status === 'Failed' || r.status === 'Completed_With_Errors')
    .slice(0, 5);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) return <LoadingSpinner text="Loading dashboard..." />;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          Workday Integration Monitoring Overview
        </p>
        <div className="page-actions">
          <button className="btn btn-ghost btn-sm" onClick={fetchData}>
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      <div className="page-body">
        {error && (
          <div className="alert alert-error">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {/* Stats Row */}
        <div className="stats-grid">
          <StatsCard
            icon={Layers}
            label="Total Integrations"
            value={totalIntegrations}
            color="blue"
          />
          <StatsCard
            icon={CheckCircle}
            label="Active Integrations"
            value={activeIntegrations}
            color="emerald"
          />
          <StatsCard
            icon={AlertTriangle}
            label="Failed / Errored Runs"
            value={failedRuns}
            color="rose"
          />
          <StatsCard
            icon={BrainCircuit}
            label="Completed Runs"
            value={completedRuns}
            color="cyan"
          />
        </div>

        {/* Recent Failed Runs */}
        <div className="section-heading">
          <Activity size={18} />
          Recent Failed Events
        </div>

        {recentFailed.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
            <CheckCircle size={32} style={{ color: 'var(--accent-emerald)', marginBottom: '12px' }} />
            <p style={{ color: 'var(--text-secondary)' }}>No failed events — all systems operational!</p>
          </div>
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event ID</th>
                  <th>Integration</th>
                  <th>Status</th>
                  <th>Run By</th>
                  <th>Started At</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {recentFailed.map((run) => (
                  <tr
                    key={run.id}
                    className="clickable-row"
                    onClick={() => navigate(`/runs/${run.id}`)}
                  >
                    <td className="table-cell-mono">{run.id}</td>
                    <td className="table-cell-name">
                      {run.integration?.name || 'Unknown'}
                    </td>
                    <td>
                      <StatusBadge status={run.status} />
                    </td>
                    <td>{run.runBy || '—'}</td>
                    <td>{formatTime(run.startedAt)}</td>
                    <td style={{ maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {run.errorMessage || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

export default DashboardPage;
