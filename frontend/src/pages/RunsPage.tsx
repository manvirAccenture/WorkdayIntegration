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

const STATUS_FILTERS = ['All', 'Failed', 'Completed_With_Errors', 'Completed', 'Processing'];

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
      setError(err.message || 'Failed to load run events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns(activeFilter);
  }, [activeFilter]);

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
              {filter.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingSpinner text="Loading run events..." />
        ) : runs.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No Run Events Found"
            description={
              activeFilter !== 'All'
                ? `No events with status "${activeFilter.replace(/_/g, ' ')}" found. Try a different filter.`
                : 'No integration run events have been recorded yet. Poll an integration to start tracking.'
            }
          />
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
                  <th>Completed At</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
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
                    <td>{formatTime(run.completedAt)}</td>
                    <td
                      style={{
                        maxWidth: '260px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
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

export default RunsPage;
