import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  RefreshCw,
  Radio,
  Layers,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import { integrationsApi } from '../api/integrations';
import type {
  Integration,
  CreateIntegrationPayload,
  UpdateIntegrationPayload,
} from '../api/integrations';

const POLLING_OPTIONS = ['10m', '30m', '1h', '1d'];

const IntegrationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [discovering, setDiscovering] = useState(false);

  // Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);

  // Form fields
  const [formData, setFormData] = useState<CreateIntegrationPayload>({
    workdaySystemId: '',
    name: '',
    description: '',
    category: '',
    pollingInterval: '10m',
    autoLaunch: false,
  });

  const fetchIntegrations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await integrationsApi.list();
      setIntegrations(data);
    } catch (err: any) {
      const backendError = err.response?.data?.error || err.message;
      setError(backendError || 'Failed to load integrations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const handleDiscover = async () => {
    setDiscovering(true);
    setError(null);
    setSuccess(null);
    try {
      const discovered = await integrationsApi.discover();
      setSuccess(`Discovered ${discovered.length} integration(s) from Workday.`);
      fetchIntegrations();
    } catch (err: any) {
      const backendError = err.response?.data?.error || err.message;
      setError(backendError || 'Failed to discover integrations from Workday.');
    } finally {
      setDiscovering(false);
    }
  };

  const handleCreate = async () => {
    setError(null);
    try {
      await integrationsApi.create(formData);
      setSuccess('Integration registered successfully.');
      setIsCreateOpen(false);
      setFormData({
        workdaySystemId: '',
        name: '',
        description: '',
        category: '',
        pollingInterval: '10m',
        autoLaunch: false,
      });
      fetchIntegrations();
    } catch (err: any) {
      const backendError = err.response?.data?.error || err.message;
      setError(backendError || 'Failed to create integration.');
    }
  };

  const handleUpdate = async () => {
    if (!editingIntegration) return;
    setError(null);
    try {
      const payload: UpdateIntegrationPayload = {
        name: editingIntegration.name,
        description: editingIntegration.description,
        category: editingIntegration.category,
        isActive: editingIntegration.isActive,
        autoLaunch: editingIntegration.autoLaunch,
        pollingInterval: editingIntegration.pollingInterval,
      };
      await integrationsApi.update(editingIntegration.id, payload);
      setSuccess('Integration updated successfully.');
      setIsEditOpen(false);
      setEditingIntegration(null);
      fetchIntegrations();
    } catch (err: any) {
      const backendError = err.response?.data?.error || err.message;
      setError(backendError || 'Failed to update integration.');
    }
  };

  const handlePollNow = async (id: string, name: string) => {
    setError(null);
    setSuccess(null);
    try {
      const result = await integrationsApi.pollNow(id);
      setSuccess(`Polled "${name}": ${result.pulledEventsCount} event(s) pulled.`);
    } catch (err: any) {
      const backendError = err.response?.data?.error || err.message;
      setError(backendError || `Failed to poll integration "${name}".`);
    }
  };

  const handleToggleActive = async (integration: Integration) => {
    try {
      await integrationsApi.update(integration.id, {
        isActive: !integration.isActive,
      });
      fetchIntegrations();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle integration.');
    }
  };

  const handleToggleAutoLaunch = async (integration: Integration) => {
    try {
      await integrationsApi.update(integration.id, {
        autoLaunch: !integration.autoLaunch,
      });
      fetchIntegrations();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle auto-launch.');
    }
  };

  const openEdit = (integration: Integration) => {
    setEditingIntegration({ ...integration });
    setIsEditOpen(true);
  };

  const filteredIntegrations = integrations.filter(
    (integ) =>
      integ.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      integ.workdaySystemId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <LoadingSpinner text="Loading integrations..." />;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Integrations</h1>
        <p className="page-subtitle">
          Manage registered Workday integration systems
        </p>
        <div className="page-actions">
          <button className="btn btn-primary btn-sm" onClick={() => setIsCreateOpen(true)}>
            <Plus size={14} />
            Register New
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleDiscover}
            disabled={discovering}
          >
            <Search size={14} />
            {discovering ? 'Discovering...' : 'Discover from Workday'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={fetchIntegrations}>
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
        {success && (
          <div className="alert alert-success">
            <CheckCircle size={16} />
            {success}
          </div>
        )}

        {integrations.length > 0 && (
          <div className="search-bar-container" style={{ marginBottom: '20px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              placeholder="Search integrations by name or System ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '38px', width: '100%' }}
            />
          </div>
        )}

        {integrations.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No Integrations Registered"
            description="Register an integration manually or discover them from your Workday tenant."
            action={
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-primary btn-sm" onClick={() => setIsCreateOpen(true)}>
                  <Plus size={14} /> Register
                </button>
                <button className="btn btn-ghost btn-sm" onClick={handleDiscover}>
                  <Search size={14} /> Discover
                </button>
              </div>
            }
          />
        ) : filteredIntegrations.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No Matching Integrations"
            description="Try searching with a different name or System ID."
          />
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>System ID</th>
                  <th>Category</th>
                  <th>Polling</th>
                  <th>Active</th>
                  <th>Auto-Launch</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredIntegrations.map((integ) => (
                  <tr
                    key={integ.id}
                    className="clickable-row"
                    onDoubleClick={() => navigate(`/integrations/${integ.id}`)}
                    title="Double-click to view integration details"
                  >
                    <td className="table-cell-name">{integ.name}</td>
                    <td className="table-cell-mono">{integ.workdaySystemId}</td>
                    <td>{integ.category || '—'}</td>
                    <td>{integ.pollingInterval}</td>
                    <td>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={integ.isActive}
                          onChange={() => handleToggleActive(integ)}
                        />
                        <span className="toggle-slider" />
                      </label>
                    </td>
                    <td>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={integ.autoLaunch}
                          onChange={() => handleToggleAutoLaunch(integ)}
                        />
                        <span className="toggle-slider" />
                      </label>
                    </td>
                    <td>
                      <div className="table-cell-actions">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => openEdit(integ)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handlePollNow(integ.id, integ.name)}
                        >
                          <Radio size={12} />
                          Poll Now
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Register New Integration"
        footer={
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleCreate}>
              Register
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Workday System ID *</label>
          <input
            className="form-input"
            placeholder="e.g. INT_SYS_REVENUE_SYNC"
            value={formData.workdaySystemId}
            onChange={(e) => setFormData({ ...formData, workdaySystemId: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Integration Name *</label>
          <input
            className="form-input"
            placeholder="e.g. Sync Shopify Revenue Log"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Category</label>
            <input
              className="form-input"
              placeholder="e.g. Finance, HCM"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Polling Interval</label>
            <select
              className="form-select"
              value={formData.pollingInterval}
              onChange={(e) => setFormData({ ...formData, pollingInterval: e.target.value })}
            >
              {POLLING_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            className="form-input"
            placeholder="Optional description..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>
      </Modal>

      {/* EDIT Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => { setIsEditOpen(false); setEditingIntegration(null); }}
        title="Edit Integration"
        footer={
          <>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setIsEditOpen(false); setEditingIntegration(null); }}
            >
              Cancel
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleUpdate}>
              Save Changes
            </button>
          </>
        }
      >
        {editingIntegration && (
          <>
            <div className="form-group">
              <label className="form-label">Integration Name</label>
              <input
                className="form-input"
                value={editingIntegration.name}
                onChange={(e) =>
                  setEditingIntegration({ ...editingIntegration, name: e.target.value })
                }
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Category</label>
                <input
                  className="form-input"
                  value={editingIntegration.category || ''}
                  onChange={(e) =>
                    setEditingIntegration({ ...editingIntegration, category: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">Polling Interval</label>
                <select
                  className="form-select"
                  value={editingIntegration.pollingInterval}
                  onChange={(e) =>
                    setEditingIntegration({ ...editingIntegration, pollingInterval: e.target.value })
                  }
                >
                  {POLLING_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-input"
                value={editingIntegration.description || ''}
                onChange={(e) =>
                  setEditingIntegration({ ...editingIntegration, description: e.target.value })
                }
              />
            </div>
          </>
        )}
      </Modal>
    </>
  );
};

export default IntegrationsPage;
