import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Radio,
  Activity,
  Clock,
  Settings,
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { integrationsApi } from '../api/integrations';
import type { Integration } from '../api/integrations';
import { runsApi } from '../api/runs';
import type { IntegrationRunSummary } from '../api/runs';

const IntegrationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [integration, setIntegration] = useState<Integration | null>(null);
  const [runs, setRuns] = useState<IntegrationRunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [intDetails, runHistory] = await Promise.all([
        integrationsApi.getById(id),
        runsApi.list({ integrationId: id }).catch((err) => {
          // If no runs are recorded in DB, return empty array
          const backendError = err.response?.data?.error || err.message;
          if (backendError?.includes('No integration runs')) {
            return [];
          }
          throw err;
        }),
      ]);
      setIntegration(intDetails);
      setRuns(runHistory);
    } catch (err: any) {
      const backendError = err.response?.data?.error || err.message;
      setError(backendError || 'Failed to load integration details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handlePollNow = async () => {
    if (!integration) return;
    setPolling(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await integrationsApi.pollNow(integration.id);
      setSuccess(`Polled "${integration.name}": ${result.pulledEventsCount} event(s) pulled successfully.`);
      // Refresh run history
      const updatedRuns = await runsApi.list({ integrationId: integration.id }).catch(() => []);
      setRuns(updatedRuns);
    } catch (err: any) {
      const backendError = err.response?.data?.error || err.message;
      setError(backendError || `Failed to poll integration "${integration.name}".`);
    } finally {
      setPolling(false);
    }
  };

  const handleToggleActive = async () => {
    if (!integration) return;
    try {
      const updated = await integrationsApi.update(integration.id, {
        isActive: !integration.isActive,
      });
      setIntegration(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to toggle integration.');
    }
  };

  const handleToggleAutoLaunch = async () => {
    if (!integration) return;
    try {
      const updated = await integrationsApi.update(integration.id, {
        autoLaunch: !integration.autoLaunch,
      });
      setIntegration(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to toggle auto-launch.');
    }
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (loading) return <LoadingSpinner text="Loading integration details..." />;

  if (error && !integration) {
    return (
      <div className="page-body">
        <div className="alert alert-error">
          <AlertTriangle size={16} />
          {error}
        </div>
        <Link to="/integrations" className="back-link">
          <ArrowLeft size={16} />
          Back to Integrations
        </Link>
      </div>
    );
  }

  if (!integration) return null;

  // Compute stats
  const totalRuns = runs.length;
  const failedRuns = runs.filter(
    (r) => r.status === 'Failed' || r.status === 'Completed_With_Errors'
  ).length;
  const completedRuns = runs.filter((r) => r.status === 'Completed').length;
  const successRate = totalRuns > 0 ? Math.round((completedRuns / totalRuns) * 100) : 100;

  return (
    <>
      <div className="page-header">
        <Link to="/integrations" className="back-link">
          <ArrowLeft size={16} />
          Back to Integrations
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <h1 className="page-title">{integration.name}</h1>
          <span className={`status-pill ${integration.isActive ? 'active' : 'inactive'}`} style={{
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.72rem',
            fontWeight: 600,
            background: integration.isActive ? 'var(--accent-emerald-dim)' : 'var(--bg-elevated)',
            color: integration.isActive ? 'var(--accent-emerald)' : 'var(--text-tertiary)',
            border: `1px solid ${integration.isActive ? 'var(--accent-emerald)' : 'var(--border-subtle)'}`
          }}>
            {integration.isActive ? 'ACTIVE' : 'INACTIVE'}
          </span>
        </div>
        <p className="page-subtitle">
          System ID: {integration.workdaySystemId}
        </p>
        <div className="page-actions">
          <button
            className="btn btn-primary btn-sm"
            onClick={handlePollNow}
            disabled={polling}
          >
            <Radio size={14} />
            {polling ? 'Polling...' : 'Poll Workday Now'}
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
        {success && (
          <div className="alert alert-success">
            <CheckCircle size={16} />
            {success}
          </div>
        )}

        {/* Configuration details and Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          
          {/* Metadata Card */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
              <Settings size={18} style={{ color: 'var(--accent-blue)' }} />
              <span style={{ fontWeight: 600 }}>System Configuration</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Category:</span>
              <span>{integration.category || 'Integrations'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Polling Interval:</span>
              <span>Every {integration.pollingInterval}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Active Monitoring:</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={integration.isActive}
                  onChange={handleToggleActive}
                />
                <span className="toggle-slider" />
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Auto-Relaunch on Fail:</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={integration.autoLaunch}
                  onChange={handleToggleAutoLaunch}
                />
                <span className="toggle-slider" />
              </label>
            </div>
            {integration.description && (
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
                {integration.description}
              </div>
            )}
          </div>

          {/* Stats Card */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
              <Activity size={18} style={{ color: 'var(--accent-cyan)' }} />
              <span style={{ fontWeight: 600 }}>Execution Summary</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total Event Runs:</span>
              <span style={{ fontWeight: 600 }}>{totalRuns}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Successful Runs:</span>
              <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>{completedRuns}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Failed Runs:</span>
              <span style={{ color: 'var(--accent-rose)', fontWeight: 600 }}>{failedRuns}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Success Rate:</span>
              <span style={{
                fontSize: '1.2rem',
                fontWeight: 700,
                color: successRate > 80 ? 'var(--accent-emerald)' : successRate > 50 ? 'var(--accent-amber)' : 'var(--accent-rose)'
              }}>
                {successRate}%
              </span>
            </div>
          </div>
        </div>

        {/* Runs History Section */}
        <div className="section-heading">
          <Clock size={18} />
          Event Run History
        </div>

        {runs.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No Run History"
            description="No events have been pulled for this integration system. Click 'Poll Workday Now' to check for runs."
          />
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event ID</th>
                  <th>Status</th>
                  <th>Run By</th>
                  <th>Started At</th>
                  <th>Completed At</th>
                  <th>Error Description</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr
                    key={run.id}
                    className="clickable-row"
                    onClick={() => navigate(`/runs/${run.id}`)}
                    title="Click to view full log details"
                  >
                    <td className="table-cell-mono">{run.id}</td>
                    <td>
                      <StatusBadge status={run.status} />
                    </td>
                    <td>{run.runBy || 'System'}</td>
                    <td>{formatTime(run.startedAt)}</td>
                    <td>{formatTime(run.completedAt)}</td>
                    <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--accent-rose)' }}>
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

export default IntegrationDetailPage;
