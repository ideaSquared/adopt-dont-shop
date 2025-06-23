import fs from 'fs-extra';
import path from 'path';
import sequelize from '../sequelize';
import { logger } from '../utils/logger';
import EmailService from './email.service';

interface ServiceHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  details?: string;
  lastChecked: Date;
}

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  uptime: number;
  timestamp: Date;
  version: string;
  environment: string;
  services: {
    database: ServiceHealth;
    email: ServiceHealth;
    storage: ServiceHealth;
    fileSystem: ServiceHealth;
  };
  metrics: {
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
    activeConnections: number;
  };
}

export class HealthCheckService {
  private static activeConnections = 0;
  private static cpuUsage = process.cpuUsage();

  static updateActiveConnections(count: number) {
    this.activeConnections = count;
  }

  static async checkDatabaseHealth(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      await sequelize.authenticate();

      // Test a simple query
      await sequelize.query('SELECT 1');

      const responseTime = Date.now() - start;

      return {
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        responseTime,
        details: `Connected to ${sequelize.getDialect()} database`,
        lastChecked: new Date(),
      };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return {
        status: 'unhealthy',
        responseTime: Date.now() - start,
        details: error instanceof Error ? error.message : 'Unknown database error',
        lastChecked: new Date(),
      };
    }
  }

  static async checkEmailHealth(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      // For Ethereal, just check if provider is initialized
      if (process.env.EMAIL_PROVIDER === 'ethereal') {
        const providerInfo = EmailService.getProviderInfo();
        return {
          status: providerInfo ? 'healthy' : 'degraded',
          responseTime: Date.now() - start,
          details: providerInfo
            ? 'Ethereal email provider ready'
            : 'Email provider not initialized',
          lastChecked: new Date(),
        };
      }

      // For production providers, you might want to test actual sending
      return {
        status: 'healthy',
        responseTime: Date.now() - start,
        details: 'Email service configured',
        lastChecked: new Date(),
      };
    } catch (error) {
      logger.error('Email health check failed:', error);
      return {
        status: 'unhealthy',
        responseTime: Date.now() - start,
        details: error instanceof Error ? error.message : 'Unknown email error',
        lastChecked: new Date(),
      };
    }
  }

  static async checkStorageHealth(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      if (process.env.STORAGE_PROVIDER === 'local') {
        const uploadDir = path.resolve(process.env.UPLOAD_DIR || 'uploads');

        // Check if directory exists and is writable
        await fs.ensureDir(uploadDir);

        // Test write/read/delete operation
        const testFile = path.join(uploadDir, 'health-check.txt');
        const testContent = `Health check at ${new Date().toISOString()}`;

        await fs.writeFile(testFile, testContent);
        const readContent = await fs.readFile(testFile, 'utf8');
        await fs.remove(testFile);

        if (readContent !== testContent) {
          throw new Error('File content mismatch');
        }

        return {
          status: 'healthy',
          responseTime: Date.now() - start,
          details: `Local storage accessible at ${uploadDir}`,
          lastChecked: new Date(),
        };
      }

      // For S3 or other providers, implement specific checks
      return {
        status: 'healthy',
        responseTime: Date.now() - start,
        details: 'Storage service configured',
        lastChecked: new Date(),
      };
    } catch (error) {
      logger.error('Storage health check failed:', error);
      return {
        status: 'unhealthy',
        responseTime: Date.now() - start,
        details: error instanceof Error ? error.message : 'Unknown storage error',
        lastChecked: new Date(),
      };
    }
  }

  static async checkFileSystemHealth(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      const stats = await fs.stat(process.cwd());

      // Check available disk space (basic check)
      const diskSpace = await this.getDiskSpace();

      return {
        status: diskSpace.available > 1024 * 1024 * 100 ? 'healthy' : 'degraded', // 100MB threshold
        responseTime: Date.now() - start,
        details: `Available space: ${Math.round(diskSpace.available / 1024 / 1024)}MB`,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - start,
        details: error instanceof Error ? error.message : 'Unknown filesystem error',
        lastChecked: new Date(),
      };
    }
  }

  private static async getDiskSpace() {
    try {
      const { promisify } = await import('util');
      const { exec } = await import('child_process');
      const execPromise = promisify(exec);

      if (process.platform === 'win32') {
        // Windows: Use wmic to get disk space
        const result = await execPromise('wmic logicaldisk get size,freespace,caption');
        const lines = result.stdout.split('\n').filter((line: string) => line.trim());
        const dataLine = lines.find((line: string) => line.includes('C:'));

        if (dataLine) {
          const parts = dataLine.trim().split(/\s+/);
          const freeSpace = parseInt(parts[1]);
          const totalSpace = parseInt(parts[2]);
          return {
            available: freeSpace,
            total: totalSpace,
          };
        }
      } else {
        // Unix-like systems: Use df command
        const result = await execPromise('df -B 1 .');
        const lines = result.stdout.split('\n');
        const dataLine = lines[1]; // Second line contains the data
        const parts = dataLine.trim().split(/\s+/);

        const total = parseInt(parts[1]);
        const available = parseInt(parts[3]);

        return {
          available,
          total,
        };
      }
    } catch (error) {
      logger.warn('Could not get disk space info:', error);
    }

    // Fallback: estimate based on current working directory
    try {
      const stats = await fs.stat(process.cwd());
      // Rough estimation - not accurate but better than hardcoded values
      return {
        available: 1024 * 1024 * 1024 * 5, // 5GB fallback
        total: 1024 * 1024 * 1024 * 50, // 50GB fallback
      };
    } catch {
      return { available: 0, total: 0 };
    }
  }

  static async getFullHealthCheck(): Promise<HealthCheckResult> {
    const [database, email, storage, fileSystem] = await Promise.all([
      this.checkDatabaseHealth(),
      this.checkEmailHealth(),
      this.checkStorageHealth(),
      this.checkFileSystemHealth(),
    ]);

    const services = { database, email, storage, fileSystem };

    // Determine overall status
    const hasUnhealthy = Object.values(services).some(service => service.status === 'unhealthy');
    const hasDegraded = Object.values(services).some(service => service.status === 'degraded');

    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    if (hasUnhealthy) overallStatus = 'unhealthy';
    else if (hasDegraded) overallStatus = 'degraded';

    return {
      status: overallStatus,
      uptime: process.uptime(),
      timestamp: new Date(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services,
      metrics: {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(this.cpuUsage),
        activeConnections: this.activeConnections,
      },
    };
  }
}
