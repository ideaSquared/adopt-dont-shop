import React from 'react';
import { Link } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import * as styles from './ModalBreadcrumbNav.css';

export type BreadcrumbSegment = {
  label: string;
  /** When provided and this is not the last segment, the segment renders as a Link to this path. */
  to?: string;
};

export type ModalBreadcrumbNavProps = {
  segments: ReadonlyArray<BreadcrumbSegment>;
  /** When provided alongside currentId and onNavigate, renders prev/next buttons. */
  siblingIds?: ReadonlyArray<string>;
  currentId?: string;
  onNavigate?: (siblingId: string) => void;
};

export const ModalBreadcrumbNav: React.FC<ModalBreadcrumbNavProps> = ({
  segments,
  siblingIds,
  currentId,
  onNavigate,
}) => {
  const hasNav =
    siblingIds !== undefined &&
    currentId !== undefined &&
    onNavigate !== undefined &&
    siblingIds.length > 1;

  const currentIndex = hasNav ? siblingIds.indexOf(currentId) : -1;
  const prevId = hasNav && currentIndex > 0 ? siblingIds[currentIndex - 1] : undefined;
  const nextId =
    hasNav && currentIndex >= 0 && currentIndex < siblingIds.length - 1
      ? siblingIds[currentIndex + 1]
      : undefined;

  const handlePrev = () => {
    if (prevId !== undefined && onNavigate) {
      onNavigate(prevId);
    }
  };

  const handleNext = () => {
    if (nextId !== undefined && onNavigate) {
      onNavigate(nextId);
    }
  };

  return (
    <div className={styles.wrapper}>
      <nav className={styles.breadcrumb} aria-label='Breadcrumb'>
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;
          const showLink = !isLast && segment.to !== undefined;
          return (
            <React.Fragment key={`${segment.label}-${index}`}>
              {showLink && segment.to !== undefined ? (
                <Link to={segment.to} className={styles.segmentLink}>
                  {segment.label}
                </Link>
              ) : (
                <span
                  className={isLast ? styles.segmentCurrent : styles.segmentLink}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {segment.label}
                </span>
              )}
              {!isLast && (
                <span className={styles.separator} aria-hidden='true'>
                  /
                </span>
              )}
            </React.Fragment>
          );
        })}
      </nav>

      {hasNav && (
        <div className={styles.navButtons}>
          <button
            type='button'
            className={styles.navButton}
            onClick={handlePrev}
            disabled={prevId === undefined}
            aria-label='Previous item'
          >
            <FiChevronLeft />
          </button>
          <button
            type='button'
            className={styles.navButton}
            onClick={handleNext}
            disabled={nextId === undefined}
            aria-label='Next item'
          >
            <FiChevronRight />
          </button>
        </div>
      )}
    </div>
  );
};
