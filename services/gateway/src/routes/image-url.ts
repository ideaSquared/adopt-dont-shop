// ADS-979 / ADS-930: image URLs previously accepted any string up to 2048
// chars, including `javascript:`/`data:` schemes. The rule itself (same-origin
// path, or https on the platform's own storage/CDN host) lives in
// @adopt-dont-shop/service-bootstrap so the gateway and the services cannot
// drift apart. The gateway additionally treats an empty string as "no image".
import { isSafeImageUrl as isSafePlatformImageUrl } from '@adopt-dont-shop/service-bootstrap';

export const isSafeImageUrl = (value: string): boolean =>
  value === '' || isSafePlatformImageUrl(value);
