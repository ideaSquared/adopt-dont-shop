// Main exports for @adopt-dont-shop/lib.legal

// Components
export { LegalReacceptanceModal } from './components/LegalReacceptanceModal';

// Service / schemas
export {
  fetchPendingReacceptance,
  recordReacceptance,
  PendingReacceptanceItemSchema,
  PendingReacceptanceResponseSchema,
} from './services/legal-service';
export type {
  PendingReacceptanceItem,
  PendingReacceptanceResponse,
  RecordReacceptanceInput,
} from './services/legal-service';
