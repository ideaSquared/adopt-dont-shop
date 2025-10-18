import { Router } from 'express';
import { config } from '../config';
import { authLimiter, uploadLimiter } from '../middleware/rate-limiter';
import { HealthCheckService } from '../services/health-check.service';

const router = Router();

// Helper function to generate descriptions for dev users
const getDevUserDescription = (userType: string, email: string): string => {
  if (email.includes('superadmin')) return 'Super Administrator - Full system access';
  if (email.includes('admin@adoptdontshop')) return 'System Administrator';
  if (email.includes('moderator')) return 'Content Moderator';
  if (email.includes('rescue.manager')) return 'Rescue Manager';
  if (email.includes('sarah.johnson')) return 'Veterinary Technician';
  if (email.includes('maria@happytailsrescue')) return 'Happy Tails Director';
  if (email.includes('alex.thompson')) return 'Active Volunteer';
  if (email.includes('john.smith')) return 'Family dog seeker';
  if (email.includes('emily.davis')) return 'Cat lover';
  if (email.includes('michael.brown')) return 'Active dog owner';
  if (email.includes('jessica.wilson')) return 'First-time adopter';
  
  // Fallback based on user type
  switch (userType) {
    case 'admin': return 'Administrator';
    case 'moderator': return 'Moderator';
    case 'rescue_staff': return 'Rescue Staff';
    case 'adopter': return 'Adopter';
    default: return 'Dev User';
  }
};

// Only enable in development
if (process.env.NODE_ENV === 'development') {
  /**
   * @swagger
   * /api/v1/dashboard:
   *   get:
   *     tags: [Monitoring]
   *     summary: GET /api/v1/dashboard
   *     description: Handle GET request for /api/v1/dashboard
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: GET /api/v1/dashboard successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */

  /**
   * @swagger
   * /api/v1/dashboard:
   *   get:
   *     tags: [Monitoring]
   *     summary: GET /api/v1/dashboard
   *     description: Handle GET request for /api/v1/dashboard
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: GET /api/v1/dashboard successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */

  /**
   * @swagger
   * /api/v1/dashboard:
   *   get:
   *     tags: [Monitoring]
   *     summary: GET /api/v1/dashboard
   *     description: Handle GET request for /api/v1/dashboard
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: GET /api/v1/dashboard successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */

  /**
   * @swagger
   * /api/v1/dashboard:
   *   get:
   *     tags: [Monitoring]
   *     summary: GET /api/v1/dashboard
   *     description: Handle GET request for /api/v1/dashboard
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: GET /api/v1/dashboard successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  router.get('/dashboard', async (req, res) => {
    const health = await HealthCheckService.getFullHealthCheck();

    // Get email provider info for Ethereal
    let emailProviderInfo = null;
    try {
      const EmailService = (await import('../services/email.service')).default;
      emailProviderInfo = EmailService.getProviderInfo();
    } catch (error) {
      console.warn('Could not get email provider info:', error);
    }

    // Simple HTML dashboard
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Service Monitor</title>
        <meta http-equiv="refresh" content="5">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            background-color: #f5f5f5;
          }
          .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #eee;
          }
          .status-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .healthy { 
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
          }
          .degraded { 
            background-color: #fff3cd;
            color: #856404;
            border: 1px solid #ffeaa7;
          }
          .unhealthy { 
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
          }
          .service-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin: 20px 0;
          }
          .service { 
            margin: 10px 0; 
            padding: 15px; 
            border: 1px solid #ddd; 
            border-radius: 8px;
            background: #fafafa;
          }
          .service h3 {
            margin: 0 0 10px 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .service-status {
            font-size: 0.8em;
            padding: 4px 8px;
            border-radius: 12px;
          }
          .metrics {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
          }
          .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
          }
          .metric {
            text-align: center;
            padding: 10px;
            background: white;
            border-radius: 6px;
            border: 1px solid #ddd;
          }
          .metric-value {
            font-size: 1.5em;
            font-weight: bold;
            color: #333;
          }
          .metric-label {
            font-size: 0.9em;
            color: #666;
            margin-top: 5px;
          }
          .auto-refresh {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #007bff;
            color: white;
            padding: 10px 15px;
            border-radius: 20px;
            font-size: 0.9em;
          }
        </style>
      </head>
      <body>
        <div class="auto-refresh">Auto-refresh: 5s</div>
        <div class="container">
          <div class="header">
            <h1>🚀 Adopt Don't Shop - Service Monitor</h1>
            <p><strong>Overall Status:</strong> 
              <span class="status-badge ${health.status}">${health.status.toUpperCase()}</span>
            </p>
            <p><strong>Environment:</strong> ${health.environment} | 
               <strong>Uptime:</strong> ${Math.round(health.uptime)}s | 
               <strong>Last Updated:</strong> ${health.timestamp.toLocaleString()}</p>
          </div>
          
          <h2>📊 Services Status</h2>
          <div class="service-grid">
            ${Object.entries(health.services)
              .map(
                ([name, service]) => `
              <div class="service">
                <h3>
                  ${name.charAt(0).toUpperCase() + name.slice(1)}
                  <span class="service-status ${service.status}">${service.status}</span>
                </h3>
                <p><strong>Response Time:</strong> ${service.responseTime}ms</p>
                <p><strong>Details:</strong> ${service.details}</p>
                <p><strong>Last Checked:</strong> ${service.lastChecked.toLocaleTimeString()}</p>
              </div>
            `
              )
              .join('')}
          </div>
          
          <h2>📈 System Metrics</h2>
          <div class="metrics">
            <div class="metrics-grid">
                             <div class="metric">
                 <div class="metric-value">${Math.round(health.metrics.memoryUsage.rss / 1024 / 1024)}MB</div>
                 <div class="metric-label">Memory Used</div>
               </div>
              <div class="metric">
                <div class="metric-value">${Math.round(health.metrics.memoryUsage.heapUsed / 1024 / 1024)}MB</div>
                <div class="metric-label">Heap Used</div>
              </div>
              <div class="metric">
                <div class="metric-value">${health.metrics.activeConnections}</div>
                <div class="metric-label">Active Connections</div>
              </div>
              <div class="metric">
                <div class="metric-value">${Math.round(health.metrics.cpuUsage.user / 1000)}ms</div>
                <div class="metric-label">CPU User Time</div>
              </div>
            </div>
          </div>

          <h2>🔗 Quick Links</h2>
                     <div style="margin: 20px 0; text-align: center;">
             <a href="/health" style="margin: 0 10px; padding: 10px 20px; background: #28a745; color: white; text-decoration: none; border-radius: 5px;">Health Check JSON</a>
             <a href="/health/simple" style="margin: 0 10px; padding: 10px 20px; background: #17a2b8; color: white; text-decoration: none; border-radius: 5px;">Simple Health</a>
             <a href="/health/ready" style="margin: 0 10px; padding: 10px 20px; background: #ffc107; color: black; text-decoration: none; border-radius: 5px;">Readiness Check</a>
             <a href="/monitoring/api/email/provider-info" target="_blank" style="margin: 0 10px; padding: 10px 20px; background: #dc3545; color: white; text-decoration: none; border-radius: 5px;">📧 Email Login Info</a>
           </div>

           ${
             emailProviderInfo
               ? `
           <h2>📧 Email Testing (Development)</h2>
           <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #dee2e6;">
             <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
               <div>
                 <h5 style="color: #495057; margin-bottom: 10px;">🔑 Login Credentials</h5>
                 <div style="background: white; padding: 15px; border-radius: 5px; border: 1px solid #ddd;">
                   <div><strong>Username:</strong> <code>${emailProviderInfo.user}</code></div>
                   <div style="margin-top: 5px;"><strong>Password:</strong> <code>${emailProviderInfo.password}</code></div>
                 </div>
               </div>
               <div>
                 <h5 style="color: #495057; margin-bottom: 10px;">🌐 Quick Access</h5>
                 <div style="display: flex; flex-direction: column; gap: 10px;">
                   <a href="https://ethereal.email/login" target="_blank" style="padding: 10px 15px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; text-align: center;">
                     🔐 Login to Ethereal
                   </a>
                   <a href="https://ethereal.email/messages" target="_blank" style="padding: 10px 15px; background: #28a745; color: white; text-decoration: none; border-radius: 5px; text-align: center;">
                     📬 View All Messages
                   </a>
                 </div>
               </div>
             </div>
             <div style="margin-top: 15px; padding: 10px; background: #d1ecf1; border-radius: 5px; color: #0c5460; font-size: 0.9em;">
               💡 <strong>Pro Tip:</strong> All emails sent in development are captured here. Check the console for direct message preview links!
             </div>
           </div>
           `
               : ''
           }

          <h2>🛡️ Rate Limiting Status</h2>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #dee2e6;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
              <div>
                <h5 style="color: #495057; margin-bottom: 10px;">⚙️ Current Status</h5>
                <div style="background: white; padding: 15px; border-radius: 5px; border: 1px solid #ddd;">
                  <div style="margin-bottom: 10px;">
                    <strong>Mode:</strong> 
                    <span style="background: ${
                      health.environment === 'development' ? '#fff3cd' : '#d4edda'
                    }; color: ${
                      health.environment === 'development' ? '#856404' : '#155724'
                    }; padding: 2px 8px; border-radius: 12px; font-weight: bold;">
                      ${health.environment === 'development' ? 'BYPASSED' : 'ACTIVE'}
                    </span>
                  </div>
                  <div><strong>Environment:</strong> ${health.environment}</div>
                  <div><strong>API Limit:</strong> ${config.rateLimit.maxRequests} requests per ${
                    config.rateLimit.windowMs / 60000
                  } minutes</div>
                </div>
              </div>
              <div>
                <h5 style="color: #495057; margin-bottom: 10px;">🧪 Test Endpoints</h5>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  <a href="/monitoring/test-rate-limit" target="_blank" style="padding: 8px 12px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; text-align: center; font-size: 0.9em;">
                    Test General Rate Limit
                  </a>
                  <a href="/monitoring/test-auth-rate-limit" target="_blank" style="padding: 8px 12px; background: #dc3545; color: white; text-decoration: none; border-radius: 4px; text-align: center; font-size: 0.9em;">
                    Test Auth Rate Limit (5/15min)
                  </a>
                  <a href="/monitoring/test-upload-rate-limit" target="_blank" style="padding: 8px 12px; background: #28a745; color: white; text-decoration: none; border-radius: 4px; text-align: center; font-size: 0.9em;">
                    Test Upload Rate Limit (20/15min)
                  </a>
                  <a href="/monitoring/rate-limit-status" target="_blank" style="padding: 8px 12px; background: #6c757d; color: white; text-decoration: none; border-radius: 4px; text-align: center; font-size: 0.9em;">
                    Rate Limit Status JSON
                  </a>
                </div>
              </div>
            </div>
            ${
              health.environment === 'development'
                ? `<div style="margin-top: 15px; padding: 10px; background: #fff3cd; border-radius: 5px; color: #856404; font-size: 0.9em;">
                     ⚠️ <strong>Development Mode:</strong> Rate limits are bypassed! Warnings will be logged to console when limits would be hit. Check your terminal for rate limit warning messages.
                   </div>`
                : `<div style="margin-top: 15px; padding: 10px; background: #d4edda; border-radius: 5px; color: #155724; font-size: 0.9em;">
                     🛡️ <strong>Production Mode:</strong> Rate limits are active. Exceeding limits will result in 429 status codes.
                   </div>`
            }
          </div>
        </div>
      </body>
      </html>
    `;

    res.send(html);
  });

  // API endpoint for dashboard data

  /**
   * @swagger
   * /api/v1/api/health:
   *   get:
   *     tags: [Monitoring]
   *     summary: GET /api/v1/api/health
   *     description: Handle GET request for /api/v1/api/health
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: GET /api/v1/api/health successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */

  /**
   * @swagger
   * /api/v1/api/health:
   *   get:
   *     tags: [Monitoring]
   *     summary: GET /api/v1/api/health
   *     description: Handle GET request for /api/v1/api/health
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: GET /api/v1/api/health successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */

  /**
   * @swagger
   * /api/v1/api/health:
   *   get:
   *     tags: [Monitoring]
   *     summary: GET /api/v1/api/health
   *     description: Handle GET request for /api/v1/api/health
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: GET /api/v1/api/health successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */

  /**
   * @swagger
   * /api/v1/api/health:
   *   get:
   *     tags: [Monitoring]
   *     summary: GET /api/v1/api/health
   *     description: Handle GET request for /api/v1/api/health
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: GET /api/v1/api/health successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  router.get('/api/health', async (req, res) => {
    try {
      const health = await HealthCheckService.getFullHealthCheck();
      res.json(health);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get health status' });
    }
  });

  // Individual service health endpoints for frontend

  /**
   * @swagger
   * /api/v1/api/health/database:
   *   get:
   *     tags: [Monitoring]
   *     summary: GET /api/v1/api/health/database
   *     description: Handle GET request for /api/v1/api/health/database
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: GET /api/v1/api/health/database successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */

  /**
   * @swagger
   * /api/v1/api/health/database:
   *   get:
   *     tags: [Monitoring]
   *     summary: GET /api/v1/api/health/database
   *     description: Handle GET request for /api/v1/api/health/database
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: GET /api/v1/api/health/database successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */

  /**
   * @swagger
   * /api/v1/api/health/database:
   *   get:
   *     tags: [Monitoring]
   *     summary: GET /api/v1/api/health/database
   *     description: Handle GET request for /api/v1/api/health/database
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: GET /api/v1/api/health/database successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */

  /**
   * @swagger
   * /api/v1/api/health/database:
   *   get:
   *     tags: [Monitoring]
   *     summary: GET /api/v1/api/health/database
   *     description: Handle GET request for /api/v1/api/health/database
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: GET /api/v1/api/health/database successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  router.get('/api/health/database', async (req, res) => {
    try {
      const dbHealth = await HealthCheckService.checkDatabaseHealth();
      res.json(dbHealth);
    } catch (error) {
      res.status(500).json({ error: 'Failed to check database health' });
    }
  });

  /**
   * @swagger
   * /api/v1/api/health/email:
   *   get:
   *     tags: [Monitoring]
   *     summary: GET /api/v1/api/health/email
   *     description: Handle GET request for /api/v1/api/health/email
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: GET /api/v1/api/health/email successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */

  /**
   * @swagger
   * /api/v1/api/health/email:
   *   get:
   *     tags: [Monitoring]
   *     summary: GET /api/v1/api/health/email
   *     description: Handle GET request for /api/v1/api/health/email
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: GET /api/v1/api/health/email successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */

  /**
   * @swagger
   * /api/v1/api/health/email:
   *   get:
   *     tags: [Monitoring]
   *     summary: GET /api/v1/api/health/email
   *     description: Handle GET request for /api/v1/api/health/email
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: GET /api/v1/api/health/email successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */

  /**
   * @swagger
   * /api/v1/api/health/email:
   *   get:
   *     tags: [Monitoring]
   *     summary: GET /api/v1/api/health/email
   *     description: Handle GET request for /api/v1/api/health/email
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: GET /api/v1/api/health/email successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  router.get('/api/health/email', async (req, res) => {
    try {
      const emailHealth = await HealthCheckService.checkEmailHealth();
      res.json(emailHealth);
    } catch (error) {
      res.status(500).json({ error: 'Failed to check email health' });
    }
  });

  /**
   * @swagger
   * /api/v1/api/health/storage:
   *   get:
   *     tags: [Monitoring]
   *     summary: GET /api/v1/api/health/storage
   *     description: Handle GET request for /api/v1/api/health/storage
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: GET /api/v1/api/health/storage successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */

  /**
   * @swagger
   * /api/v1/api/health/storage:
   *   get:
   *     tags: [Monitoring]
   *     summary: GET /api/v1/api/health/storage
   *     description: Handle GET request for /api/v1/api/health/storage
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: GET /api/v1/api/health/storage successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */

  /**
   * @swagger
   * /api/v1/api/health/storage:
   *   get:
   *     tags: [Monitoring]
   *     summary: GET /api/v1/api/health/storage
   *     description: Handle GET request for /api/v1/api/health/storage
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: GET /api/v1/api/health/storage successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */

  /**
   * @swagger
   * /api/v1/api/health/storage:
   *   get:
   *     tags: [Monitoring]
   *     summary: GET /api/v1/api/health/storage
   *     description: Handle GET request for /api/v1/api/health/storage
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: GET /api/v1/api/health/storage successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  router.get('/api/health/storage', async (req, res) => {
    try {
      const storageHealth = await HealthCheckService.checkStorageHealth();
      res.json(storageHealth);
    } catch (error) {
      res.status(500).json({ error: 'Failed to check storage health' });
    }
  });

  /**
   * @swagger
   * /api/v1/api/health/system:
   *   get:
   *     tags: [Monitoring]
   *     summary: GET /api/v1/api/health/system
   *     description: Handle GET request for /api/v1/api/health/system
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: GET /api/v1/api/health/system successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */

  /**
   * @swagger
   * /api/v1/api/health/system:
   *   get:
   *     tags: [Monitoring]
   *     summary: GET /api/v1/api/health/system
   *     description: Handle GET request for /api/v1/api/health/system
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: GET /api/v1/api/health/system successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */

  /**
   * @swagger
   * /api/v1/api/health/system:
   *   get:
   *     tags: [Monitoring]
   *     summary: GET /api/v1/api/health/system
   *     description: Handle GET request for /api/v1/api/health/system
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: GET /api/v1/api/health/system successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */

  /**
   * @swagger
   * /api/v1/api/health/system:
   *   get:
   *     tags: [Monitoring]
   *     summary: GET /api/v1/api/health/system
   *     description: Handle GET request for /api/v1/api/health/system
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: GET /api/v1/api/health/system successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  router.get('/api/health/system', async (req, res) => {
    try {
      const health = await HealthCheckService.getFullHealthCheck();
      res.json({
        uptime: health.uptime,
        metrics: health.metrics,
        timestamp: health.timestamp,
        version: health.version,
        environment: health.environment,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get system metrics' });
    }
  });

  // Email provider info (development only)

  /**
   * @swagger
   * /api/v1/api/email/provider-info:
   *   get:
   *     tags: [Monitoring]
   *     summary: GET /api/v1/api/email/provider-info
   *     description: Handle GET request for /api/v1/api/email/provider-info
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: GET /api/v1/api/email/provider-info successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */

  /**
   * @swagger
   * /api/v1/api/email/provider-info:
   *   get:
   *     tags: [Monitoring]
   *     summary: GET /api/v1/api/email/provider-info
   *     description: Handle GET request for /api/v1/api/email/provider-info
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: GET /api/v1/api/email/provider-info successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */

  /**
   * @swagger
   * /api/v1/api/email/provider-info:
   *   get:
   *     tags: [Monitoring]
   *     summary: GET /api/v1/api/email/provider-info
   *     description: Handle GET request for /api/v1/api/email/provider-info
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: GET /api/v1/api/email/provider-info successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */

  /**
   * @swagger
   * /api/v1/api/email/provider-info:
   *   get:
   *     tags: [Monitoring]
   *     summary: GET /api/v1/api/email/provider-info
   *     description: Handle GET request for /api/v1/api/email/provider-info
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: GET /api/v1/api/email/provider-info successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  router.get('/api/email/provider-info', async (req, res) => {
    try {
      const EmailService = (await import('../services/email.service')).default;
      const providerInfo = EmailService.getProviderInfo();

      if (!providerInfo) {
        return res.json({
          provider: 'none',
          message: 'No email provider info available',
        });
      }

      res.json({
        provider: 'ethereal',
        ...providerInfo,
        loginUrl: 'https://ethereal.email/login',
        messagesUrl: 'https://ethereal.email/messages',
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get email provider info' });
    }
  });

  // Dev seeded users endpoint (development only)
  router.get('/api/dev/seeded-users', async (req, res) => {
    try {
      // Import User model to fetch seeded users
      const User = (await import('../models/User')).default;
      
      // Get all seeded dev users (identifiable by specific email patterns)
      const seededUsers = await User.findAll({
        where: {
          email: {
            [require('sequelize').Op.or]: [
              { [require('sequelize').Op.like]: '%@adoptdontshop.dev' },
              { [require('sequelize').Op.like]: '%@pawsrescue.dev' },
              { [require('sequelize').Op.like]: '%@happytailsrescue.dev' },
              { [require('sequelize').Op.like]: '%@happytails.org' },
              { [require('sequelize').Op.in]: [
                'john.smith@gmail.com',
                'emily.davis@yahoo.com', 
                'michael.brown@outlook.com',
                'jessica.wilson@gmail.com'
              ]}
            ]
          }
        },
        attributes: [
          'userId', 'firstName', 'lastName', 'email', 'userType', 'status',
          'emailVerified', 'country', 'city', 'addressLine1', 'postalCode',
          'timezone', 'language', 'bio', 'dateOfBirth', 'phoneNumber',
          'termsAcceptedAt', 'privacyPolicyAcceptedAt', 'createdAt', 'updatedAt'
        ],
        order: [['userType', 'ASC'], ['email', 'ASC']]
      });

      // Transform to DevUser format with descriptions
      const transformedUsers = seededUsers.map(user => ({
        ...user.toJSON(),
        description: getDevUserDescription(user.userType, user.email)
      }));

      res.json({
        users: transformedUsers,
        password: 'DevPassword123!',
        source: 'database',
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Failed to fetch seeded users:', error);
      res.status(500).json({ 
        error: 'Failed to fetch seeded users',
        fallback: 'Use local data'
      });
    }
  });

  // Rate limit testing endpoint (development only)
  router.get('/test-rate-limit', async (req, res) => {
    res.json({
      message: 'Rate limit test endpoint hit successfully',
      timestamp: new Date(),
      ip: req.ip,
      note:
        config.nodeEnv === 'development'
          ? 'In development mode - check console for rate limit warnings'
          : 'Rate limiting is active in production',
    });
  });

  // Multiple endpoints with different rate limiters for testing
  router.get('/test-auth-rate-limit', authLimiter, async (req, res) => {
    res.json({
      message: 'Auth rate limit test endpoint hit successfully',
      timestamp: new Date(),
      ip: req.ip,
      note: 'This endpoint uses auth rate limiter (5 requests per 15 minutes)',
    });
  });

  router.get('/test-upload-rate-limit', uploadLimiter, async (req, res) => {
    res.json({
      message: 'Upload rate limit test endpoint hit successfully',
      timestamp: new Date(),
      ip: req.ip,
      note: 'This endpoint uses upload rate limiter (20 requests per 15 minutes)',
    });
  });

  // Rate limiting status endpoint
  router.get('/rate-limit-status', async (req, res) => {
    res.json({
      rateLimitingMode: config.nodeEnv === 'development' ? 'BYPASSED' : 'ACTIVE',
      environment: config.nodeEnv,
      limits: {
        api: {
          windowMs: config.rateLimit.windowMs,
          maxRequests: config.rateLimit.maxRequests,
          windowMinutes: config.rateLimit.windowMs / 60000,
        },
        auth: {
          windowMs: 15 * 60 * 1000,
          maxRequests: 5,
          windowMinutes: 15,
        },
        upload: {
          windowMs: 15 * 60 * 1000,
          maxRequests: 20,
          windowMinutes: 15,
        },
        passwordReset: {
          windowMs: 60 * 60 * 1000,
          maxRequests: 3,
          windowMinutes: 60,
        },
      },
      testEndpoints: [
        '/monitoring/test-rate-limit',
        '/monitoring/test-auth-rate-limit',
        '/monitoring/test-upload-rate-limit',
      ],
      note:
        config.nodeEnv === 'development'
          ? 'Rate limits are BYPASSED in development. Hit the test endpoints multiple times to see console warnings.'
          : 'Rate limits are ACTIVE. Exceeding limits will result in 429 status codes.',
      timestamp: new Date(),
    });
  });
}

export default router;
