import React from 'react';

const RescueSettings: React.FC = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Rescue Settings</h1>
        <p>Configure your rescue profile, adoption policies, and application questions.</p>
      </div>
      
      <div className="coming-soon">
        <h2>⚙️ Rescue Settings - Coming in Workstream 5</h2>
        <p>This section will include:</p>
        <ul>
          <li>Rescue profile management</li>
          <li>Custom application questions</li>
          <li>Adoption policy configuration</li>
          <li>Contact information and hours</li>
          <li>System preferences</li>
        </ul>
      </div>
    </div>
  );
};

export default RescueSettings;
