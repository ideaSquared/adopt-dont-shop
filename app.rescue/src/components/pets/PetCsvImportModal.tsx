import React, { useMemo, useRef, useState } from 'react';
import { Button, Modal, toast } from '@adopt-dont-shop/lib.components';
import {
  IMPORTABLE_FIELDS,
  type ColumnMapping,
  type ImportableField,
  type ParsedCsv,
  type ValidatedRow,
  autoMapColumns,
  parseCsv,
  petManagementService,
  validateMappedRow,
} from '@adopt-dont-shop/lib.pets';
import * as styles from './PetCsvImportModal.css';

// localStorage key for cross-import idempotency tracking. Keyed by
// rescueId so multiple staff members at the same browser don't
// cross-contaminate each other's imported IDs.
const importedIdsKey = (rescueId: string) => `ads.pets.csvImport.externalIds.${rescueId}`;

const loadImportedIds = (rescueId: string): Set<string> => {
  try {
    const raw = localStorage.getItem(importedIdsKey(rescueId));
    if (!raw) {
      return new Set();
    }
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
};

const persistImportedIds = (rescueId: string, ids: Set<string>): void => {
  try {
    localStorage.setItem(importedIdsKey(rescueId), JSON.stringify(Array.from(ids)));
  } catch {
    // Best-effort. If localStorage is unavailable, the user just loses
    // cross-session idempotency — they'll still get a duplicate warning
    // within a single session via the in-memory set.
  }
};

type Step = 'upload' | 'map' | 'preview' | 'importing' | 'done';

type ImportSummary = {
  imported: number;
  skippedDuplicates: number;
  failed: { rowIndex: number; reason: string }[];
};

type Props = {
  isOpen: boolean;
  rescueId: string;
  onClose: () => void;
  onImported: () => void;
};

const PetCsvImportModal: React.FC<Props> = ({ isOpen, rescueId, onClose, onImported }) => {
  const [step, setStep] = useState<Step>('upload');
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep('upload');
    setParsed(null);
    setMapping({});
    setSummary(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = async (file: File) => {
    const text = await file.text();
    const result = parseCsv(text);
    if (result.headers.length === 0 || result.rows.length === 0) {
      toast.error('CSV is empty or could not be parsed');
      return;
    }
    setParsed(result);
    setMapping(autoMapColumns(result.headers));
    setStep('map');
  };

  const validatedRows = useMemo<ValidatedRow[]>(() => {
    if (!parsed) {
      return [];
    }
    return parsed.rows.map((row, idx) =>
      // rowIndex is 1-based "data row" for human-friendly error messages.
      validateMappedRow(row, mapping, idx + 1, rescueId)
    );
  }, [parsed, mapping, rescueId]);

  const validCount = validatedRows.filter(r => r.ok).length;
  const invalidCount = validatedRows.length - validCount;

  const previouslyImportedIds = useMemo(
    () => (step === 'preview' ? loadImportedIds(rescueId) : new Set<string>()),
    [step, rescueId]
  );

  const duplicateRowIndexes = useMemo(() => {
    const ids = new Set<string>();
    const dupes = new Set<number>();
    for (const r of validatedRows) {
      if (!r.ok || !r.externalId) {
        continue;
      }
      if (previouslyImportedIds.has(r.externalId) || ids.has(r.externalId)) {
        dupes.add(r.rowIndex);
      } else {
        ids.add(r.externalId);
      }
    }
    return dupes;
  }, [validatedRows, previouslyImportedIds]);

  const requiredFieldsMapped = IMPORTABLE_FIELDS.filter(f => f.required).every(f => mapping[f.key]);

  const handleImport = async () => {
    if (!parsed) {
      return;
    }
    setStep('importing');

    const importedIds = loadImportedIds(rescueId);
    const result: ImportSummary = { imported: 0, skippedDuplicates: 0, failed: [] };

    for (const validated of validatedRows) {
      if (!validated.ok) {
        result.failed.push({
          rowIndex: validated.rowIndex,
          reason: validated.errors.join('; '),
        });
        continue;
      }
      if (validated.externalId && importedIds.has(validated.externalId)) {
        result.skippedDuplicates += 1;
        continue;
      }
      try {
        await petManagementService.createPet(validated.data);
        result.imported += 1;
        if (validated.externalId) {
          importedIds.add(validated.externalId);
        }
      } catch (err) {
        result.failed.push({
          rowIndex: validated.rowIndex,
          reason: err instanceof Error ? err.message : 'API error',
        });
      }
    }

    persistImportedIds(rescueId, importedIds);
    setSummary(result);
    setStep('done');
    if (result.imported > 0) {
      toast.success(`Imported ${result.imported} pet${result.imported === 1 ? '' : 's'}`);
      onImported();
    }
  };

  const stepLabel = (s: Step) => (
    <span className={step === s ? styles.stepActive : undefined}>
      {
        {
          upload: '1. Upload',
          map: '2. Map columns',
          preview: '3. Preview',
          importing: '4. Import',
          done: '4. Import',
        }[s]
      }
    </span>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import pets from CSV"
      size="xl"
      closeOnOverlayClick={false}
    >
      <div className={styles.stepContainer}>
        <div className={styles.stepHeader}>
          <div className={styles.steps}>
            {stepLabel('upload')} → {stepLabel('map')} → {stepLabel('preview')} →{' '}
            {stepLabel('done')}
          </div>
        </div>

        {step === 'upload' && (
          <>
            <div
              className={styles.dropZone}
              role="button"
              tabIndex={0}
              onClick={() => fileRef.current?.click()}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  fileRef.current?.click();
                }
              }}
            >
              <p>
                <strong>Click to upload a CSV</strong>
              </p>
              <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                First row must be column headers. Required columns:{' '}
                {IMPORTABLE_FIELDS.filter(f => f.required)
                  .map(f => f.label)
                  .join(', ')}
                .
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    void handleFile(file);
                  }
                }}
              />
            </div>
            <div className={styles.actionsRow}>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </>
        )}

        {step === 'map' && parsed && (
          <>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#374151' }}>
              We auto-matched columns by header name. Adjust any that look wrong, then continue to
              the preview step.
            </p>
            <div className={styles.mappingGrid}>
              {IMPORTABLE_FIELDS.map(field => (
                <React.Fragment key={field.key}>
                  <label className={styles.fieldLabel} htmlFor={`map-${field.key}`}>
                    {field.label}
                    {field.required && <span className={styles.requiredMark}>*</span>}
                  </label>
                  <select
                    id={`map-${field.key}`}
                    className={styles.select}
                    value={mapping[field.key] ?? ''}
                    onChange={e => {
                      const newMapping = { ...mapping };
                      if (e.target.value === '') {
                        delete newMapping[field.key as ImportableField];
                      } else {
                        newMapping[field.key as ImportableField] = e.target.value;
                      }
                      setMapping(newMapping);
                    }}
                  >
                    <option value="">— skip —</option>
                    {parsed.headers.map(h => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </React.Fragment>
              ))}
            </div>
            <div className={styles.actionsRow}>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button
                variant="primary"
                disabled={!requiredFieldsMapped}
                onClick={() => setStep('preview')}
              >
                Preview rows
              </Button>
            </div>
          </>
        )}

        {step === 'preview' && parsed && (
          <>
            <div className={styles.summary}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryNumber}>{validCount}</span>
                <span>Valid</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryNumber}>{invalidCount}</span>
                <span>Invalid</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryNumber}>{duplicateRowIndexes.size}</span>
                <span>Will skip as duplicates</span>
              </div>
            </div>
            {!mapping.externalId && (
              <div className={styles.warning}>
                No <strong>External ID</strong> column is mapped. Re-importing the same CSV later
                may create duplicate pets. Map an external ID column on the previous step to enable
                de-duplication across imports.
              </div>
            )}
            <div style={{ maxHeight: '320px', overflow: 'auto' }}>
              <table className={styles.previewTable}>
                <thead>
                  <tr>
                    <th className={styles.previewCell}>Row</th>
                    <th className={styles.previewCell}>Name</th>
                    <th className={styles.previewCell}>Type</th>
                    <th className={styles.previewCell}>Breed</th>
                    <th className={styles.previewCell}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {validatedRows.map(r => {
                    const isDup = duplicateRowIndexes.has(r.rowIndex);
                    const className = r.ok && !isDup ? styles.rowOk : styles.rowError;
                    const rawRow = parsed.rows[r.rowIndex - 1];
                    const cell = (field: ImportableField) =>
                      mapping[field] ? rawRow[mapping[field]!] : '';
                    return (
                      <tr key={r.rowIndex} className={className}>
                        <td className={styles.previewCell}>{r.rowIndex}</td>
                        <td className={styles.previewCell}>{cell('name')}</td>
                        <td className={styles.previewCell}>{cell('type')}</td>
                        <td className={styles.previewCell}>{cell('breed')}</td>
                        <td className={styles.previewCell}>
                          {r.ok && !isDup && <span>OK</span>}
                          {r.ok && isDup && <span>Duplicate — will skip</span>}
                          {!r.ok && (
                            <ul className={styles.errorList}>
                              {r.errors.map((e, i) => (
                                <li key={i}>{e}</li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className={styles.actionsRow}>
              <Button variant="outline" onClick={() => setStep('map')}>
                Back
              </Button>
              <Button variant="primary" disabled={validCount === 0} onClick={handleImport}>
                Import {validCount} valid row{validCount === 1 ? '' : 's'}
              </Button>
            </div>
          </>
        )}

        {step === 'importing' && (
          <p style={{ padding: '2rem', textAlign: 'center' }}>Importing pets…</p>
        )}

        {step === 'done' && summary && (
          <>
            <div className={styles.summary}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryNumber}>{summary.imported}</span>
                <span>Imported</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryNumber}>{summary.skippedDuplicates}</span>
                <span>Skipped (duplicate)</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryNumber}>{summary.failed.length}</span>
                <span>Failed</span>
              </div>
            </div>
            {summary.failed.length > 0 && (
              <div style={{ maxHeight: '240px', overflow: 'auto' }}>
                <table className={styles.previewTable}>
                  <thead>
                    <tr>
                      <th className={styles.previewCell}>Row</th>
                      <th className={styles.previewCell}>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.failed.map(f => (
                      <tr key={f.rowIndex} className={styles.rowError}>
                        <td className={styles.previewCell}>{f.rowIndex}</td>
                        <td className={styles.previewCell}>{f.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className={styles.actionsRow}>
              <Button variant="primary" onClick={handleClose}>
                Done
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default PetCsvImportModal;
