import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Activity,
  AlertTriangle,
  CheckCircle,
  BrainCircuit,
  RefreshCw,
  Play,
} from 'lucide-react';
import StatsCard from '../components/StatsCard';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import { integrationsApi } from '../api/integrations';
import type { Integration } from '../api/integrations';
import { runsApi } from '../api/runs';
import type { IntegrationRunSummary } from '../api/runs';
import Modal from '../components/Modal';

const INTERVALS = [
  { label: '10 Minutes', value: '10m' },
  { label: '1 Hour', value: '1h' },
  { label: '5 Hours', value: '5h' },
  { label: '1 Day', value: '1d' },
];

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [runs, setRuns] = useState<IntegrationRunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedInterval, setSelectedInterval] = useState('1d');
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const [isRelaunchOpen, setIsRelaunchOpen] = useState(false);
  const [relaunchRunId, setRelaunchRunId] = useState<string | null>(null);
  const [relaunchParams, setRelaunchParams] = useState<{ name: string; value: string }[]>([]);

  const fetchData = async (intervalVal: string = selectedInterval) => {
    setLoading(true);
    setError(null);
    try {
      const [intData, runData] = await Promise.all([
        integrationsApi.list().catch((err) => {
          console.warn('Failed to fetch integrations:', err);
          return [];
        }),
        runsApi.list({ interval: intervalVal }).catch((err) => {
          const backendError = err.response?.data?.error || err.message;
          if (backendError?.includes('No integration runs') || backendError?.includes('SOAP Get_Integration_Events')) {
            return [];
          }
          throw err;
        }),
      ]);
      setIntegrations(intData);
      setRuns(runData);
    } catch (err: any) {
      console.error('[Dashboard] Fetch error:', err);
      const backendError = err.response?.data?.error || err.message;
      setError(backendError || 'Failed to load dashboard data from Workday.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedInterval);
  }, [selectedInterval]);

  const handleIntervalChange = (value: string) => {
    setSelectedInterval(value);
  };

  const handleLaunch = async (e: React.MouseEvent, runId: string) => {
    e.stopPropagation(); // Prevent row click navigation
    setLaunchingId(runId);
    setError(null);
    setSuccess(null);
    try {
      // 1. Fetch details of this run to see if there are launch parameters
      const runDetails = await runsApi.getById(runId);
      const params = runDetails.launchParameters || [];

      if (params.length > 0) {
        // 2. Open the relaunch modal to review/edit parameters
        setRelaunchRunId(runId);
        setRelaunchParams(params.map(p => ({ ...p }))); // clone
        setIsRelaunchOpen(true);
        setLaunchingId(null);
      } else {
        // 3. No parameters, launch directly
        const res = await runsApi.relaunch(runId);
        setSuccess(`Successfully launched integration. New Event ID: ${res.launchedEventId}`);
        setTimeout(() => {
          fetchData();
        }, 1500);
        setLaunchingId(null);
      }
    } catch (err: any) {
      console.error('[Relaunch] Fetch error:', err);
      const backendError = err.response?.data?.error || err.message;
      setError(backendError || `Failed to trigger launch for event ${runId}.`);
      setLaunchingId(null);
    }
  };

  const handleConfirmRelaunch = async () => {
    if (!relaunchRunId) return;
    setIsRelaunchOpen(false);
    setLaunchingId(relaunchRunId);
    setError(null);
    setSuccess(null);
    try {
      const res = await runsApi.relaunch(relaunchRunId, relaunchParams);
      setSuccess(`Successfully launched integration. New Event ID: ${res.launchedEventId}`);
      setTimeout(() => {
        fetchData();
      }, 1500);
    } catch (err: any) {
      const backendError = err.response?.data?.error || err.message;
      setError(backendError || `Failed to relaunch integration.`);
    } finally {
      setLaunchingId(null);
      setRelaunchRunId(null);
      setRelaunchParams([]);
    }
  };

  const totalIntegrations = integrations.length;
  const activeIntegrations = integrations.filter((i) => i.isActive).length;
  const failedRuns = runs.filter(
    (r) => r.status === 'Failed' || r.status === 'Completed with Warnings'
  ).length;
  const completedRuns = runs.filter((r) => r.status === 'Completed').length;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Real-Time Dashboard</h1>
        <p className="page-subtitle">
          Direct Workday Integration Monitoring & Custom Report Data
        </p>
        <div className="page-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Polling Interval Selectors */}
          <div className="interval-buttons" style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px' }}>
            {INTERVALS.map((int) => (
              <button
                key={int.value}
                onClick={() => handleIntervalChange(int.value)}
                className="btn"
                style={{
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: selectedInterval === int.value ? 'var(--accent-blue)' : 'transparent',
                  color: selectedInterval === int.value ? '#ffffff' : 'var(--text-secondary)',
                  transition: 'all 0.2s ease',
                  fontWeight: selectedInterval === int.value ? 600 : 400,
                }}
              >
                {int.label}
              </button>
            ))}
          </div>

          <button className="btn btn-ghost btn-sm" onClick={() => fetchData()}>
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      <div className="page-body">
        {error && (
          <div className="alert alert-error" style={{ marginBottom: '16px' }}>
            <AlertTriangle size={16} />
            {error}
          </div>
        )}
        {success && (
          <div className="alert alert-success" style={{ marginBottom: '16px' }}>
            <CheckCircle size={16} />
            {success}
          </div>
        )}

        {/* Stats Row */}
        <div className="stats-grid" style={{ marginBottom: '24px' }}>
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
            label="Failed / Warning Runs"
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

        {/* Real-time Custom Report */}
        <div className="section-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} />
            Real-Time Integration Event Report ({INTERVALS.find(i => i.value === selectedInterval)?.label})
          </div>
        </div>

        {loading ? (
          <LoadingSpinner text="Fetching real-time data from Workday..." />
        ) : error ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
            <AlertTriangle size={32} style={{ color: 'var(--accent-rose)', marginBottom: '12px' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Failed to load integration runs: {error}</p>
          </div>
        ) : runs.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
            <CheckCircle size={32} style={{ color: 'var(--accent-emerald)', marginBottom: '12px' }} />
            <p style={{ color: 'var(--text-secondary)' }}>No runs found in this interval — systems idle or no events logged.</p>
          </div>
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Integration System</th>
                  <th>Event ID</th>
                  <th>Status</th>
                  <th>Actual Completed Date & Time</th>
                  <th>Ran As System User</th>
                  <th>Errors & Warnings</th>
                  <th>Integration Event</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr
                    key={run.id}
                    className="clickable-row"
                    onClick={() => navigate(`/runs/${run.id}`)}
                    title="Click to view run details & AI analysis"
                  >
                    <td className="table-cell-name" style={{ fontWeight: 600 }}>
                      {run.integration?.name || '—'}
                    </td>
                    <td className="table-cell-mono">{run.id}</td>
                    <td>
                      <StatusBadge status={run.status} />
                    </td>
                    <td>{run.completedAtFormatted || '—'}</td>
                    <td>{run.runBy || 'System'}</td>
                    <td style={{ color: 'var(--accent-rose)', fontWeight: 500 }}>
                      {run.errorsWarnings || '—'}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {run.integrationEvent}
                    </td>
                    <td>
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={launchingId === run.id}
                        onClick={(e) => handleLaunch(e, run.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '0.75rem' }}
                      >
                        <Play size={12} fill="currentColor" />
                        {launchingId === run.id ? 'Launching...' : 'Launch'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Relaunch Parameters Modal */}
      <Modal
        isOpen={isRelaunchOpen}
        onClose={() => { setIsRelaunchOpen(false); setRelaunchRunId(null); }}
        title="Review Launch Parameters"
        footer={
          <>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setIsRelaunchOpen(false); setRelaunchRunId(null); }}
            >
              Cancel
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleConfirmRelaunch}>
              Confirm Launch
            </button>
          </>
        }
      >
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          This integration requires parameters to run. Please review and modify the parameter values below before launching.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {relaunchParams.map((param, index) => (
            <div className="form-group" key={param.name} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>{param.name}</label>
              <input
                className="form-input"
                value={param.value}
                onChange={(e) => {
                  const updated = [...relaunchParams];
                  updated[index] = { ...updated[index], value: e.target.value };
                  setRelaunchParams(updated);
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}
              />
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
};

export default DashboardPage;
