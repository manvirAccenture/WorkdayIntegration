import React from 'react';

interface StatusBadgeProps {
  status: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const normalizedStatus = status.toLowerCase().replace(/ /g, '_');

  const getClassName = (): string => {
    switch (normalizedStatus) {
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      case 'completed_with_errors':
        return 'completed_with_errors';
      case 'processing':
        return 'processing';
      default:
        return 'processing';
    }
  };

  const getLabel = (): string => {
    switch (normalizedStatus) {
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'completed_with_errors':
        return 'With Errors';
      case 'processing':
        return 'Processing';
      default:
        return status;
    }
  };

  return (
    <span className={`status-badge ${getClassName()}`}>
      <span className="status-badge-dot" />
      {getLabel()}
    </span>
  );
};

export default StatusBadge;
