import React, { useEffect, useState } from 'react';
import {
  Settings,
  Save,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Shield,
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { workdayConfigApi } from '../api/workdayConfig';
import type {
  WorkdayConfigResponse,
  WorkdayConfigPayload,
} from '../api/workdayConfig';

const SettingsPage: React.FC = () => {
  const [config, setConfig] = useState<WorkdayConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form fields
  const [formData, setFormData] = useState<WorkdayConfigPayload>({
    tenantName: '',
    apiEndpoint: '',
    clientId: '',
    clientSecret: '',
    refreshToken: '',
  });

  const fetchConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await workdayConfigApi.getConfig();
      setConfig(data);
      setFormData({
        tenantName: data.tenantName || '',
        apiEndpoint: data.apiEndpoint || '',
        clientId: data.clientId || '',
        clientSecret: '',
        refreshToken: '',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await workdayConfigApi.saveConfig(formData);
      setSuccess(result.message);
      fetchConfig();
    } catch (err: any) {
      setError(err.message || 'Failed to save configuration.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading settings..." />;

  const isConfigured = config?.id && config.hasClientSecret && config.hasRefreshToken;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">
          Configure Workday API connection credentials
        </p>
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

        {/* Connection Status */}
        <div className="glass-card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <Shield size={20} style={{ color: 'var(--accent-blue)' }} />
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Connection Status</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              className={`connection-dot ${isConfigured ? 'connected' : 'disconnected'}`}
            />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {isConfigured
                ? `Connected to tenant "${config.tenantName}" at ${config.apiEndpoint}`
                : 'Not configured — enter your Workday credentials below'}
            </span>
          </div>
        </div>

        {/* Configuration Form */}
        <div className="glass-card">
          <div className="section-heading">
            <Settings size={18} />
            Workday API Credentials
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Tenant Name</label>
              <input
                className="form-input"
                placeholder="e.g. Dpt3"
                value={formData.tenantName}
                onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">API Endpoint</label>
              <input
                className="form-input"
                placeholder="e.g. https://wd3-impl-services1.workday.com"
                value={formData.apiEndpoint}
                onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Client ID</label>
            <input
              className="form-input"
              placeholder="Your Workday API Client ID"
              value={formData.clientId}
              onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Client Secret{' '}
              {config?.hasClientSecret && (
                <span style={{ color: 'var(--accent-emerald)', fontWeight: 400, fontSize: '0.7rem' }}>
                  (configured ✓)
                </span>
              )}
            </label>
            <input
              className="form-input"
              type="password"
              placeholder={
                config?.hasClientSecret
                  ? '••••••••••• (leave blank to keep existing)'
                  : 'Enter your Client Secret'
              }
              value={formData.clientSecret}
              onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Refresh Token{' '}
              {config?.hasRefreshToken && (
                <span style={{ color: 'var(--accent-emerald)', fontWeight: 400, fontSize: '0.7rem' }}>
                  (configured ✓)
                </span>
              )}
            </label>
            <input
              className="form-input"
              type="password"
              placeholder={
                config?.hasRefreshToken
                  ? '••••••••••• (leave blank to keep existing)'
                  : 'Enter your Refresh Token'
              }
              value={formData.refreshToken}
              onChange={(e) => setFormData({ ...formData, refreshToken: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
            <button className="btn btn-ghost" onClick={fetchConfig}>
              <RefreshCw size={16} />
              Reset
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsPage;
