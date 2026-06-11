// Re-export from @adopt-dont-shop/service-bootstrap — all logic lives
// in the shared package. This shim keeps existing import paths working.
export {
  extractPrincipal,
  extractPrincipalOptional,
  MissingPrincipalError,
} from '@adopt-dont-shop/service-bootstrap';
