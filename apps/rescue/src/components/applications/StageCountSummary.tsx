import React from 'react';
import * as styles from './StageCountSummary.css';
import { countByStage } from '../../utils/applicationStageTransitions';
import { STAGE_CONFIG, type ApplicationStage } from '../../types/applicationStages';
import type { ApplicationListItem } from '../../types/applications';

/**
 * ADS-642: per-stage count summary above the applications queue so
 * rescue staff can see at a glance how many applications are sitting
 * in each stage (Pending: 5, Reviewing: 3, …) before they pick a
 * bulk action.
 */

const ORDER: ApplicationStage[] = ['PENDING', 'REVIEWING', 'VISITING', 'DECIDING', 'RESOLVED'];

type Props = {
  applications: ReadonlyArray<Pick<ApplicationListItem, 'stage'>>;
};

const StageCountSummary: React.FC<Props> = ({ applications }) => {
  const counts = countByStage(applications);

  return (
    <ul className={styles.container} aria-label="Applications per stage">
      {ORDER.map(stage => {
        const cfg = STAGE_CONFIG[stage];
        return (
          <li key={stage} className={styles.item}>
            <span aria-hidden="true">{cfg.emoji}</span>{' '}
            <span className={styles.label}>{cfg.label}:</span>{' '}
            <strong data-testid={`stage-count-${stage.toLowerCase()}`}>{counts[stage]}</strong>
          </li>
        );
      })}
    </ul>
  );
};

export default StageCountSummary;
