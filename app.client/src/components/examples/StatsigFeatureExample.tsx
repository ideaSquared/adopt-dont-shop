import React from 'react';
import styled from 'styled-components';
import { useStatsig } from '../../hooks/useStatsig';

const Container = styled.div`
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin: 20px 0;
`;

const FeatureBox = styled.div<{ $enabled: boolean }>`
  padding: 12px;
  margin: 8px 0;
  border-radius: 4px;
  background-color: ${props => (props.$enabled ? '#d4edda' : '#f8d7da')};
  border: 1px solid ${props => (props.$enabled ? '#c3e6cb' : '#f5c6cb')};
  color: ${props => (props.$enabled ? '#155724' : '#721c24')};
`;

const Button = styled.button`
  padding: 8px 16px;
  margin: 4px;
  border: none;
  border-radius: 4px;
  background-color: #007bff;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #0056b3;
  }
`;

const ConfigBox = styled.div`
  background-color: #f8f9fa;
  padding: 12px;
  border-radius: 4px;
  margin: 8px 0;
  font-family: monospace;
  font-size: 0.9em;
`;

/**
 * Example component demonstrating Statsig feature flags, experiments, and event logging.
 * This shows how to use the new Statsig-powered feature system.
 */
export const StatsigFeatureExample: React.FC = () => {
  const { checkGate, logEvent, getExperiment, getDynamicConfig } = useStatsig();

  // Example of getting experiment data
  const buttonExperiment = getExperiment('button_color_test');
  const buttonColor = buttonExperiment?.get('color', 'blue') || 'blue';

  // Example of getting dynamic config
  const appConfig = getDynamicConfig('app_settings');
  const maxFileSize = appConfig?.get('max_upload_size_mb', 10) || 10;

  const handleFeatureTest = (featureName: string) => {
    // Log feature usage for analytics
    logEvent('feature_tested', 1, {
      feature_name: featureName,
      component: 'StatsigFeatureExample',
    });
  };

  const handleExperimentTest = () => {
    logEvent('experiment_interaction', 1, {
      experiment: 'button_color_test',
      variant: buttonColor,
    });
  };

  return (
    <Container>
      <h3>Statsig Feature Flags Demo</h3>

      <div>
        <h4>Current Feature States:</h4>

        <FeatureBox $enabled={checkGate('pdf_viewer_enabled')}>
          <strong>PDF Viewer:</strong> {checkGate('pdf_viewer_enabled') ? 'Enabled' : 'Disabled'}
          <Button onClick={() => handleFeatureTest('pdf_viewer')}>Test PDF Feature</Button>
        </FeatureBox>

        <FeatureBox $enabled={checkGate('image_lightbox_enabled')}>
          <strong>Image Lightbox:</strong>{' '}
          {checkGate('image_lightbox_enabled') ? 'Enabled' : 'Disabled'}
          <Button onClick={() => handleFeatureTest('image_lightbox')}>Test Lightbox Feature</Button>
        </FeatureBox>

        <FeatureBox $enabled={checkGate('chat_attachments_enabled')}>
          <strong>Chat Attachments:</strong>{' '}
          {checkGate('chat_attachments_enabled') ? 'Enabled' : 'Disabled'}
          <Button onClick={() => handleFeatureTest('chat_attachments')}>
            Test Attachments Feature
          </Button>
        </FeatureBox>
      </div>

      <div>
        <h4>Experiment Example:</h4>
        <p>
          Button Color Experiment Result: <strong>{buttonColor}</strong>
        </p>
        <Button style={{ backgroundColor: buttonColor }} onClick={handleExperimentTest}>
          Experiment Button ({buttonColor})
        </Button>
      </div>

      <div>
        <h4>Dynamic Config Example:</h4>
        <ConfigBox>Max Upload Size: {maxFileSize}MB</ConfigBox>
      </div>

      <div>
        <h4>How to Use:</h4>
        <ol>
          <li>Go to your Statsig console</li>
          <li>
            Create feature gates: 'pdf_viewer_enabled', 'image_lightbox_enabled',
            'chat_attachments_enabled'
          </li>
          <li>Create experiment: 'button_color_test' with parameter 'color'</li>
          <li>Create dynamic config: 'app_settings' with parameter 'max_upload_size_mb'</li>
          <li>Toggle features remotely without code changes!</li>
        </ol>
      </div>
    </Container>
  );
};
