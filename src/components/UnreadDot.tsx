import React from 'react';

const UnreadDot: React.FC<{ show: boolean }> = ({ show }) => {
  if (!show) return null;
  return (
    <span style={{
      display: 'inline-block',
      width: '10px',
      height: '10px',
      borderRadius: '50%',
      backgroundColor: '#F067A6',
      marginLeft: '6px',
    }} />
  );
};

export default UnreadDot;