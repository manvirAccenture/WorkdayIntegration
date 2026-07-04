import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  BrainCircuit,
  RotateCcw,
  FileText,
  Clock,
  User,
  Hash,
  Layers,
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import { runsApi } from '../api/runs';
import type { IntegrationRunDetail } from '../api/runs';

const RunDetailPage: React.FC = () => {
  const { runId } = useParams<{ runId: string }>();
  const [run, setRun] = useState<IntegrationRunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [relaunchLoading, setRelaunchLoading] = useState(false);
  const [relaunchMessage, setRelaunchMessage] = useState<string | null>(null);

  const fetchRun = async () => {
    if (!runId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await runsApi.getById(runId);
      setRun(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load run details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRun();
  }, [runId]);

  const handleRelaunch = async () => {
    if (!runId) return;
    setRelaunchLoading(true);
    setRelaunchMessage(null);
    try {
      const result = await runsApi.relaunch(runId);
      setRelaunchMessage(`✓ ${result.message} (New Event: ${result.launchedEventId})`);
    } catch (err: any) {
      setRelaunchMessage(`✗ Relaunch failed: ${err.message}`);
    } finally {
      setRelaunchLoading(false);
    }
  };

  const formatTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const renderLogLine = (line: string, index: number) => {
    let className = '';
    if (line.includes('[ERROR]')) className = 'log-line-error';
    else if (line.includes('[WARN]')) className = 'log-line-warn';
    else if (line.includes('[INFO]')) className = 'log-line-info';
    else if (line.includes('[DEBUG]')) className = 'log-line-debug';

    return (
      <span key={index} className={className}>
        {line}
        {'\n'}
      </span>
    );
  };

  if (loading) return <LoadingSpinner text="Loading run details..." />;

  if (error) {
    return (
      <div className="page-body">
        <div className="alert alert-error">
          <AlertTriangle size={16} />
          {error}
        </div>
        <Link to="/runs" className="back-link">
          <ArrowLeft size={16} />
          Back to Run Events
        </Link>
      </div>
    );
  }

  if (!run) return null;

  const isFailed = run.status === 'Failed' || run.status === 'Completed_With_Errors';

  return (
    <>
      <div className="page-header">
        <Link to="/runs" className="back-link">
          <ArrowLeft size={16} />
          Back to Run Events
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <h1 className="page-title">Event Details</h1>
          <StatusBadge status={run.status} />
        </div>
        <p className="page-subtitle">
          {run.integration?.name || 'Unknown Integration'} — Event {run.id}
        </p>
        {isFailed && (
          <div className="page-actions">
            <button
              className="btn btn-success btn-sm"
              onClick={handleRelaunch}
              disabled={relaunchLoading}
            >
              <RotateCcw size={14} />
              {relaunchLoading ? 'Relaunching...' : 'Relaunch Integration'}
            </button>
          </div>
        )}
      </div>

      <div className="page-body">
        {/* Relaunch feedback */}
        {relaunchMessage && (
          <div
            className={`alert ${relaunchMessage.startsWith('✓') ? 'alert-success' : 'alert-error'}`}
          >
            {relaunchMessage.startsWith('✓') ? (
              <CheckCircle size={16} />
            ) : (
              <AlertTriangle size={16} />
            )}
            {relaunchMessage}
          </div>
        )}

        {/* Metadata Grid */}
        <div className="detail-grid">
          <div className="detail-item">
            <div className="detail-item-label">
              <Hash size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
              Event ID
            </div>
            <div className="detail-item-value" style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>
              {run.id}
            </div>
          </div>
          <div className="detail-item">
            <div className="detail-item-label">
              <Layers size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
              Integration
            </div>
            <div className="detail-item-value">{run.integration?.name || 'Unknown'}</div>
          </div>
          <div className="detail-item">
            <div className="detail-item-label">
              <User size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
              Run By
            </div>
            <div className="detail-item-value">{run.runBy || '—'}</div>
          </div>
          <div className="detail-item">
            <div className="detail-item-label">
              <Clock size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
              Started At
            </div>
            <div className="detail-item-value">{formatTime(run.startedAt)}</div>
          </div>
          <div className="detail-item">
            <div className="detail-item-label">
              <Clock size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
              Completed At
            </div>
            <div className="detail-item-value">{formatTime(run.completedAt)}</div>
          </div>
          {run.errorMessage && (
            <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
              <div className="detail-item-label">
                <AlertTriangle size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle', color: 'var(--accent-rose)' }} />
                Error Message
              </div>
              <div className="detail-item-value" style={{ color: 'var(--accent-rose)' }}>
                {run.errorMessage}
              </div>
            </div>
          )}
        </div>

        {/* Execution Logs */}
        {run.logs && (
          <>
            <div className="section-heading">
              <FileText size={18} />
              Execution Logs
            </div>
            <div className="log-viewer">
              {run.logs.split('\n').map((line, i) => renderLogLine(line, i))}
            </div>
            <div style={{ height: '28px' }} />
          </>
        )}

        {/* AI Analysis */}
        {run.aiAnalysis && (
          <>
            <div className="ai-card">
              <div className="ai-card-header">
                <BrainCircuit size={22} />
                <span className="ai-card-title">AI Troubleshooting Analysis</span>
              </div>

              <div className="ai-section">
                <div className="ai-section-label">Detected Root Cause</div>
                <div className="ai-section-content">
                  {run.aiAnalysis.detectedRootCause}
                </div>
              </div>

              <div className="ai-section">
                <div className="ai-section-label">Suggested Fix</div>
                <div className="ai-section-content">
                  <ReactMarkdown>{run.aiAnalysis.suggestedFix}</ReactMarkdown>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                <span
                  style={{
                    fontSize: '0.78rem',
                    color: run.aiAnalysis.applied ? 'var(--accent-emerald)' : 'var(--text-tertiary)',
                  }}
                >
                  {run.aiAnalysis.applied ? '✓ Fix Applied' : '○ Not Applied'}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default RunDetailPage;
