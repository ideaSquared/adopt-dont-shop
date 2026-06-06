// OpenTelemetry SDK bootstrap for service.moderation. Same pattern as
// the rest of the extracted services. See @adopt-dont-shop/observability.

import { initializeOpenTelemetry } from '@adopt-dont-shop/observability';

initializeOpenTelemetry({ serviceName: 'service.moderation' });
