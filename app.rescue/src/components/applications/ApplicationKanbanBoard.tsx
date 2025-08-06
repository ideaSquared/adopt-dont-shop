import React, { useMemo } from 'react';
import styled from 'styled-components';
import { ApplicationListItem } from '../../types/applications';
import { ApplicationStage, STAGE_CONFIG, STAGE_ACTIONS } from '../../types/applicationStages';
import ApplicationStageCard from './ApplicationStageCard.tsx';

interface ApplicationKanbanBoardProps {
  applications: ApplicationListItem[];
  onApplicationSelect: (application: ApplicationListItem) => void;
  onStageAction: (applicationId: string, action: string, data?: any) => void;
  loading?: boolean;
}

const BoardContainer = styled.div`
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  padding: 1rem 0;
  min-height: 600px;
`;

const StageColumn = styled.div`
  flex: 1;
  min-width: 280px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
`;

const StageHeader = styled.div<{ stageColor: string }>`
  background: ${props => props.stageColor};
  color: white;
  padding: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const StageTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  .emoji {
    font-size: 1.2rem;
  }
  
  .label {
    font-size: 1rem;
  }
`;

const StageCount = styled.div`
  background: rgba(255, 255, 255, 0.2);
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.875rem;
`;

const StageBody = styled.div`
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 500px;
  overflow-y: auto;
`;

const EmptyState = styled.div`
  text-align: center;
  color: #64748b;
  padding: 2rem 1rem;
  font-style: italic;
`;

const LoadingState = styled.div`
  text-align: center;
  color: #64748b;
  padding: 2rem 1rem;
`;

const ApplicationKanbanBoard: React.FC<ApplicationKanbanBoardProps> = ({
  applications,
  onApplicationSelect,
  onStageAction,
  loading = false
}) => {
  // Group applications by stage
  const applicationsByStage = useMemo(() => {
    const grouped = applications.reduce((acc, app) => {
      const stage = app.stage || 'PENDING'; // Default to PENDING if no stage
      if (!acc[stage]) {
        acc[stage] = [];
      }
      acc[stage].push(app);
      return acc;
    }, {} as Record<ApplicationStage, ApplicationListItem[]>);

    // Ensure all stages are represented
    Object.keys(STAGE_CONFIG).forEach(stage => {
      if (!grouped[stage as ApplicationStage]) {
        grouped[stage as ApplicationStage] = [];
      }
    });

    return grouped;
  }, [applications]);

  // Calculate stage statistics
  const stageStats = useMemo(() => {
    return Object.entries(applicationsByStage).map(([stage, apps]) => ({
      stage: stage as ApplicationStage,
      count: apps.length,
      config: STAGE_CONFIG[stage as ApplicationStage]
    }));
  }, [applicationsByStage]);

  if (loading) {
    return (
      <BoardContainer>
        {stageStats.map(({ stage, config }) => (
          <StageColumn key={stage}>
            <StageHeader stageColor={config.color}>
              <StageTitle>
                <span className="emoji">{config.emoji}</span>
                <span className="label">{config.label}</span>
              </StageTitle>
              <StageCount>...</StageCount>
            </StageHeader>
            <StageBody>
              <LoadingState>Loading applications...</LoadingState>
            </StageBody>
          </StageColumn>
        ))}
      </BoardContainer>
    );
  }

  return (
    <BoardContainer>
      {stageStats.map(({ stage, count, config }) => (
        <StageColumn key={stage}>
          <StageHeader stageColor={config.color}>
            <StageTitle>
              <span className="emoji">{config.emoji}</span>
              <span className="label">{config.label}</span>
            </StageTitle>
            <StageCount>{count}</StageCount>
          </StageHeader>
          <StageBody>
            {applicationsByStage[stage].length === 0 ? (
              <EmptyState>
                No applications in this stage
              </EmptyState>
            ) : (
              applicationsByStage[stage].map(application => (
                <ApplicationStageCard
                  key={application.id}
                  application={application}
                  stage={stage}
                  availableActions={STAGE_ACTIONS[stage] || []}
                  onClick={() => onApplicationSelect(application)}
                  onAction={(action: string, data?: any) => onStageAction(application.id, action, data)}
                />
              ))
            )}
          </StageBody>
        </StageColumn>
      ))}
    </BoardContainer>
  );
};

export default ApplicationKanbanBoard;
