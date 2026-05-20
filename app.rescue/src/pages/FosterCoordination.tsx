import React, { useEffect, useState } from 'react';
import { fosterService, type FosterPlacement } from '../services/fosterService';
import { petService } from '../services/libraryServices';
import { staffService, type StaffMember } from '../services/staffService';
import type { Pet } from '@adopt-dont-shop/lib.pets';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { Modal, useConfirm, ConfirmDialog } from '@adopt-dont-shop/lib.components';
import * as styles from './FosterCoordination.css';

const FosterCoordination: React.FC = () => {
  const { user } = useAuth();
  const rescueId = user?.rescueId ?? null;
  const { confirm, confirmProps } = useConfirm();

  const [placements, setPlacements] = useState<FosterPlacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ petId: '', fosterUserId: '', startDate: '', notes: '' });
  const [endingId, setEndingId] = useState<string | null>(null);
  const [endForm, setEndForm] = useState<{
    outcome: 'return_to_rescue' | 'adopted_by_foster' | 'cancelled';
    notes: string;
  }>({
    outcome: 'return_to_rescue',
    notes: '',
  });

  const [pets, setPets] = useState<Pet[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fosterService.list(
        statusFilter === 'all' ? {} : { status: statusFilter }
      );
      setPlacements(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load placements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  // Load pickers once we know the rescue. The list endpoint returns up to
  // 20 pets per page; foster coordinators typically have a small handful of
  // active pets, so the first page is sufficient for the picker.
  useEffect(() => {
    if (!rescueId) {
      return;
    }
    petService
      .getPetsByRescue(rescueId)
      .then(res => setPets(res.data))
      .catch(() => setPets([]));
    staffService
      .getRescueStaff()
      .then(setStaff)
      .catch(() => setStaff([]));
  }, [rescueId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescueId) {
      setError('Your account is not associated with a rescue.');
      return;
    }
    try {
      await fosterService.create({
        petId: form.petId.trim(),
        fosterUserId: form.fosterUserId.trim(),
        rescueId,
        startDate: new Date(form.startDate).toISOString(),
        notes: form.notes.trim() || undefined,
      });
      setShowCreate(false);
      setForm({ petId: '', fosterUserId: '', startDate: '', notes: '' });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create placement');
    }
  };

  const handleEnd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!endingId) {
      return;
    }
    const confirmed = await confirm({
      title: 'End foster placement?',
      message:
        'The placement will be marked as ended and the pet status updated. This cannot be undone from this page.',
      confirmText: 'End placement',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) {
      return;
    }
    try {
      await fosterService.end(endingId, {
        outcome: endForm.outcome,
        notes: endForm.notes.trim() || undefined,
      });
      setEndingId(null);
      setEndForm({ outcome: 'return_to_rescue', notes: '' });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end placement');
    }
  };

  const petLabel = (id: string): string => {
    const match = pets.find(p => p.pet_id === id);
    return match ? `${match.name} (${match.breed ?? 'unknown breed'})` : id;
  };

  const staffLabel = (id: string): string => {
    const match = staff.find(s => s.userId === id);
    return match ? `${match.firstName} ${match.lastName} <${match.email}>` : id;
  };

  return (
    <div className={`page-container ${styles.pageContainer}`}>
      <div className={`page-header ${styles.pageHeader}`}>
        <div>
          <h1>Foster Coordination</h1>
          <p>Manage active and historical foster placements for your rescue.</p>
        </div>
        <button type="button" onClick={() => setShowCreate(true)}>
          New Placement
        </button>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.filterRow}>
        <label>
          Filter:{' '}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
          >
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="all">All</option>
          </select>
        </label>
      </div>

      {loading ? (
        <p>Loading placements…</p>
      ) : placements.length === 0 ? (
        <p>No foster placements found.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr className={styles.tableHeadRow}>
              <th className={styles.tableCell}>Pet</th>
              <th className={styles.tableCell}>Foster user</th>
              <th className={styles.tableCell}>Start</th>
              <th className={styles.tableCell}>End</th>
              <th className={styles.tableCell}>Status</th>
              <th className={styles.tableCell}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {placements.map(p => (
              <tr key={p.placementId} className={styles.tableBodyRow}>
                <td className={styles.tableCell}>{petLabel(p.petId)}</td>
                <td className={styles.tableCell}>{staffLabel(p.fosterUserId)}</td>
                <td className={styles.tableCell}>
                  {new Date(p.startDate).toLocaleDateString('en-GB')}
                </td>
                <td className={styles.tableCell}>
                  {p.endDate ? new Date(p.endDate).toLocaleDateString('en-GB') : '—'}
                </td>
                <td className={styles.tableCell}>{p.status}</td>
                <td className={styles.tableCell}>
                  {p.status === 'active' && (
                    <button type="button" onClick={() => setEndingId(p.placementId)}>
                      End placement
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Foster Placement">
        <form onSubmit={handleCreate} className={styles.modalForm}>
          <label>
            Pet
            <select
              value={form.petId}
              onChange={e => setForm({ ...form, petId: e.target.value })}
              required
            >
              <option value="">— Select a pet —</option>
              {pets.map(pet => (
                <option key={pet.pet_id} value={pet.pet_id}>
                  {pet.name} {pet.breed ? `(${pet.breed})` : ''}
                </option>
              ))}
            </select>
          </label>
          <label>
            Foster user
            <select
              value={form.fosterUserId}
              onChange={e => setForm({ ...form, fosterUserId: e.target.value })}
              required
            >
              <option value="">— Select a foster user —</option>
              {staff.map(s => (
                <option key={s.userId} value={s.userId}>
                  {s.firstName} {s.lastName} ({s.email})
                </option>
              ))}
            </select>
          </label>
          <label>
            Start date
            <input
              type="date"
              value={form.startDate}
              onChange={e => setForm({ ...form, startDate: e.target.value })}
              required
            />
          </label>
          <label>
            Notes
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
            />
          </label>
          <div className={styles.modalActions}>
            <button type="button" onClick={() => setShowCreate(false)}>
              Cancel
            </button>
            <button type="submit">Create</button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={endingId !== null}
        onClose={() => setEndingId(null)}
        title="End Foster Placement"
      >
        <form onSubmit={handleEnd} className={styles.modalForm}>
          <label>
            Outcome
            <select
              value={endForm.outcome}
              onChange={e =>
                setEndForm({ ...endForm, outcome: e.target.value as typeof endForm.outcome })
              }
            >
              <option value="return_to_rescue">Returned to rescue</option>
              <option value="adopted_by_foster">Adopted by foster</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <label>
            Notes
            <textarea
              value={endForm.notes}
              onChange={e => setEndForm({ ...endForm, notes: e.target.value })}
            />
          </label>
          <div className={styles.modalActions}>
            <button type="button" onClick={() => setEndingId(null)}>
              Cancel
            </button>
            <button type="submit">Confirm</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog {...confirmProps} />
    </div>
  );
};

export default FosterCoordination;
