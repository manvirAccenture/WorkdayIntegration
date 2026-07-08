import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { runsApi } from '../api/runs';
import type { IntegrationRunSummary } from '../api/runs';

const STATUS_FILTERS = ['All', 'Failed', 'Completed with Warnings', 'Completed', 'Processing'];

const RunsPage: React.FC = () => {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<IntegrationRunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('All');

  const fetchRuns = async (status?: string) => {
    setLoading(true);
    setError(null);
    try {
      const filters = status && status !== 'All' ? { status } : undefined;
      const data = await runsApi.list(filters);
      setRuns(data);
    } catch (err: any) {
      const backendError = err.response?.data?.error || err.message;
      const isNoRunsError = backendError?.includes('No integration runs') || backendError?.includes('SOAP Get_Integration_Events');
      if (isNoRunsError) {
        setRuns([]);
      } else {
        setError(backendError || 'Failed to load run events.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns(activeFilter);
  }, [activeFilter]);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Run Events</h1>
        <p className="page-subtitle">
          Track integration execution events pulled from Workday
        </p>
        <div className="page-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => fetchRuns(activeFilter)}>
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

        {/* Status Filter Tabs */}
        <div className="filter-tabs">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter}
              className={`filter-tab${activeFilter === filter ? ' active' : ''}`}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingSpinner text="Loading run events..." />
        ) : error ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
            <AlertTriangle size={32} style={{ color: 'var(--accent-rose)', marginBottom: '12px' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Failed to load run events: {error}</p>
          </div>
        ) : runs.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No Run Events Found"
            description={
              activeFilter !== 'All'
                ? `No events with status "${activeFilter}" found. Try a different filter.`
                : 'No integration run events have been recorded yet. Click refresh to query Workday.'
            }
          />
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
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr
                    key={run.id}
                    className="clickable-row"
                    onClick={() => navigate(`/runs/${run.id}`)}
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
                    <td
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-secondary)',
                        maxWidth: '300px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {run.integrationEvent}
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

export default RunsPage;
