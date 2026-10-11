import React from 'react';

import { useApplicationQuestions } from '../../../hooks/useApplicationQuestions';
import * as styles from '../ApplicationReview.css';
import { buildAnswerSections } from './answer-sections';

type ApplicationDetailsProps = {
  // The applicant's answers, keyed by question_key.
  answers: Record<string, unknown>;
  // The rescue whose questionnaire supplies each question's wording.
  rescueId?: string;
};

export const ApplicationDetails: React.FC<ApplicationDetailsProps> = ({ answers, rescueId }) => {
  const { data: questions = [], isLoading } = useApplicationQuestions(rescueId);

  if (isLoading) {
    return <p className={styles.fieldValue}>Loading answers…</p>;
  }

  // Without the questionnaire (failed to load) every answer still shows,
  // under a label made from its key.
  const sections = buildAnswerSections(answers, questions);
  if (sections.length === 0) {
    return <p className={styles.fieldValue}>No answers were submitted with this application.</p>;
  }

  return (
    <>
      {sections.map(section => (
        <section key={section.title} className={styles.section}>
          <h3 className={styles.sectionTitle}>{section.title}</h3>
          <dl className={styles.card}>
            {section.items.map(item => (
              <div key={item.key} className={styles.fieldVertical}>
                <dt className={styles.fieldLabel}>{item.label}</dt>
                <dd className={styles.fieldValueFullWidth}>{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </>
  );
};
