import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import { fosterService, type FosterPlacement } from '../services/fosterService';
import { petService } from '../services/libraryServices';
import { useStaff } from '../hooks/useStaff';
import type { Pet } from '@adopt-dont-shop/lib.pets';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { staffService } from '../services/staffService';
import {
  Alert,
  Button,
  FormField,
  Input,
  Modal,
  PageHeader,
  TextArea,
  useConfirm,
  ConfirmDialog,
  SkeletonCard,
  DataTable,
  ErrorState,
  type DataTableColumn,
} from '@adopt-dont-shop/lib.components';
import { formatDate } from '@adopt-dont-shop/lib.utils';
import * as styles from './FosterCoordination.css';

const NO_PLACEMENTS: FosterPlacement[] = [];
const NO_PETS: Pet[] = [];
// Fetch every page the API reports, at the gateway's maximum page size, in small batches so a
// large rescue does not fire dozens of parallel requests. The cap is a safety net (10,000 pets).
const PET_PAGE_SIZE = 100;
const MAX_PET_PAGES = 100;
const PET_PAGE_BATCH_SIZE = 5;

// Errors propagate so the query exposes a failed state instead of an empty list.
const loadAllPets = async (rescueId: string): Promise<Pet[]> => {
  const first = await petService.getPetsByRescue(rescueId, 1, PET_PAGE_SIZE);
  const lastPage = Math.min(first.pagination.totalPages, MAX_PET_PAGES);
  const remainingPages = Array.from({ length: Math.max(lastPage - 1, 0) }, (_, i) => i + 2);
  const batches = Array.from(
    { length: Math.ceil(remainingPages.length / PET_PAGE_BATCH_SIZE) },
    (_, i) => remainingPages.slice(i * PET_PAGE_BATCH_SIZE, (i + 1) * PET_PAGE_BATCH_SIZE)
  );
  const loaded = await batches.reduce<Promise<Pet[]>>(async (acc, batch) => {
    const soFar = await acc;
    const pages = await Promise.all(
      batch.map(page => petService.getPetsByRescue(rescueId, page, PET_PAGE_SIZE))
    );
    return [...soFar, ...pages.flatMap(page => page.data)];
  }, Promise.resolve(first.data));
  return loaded;
};

const FosterCoordination: React.FC = () => {
  const { user } = useAuth();
  // GET /auth/me does not return the rescue id; it comes from the staff membership.
  const rescueQuery = useQuery({
    queryKey: ['foster', 'rescue-id', user?.userId],
    queryFn: () => staffService.getMyRescueId(),
    enabled: Boolean(user?.userId),
  });
  const rescueId = rescueQuery.data ?? null;
  const queryClient = useQueryClient();
  const { confirm, confirmProps } = useConfirm();
  // ADS-644: cross-linking. When deep-linked from a pet card we scope the
  // placement list to that pet so the user lands on the relevant placement.
  const [searchParams] = useSearchParams();
  const petIdFilter = searchParams.get('petId');

  const [actionError, setActionError] = useState<string | null>(null);
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
  const [petSearch, setPetSearch] = useState('');

  const placementsQuery = useQuery({
    queryKey: ['foster', 'placements', statusFilter],
    queryFn: () => fosterService.list(statusFilter === 'all' ? {} : { status: statusFilter }),
    staleTime: 0,
  });
  const placements = placementsQuery.data ?? NO_PLACEMENTS;
  const loading = placementsQuery.isLoading;
  const queryError = placementsQuery.error
    ? placementsQuery.error instanceof Error
      ? placementsQuery.error.message
      : 'Failed to load placements'
    : null;
  const error = actionError ?? queryError;

  // Pickers load once we know the rescue.
  const petsQuery = useQuery({
    queryKey: ['foster', 'pets', rescueId],
    queryFn: () => loadAllPets(rescueId ?? ''),
    enabled: rescueId !== null,
  });
  const pets = petsQuery.data ?? NO_PETS;
  const petsLoadError = petsQuery.isError
    ? petsQuery.error instanceof Error
      ? petsQuery.error.message
      : 'Please try again.'
    : null;
  const retryPets = () => {
    petsQuery.refetch();
  };
  const { staff } = useStaff();

  const invalidatePlacements = () =>
    queryClient.invalidateQueries({ queryKey: ['foster', 'placements'] });
  const createMutation = useMutation({
    mutationFn: (payload: Parameters<typeof fosterService.create>[0]) =>
      fosterService.create(payload),
    onSuccess: invalidatePlacements,
    // Failures show in the page's own error banner.
    onError: () => undefined,
  });
  const endMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof fosterService.end>[1];
    }) => fosterService.end(id, payload),
    onSuccess: invalidatePlacements,
    onError: () => undefined,
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescueId) {
      setActionError('Your account is not associated with a rescue.');
      return;
    }
    try {
      setActionError(null);
      await createMutation.mutateAsync({
        petId: form.petId.trim(),
        fosterUserId: form.fosterUserId.trim(),
        rescueId,
        startDate: new Date(form.startDate).toISOString(),
        notes: form.notes.trim() || undefined,
      });
      setShowCreate(false);
      setForm({ petId: '', fosterUserId: '', startDate: '', notes: '' });
      setPetSearch('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to create placement');
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
      setActionError(null);
      await endMutation.mutateAsync({
        id: endingId,
        payload: { outcome: endForm.outcome, notes: endForm.notes.trim() || undefined },
      });
      setEndingId(null);
      setEndForm({ outcome: 'return_to_rescue', notes: '' });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to end placement');
    }
  };

  const petLabel = (id: string): string => {
    const match = pets.find(p => p.pet_id === id);
    return match ? `${match.name} (${match.breed ?? 'unknown breed'})` : id;
  };

  // ADS-644: scope the visible placements to a single pet when the page is
  // opened via /foster?petId=... from a pet card or application detail.
  const visiblePlacements = useMemo(
    () => (petIdFilter ? placements.filter(p => p.petId === petIdFilter) : placements),
    [placements, petIdFilter]
  );

  const filteredPets = useMemo(() => {
    if (!petSearch.trim()) {
      return pets;
    }
    const q = petSearch.toLowerCase();
    return pets.filter(
      p => p.name?.toLowerCase().includes(q) || p.breed?.toLowerCase().includes(q)
    );
  }, [pets, petSearch]);

  const staffLabel = (id: string): string => {
    const match = staff.find(s => s.userId === id);
    return match ? `${match.firstName} ${match.lastName} <${match.email}>` : id;
  };

  const placementColumns: DataTableColumn[] = [
    { key: 'pet', label: 'Pet' },
    { key: 'foster', label: 'Foster user' },
    { key: 'start', label: 'Start' },
    { key: 'end', label: 'End' },
    { key: 'status', label: 'Status' },
    {
      // ADS-644: cross-links so a placement row points at the pet card and
      // the active applications for that pet.
      key: 'links',
      label: 'Links',
      sortable: false,
      render: (_value, row) => (
        <>
          <Link to={`/pets/${String(row.petId)}`}>View pet</Link>
          {' · '}
          <Link to={`/applications?petId=${String(row.petId)}`}>Applications</Link>
        </>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_value, row) =>
        row.status === 'active' ? (
          <Button variant="outline" size="sm" onClick={() => setEndingId(String(row.placementId))}>
            End placement
          </Button>
        ) : null,
    },
  ];

  const placementRows = visiblePlacements.map(p => ({
    pet: petLabel(p.petId),
    foster: staffLabel(p.fosterUserId),
    start: formatDate(p.startDate),
    end: p.endDate ? formatDate(p.endDate) : '—',
    status: p.status,
    petId: p.petId,
    placementId: p.placementId,
  }));

  return (
    <div className={styles.pageContainer}>
      <PageHeader
        title="Foster Coordination"
        description="Manage active and historical foster placements for your rescue."
        actions={<Button onClick={() => setShowCreate(true)}>New Placement</Button>}
      />

      {error && <Alert variant="error">{error}</Alert>}
      {petsLoadError && !showCreate && (
        <ErrorState
          size="sm"
          title="Unable to load pets"
          message={`Pet names may show as ids until this is resolved. ${petsLoadError}`}
          onRetry={retryPets}
        />
      )}

      <div className={styles.filterRow}>
        <FormField label="Filter:" htmlFor="foster-status-filter">
          <select
            id="foster-status-filter"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
          >
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="all">All</option>
          </select>
        </FormField>
      </div>

      {loading ? (
        <div className={styles.skeletonStack}>
          {Array.from({ length: 3 }, (_, i) => (
            <SkeletonCard key={i} lines={2} />
          ))}
        </div>
      ) : (
        <DataTable
          title="Foster placements"
          columns={placementColumns}
          rows={placementRows}
          emptyMessage="No foster placements found."
        />
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Foster Placement">
        <form onSubmit={handleCreate} className={styles.modalForm}>
          <FormField label="Pet" htmlFor="foster-pet">
            <>
              {petsLoadError && (
                <ErrorState
                  size="sm"
                  title="Unable to load pets"
                  message={petsLoadError}
                  onRetry={retryPets}
                />
              )}
              <Input
                type="text"
                aria-label="Search pets by name or breed"
                placeholder="Search pets by name or breed..."
                value={petSearch}
                onChange={e => setPetSearch(e.target.value)}
              />
              <select
                id="foster-pet"
                value={form.petId}
                onChange={e => setForm({ ...form, petId: e.target.value })}
                required
                aria-required={true}
              >
                <option value="">
                  {petsQuery.isError
                    ? 'Failed to load pets'
                    : petsQuery.isPending
                      ? 'Loading pets...'
                      : pets.length === 0
                        ? 'No pets in your rescue'
                        : filteredPets.length === 0
                          ? 'No pets match your search'
                          : `Select a pet (${filteredPets.length} of ${pets.length})`}
                </option>
                {filteredPets.map(pet => (
                  <option key={pet.pet_id} value={pet.pet_id}>
                    {pet.name} {pet.breed ? `(${pet.breed})` : ''}
                  </option>
                ))}
              </select>
            </>
          </FormField>
          <FormField label="Foster user" htmlFor="foster-user">
            <select
              id="foster-user"
              value={form.fosterUserId}
              onChange={e => setForm({ ...form, fosterUserId: e.target.value })}
              required
              aria-required={true}
            >
              <option value="">— Select a foster user —</option>
              {staff.map(s => (
                <option key={s.userId} value={s.userId}>
                  {s.firstName} {s.lastName} ({s.email})
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Start date" htmlFor="foster-start-date">
            <Input
              id="foster-start-date"
              type="date"
              value={form.startDate}
              onChange={e => setForm({ ...form, startDate: e.target.value })}
              required
              aria-required={true}
            />
          </FormField>
          <FormField label="Notes" htmlFor="foster-notes">
            <TextArea
              id="foster-notes"
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
            />
          </FormField>
          <div className={styles.modalActions}>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={endingId !== null}
        onClose={() => setEndingId(null)}
        title="End Foster Placement"
      >
        <form onSubmit={handleEnd} className={styles.modalForm}>
          <FormField label="Outcome" htmlFor="foster-end-outcome">
            <select
              id="foster-end-outcome"
              value={endForm.outcome}
              onChange={e =>
                setEndForm({ ...endForm, outcome: e.target.value as typeof endForm.outcome })
              }
            >
              <option value="return_to_rescue">Returned to rescue</option>
              <option value="adopted_by_foster">Adopted by foster</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </FormField>
          <FormField label="Notes" htmlFor="foster-end-notes">
            <TextArea
              id="foster-end-notes"
              value={endForm.notes}
              onChange={e => setEndForm({ ...endForm, notes: e.target.value })}
            />
          </FormField>
          <div className={styles.modalActions}>
            <Button variant="outline" onClick={() => setEndingId(null)}>
              Cancel
            </Button>
            <Button type="submit">Confirm</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog {...confirmProps} />
    </div>
  );
};

export default FosterCoordination;
