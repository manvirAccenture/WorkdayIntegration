import React, { useState, useEffect } from 'react';
import { RotateCcw, Info, Settings2 } from 'lucide-react';
import Modal from './Modal';

interface LaunchParam {
  name: string;
  value: string;
}

interface RelaunchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (params: LaunchParam[]) => void;
  integrationName: string;
  launchParameters: LaunchParam[];
  isLoading: boolean;
}

const RelaunchDialog: React.FC<RelaunchDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  integrationName,
  launchParameters,
  isLoading,
}) => {
  const [editableParams, setEditableParams] = useState<LaunchParam[]>([]);

  // Reset editable params when the dialog opens with new data
  useEffect(() => {
    if (isOpen) {
      setEditableParams(
        launchParameters.map((p) => ({ name: p.name, value: p.value }))
      );
    }
  }, [isOpen, launchParameters]);

  const handleParamChange = (index: number, newValue: string) => {
    setEditableParams((prev) =>
      prev.map((p, i) => (i === index ? { ...p, value: newValue } : p))
    );
  };

  const handleSubmit = () => {
    onConfirm(editableParams);
  };

  const hasParams = editableParams.length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Relaunch Integration"
      footer={
        <>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className="btn btn-success btn-sm"
            onClick={handleSubmit}
            disabled={isLoading}
            style={{ minWidth: '120px' }}
          >
            <RotateCcw size={14} />
            {isLoading ? 'Relaunching...' : 'Relaunch'}
          </button>
        </>
      }
    >
      {/* Info banner */}
      <div className="relaunch-info-banner">
        <Info size={16} />
        <span>
          Relaunching <strong>{integrationName}</strong>.
          {hasParams
            ? ' Review and modify the launch parameters below before confirming.'
            : ' This integration will be relaunched with default settings.'}
        </span>
      </div>

      {hasParams ? (
        <div className="relaunch-params-list">
          {editableParams.map((param, index) => (
            <div key={param.name} className="relaunch-param-row">
              <label className="relaunch-param-label" htmlFor={`param-${index}`}>
                {param.name}
              </label>
              <input
                id={`param-${index}`}
                className="relaunch-param-input"
                type="text"
                value={param.value}
                onChange={(e) => handleParamChange(index, e.target.value)}
                placeholder={`Enter value for ${param.name}`}
                disabled={isLoading}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="relaunch-empty-params">
          <Settings2 size={32} />
          <p>No launch parameters found for this event.</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            The integration will be relaunched without parameters.
          </p>
        </div>
      )}
    </Modal>
  );
};

export default RelaunchDialog;
