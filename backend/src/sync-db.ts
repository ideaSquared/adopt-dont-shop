import fs from 'fs'
import path from 'path'
import { QueryInterface } from 'sequelize'
import './Models' // Ensure all models are registered
import { AuditLog } from './Models/AuditLog' // Explicitly import the AuditLog model
import sequelize from './sequelize'
import { AuditLogger } from './services/auditLogService'

// Function to check if the database is empty (i.e., has no tables)
async function isDatabaseEmpty(): Promise<boolean> {
  const queryInterface = sequelize.getQueryInterface()
  const tables = await queryInterface.showAllTables()

  // Exclude specific tables, like AuditLog, from this check if needed
  const filteredTables = tables.filter(
    (tableName) => tableName !== AuditLog.getTableName(),
  )

  return filteredTables.length === 0
}

// Main function to handle database sync
;(async () => {
  const args = process.argv.slice(2)
  const forceSync = args.includes('--sync')

  try {
    await sequelize.authenticate()
    console.log('Connection established successfully.')

    // Sync the audit_logs table first
    await AuditLog.sync({ force: false })
    console.log('Audit log table ensured.')

    // Now that the table exists, we can safely log the connection action
    await AuditLogger.logAction(
      'DatabaseService',
      'Connection established successfully',
      'INFO',
    )

    if (forceSync) {
      console.log('Forcing database synchronization...')
      await sequelize.sync({ force: true })
      await AuditLogger.logAction(
        'DatabaseService',
        'Database forced sync completed',
        'INFO',
      )

      // Force seed the database
      console.log('Starting database seeding...')
      const seedersPath = path.resolve(__dirname, 'Seeders')
      const queryInterface: QueryInterface = sequelize.getQueryInterface()

      for (const file of fs.readdirSync(seedersPath)) {
        const seederModule = require(path.join(seedersPath, file))
        const seedFunction = seederModule.seed || seederModule.default

        if (typeof seedFunction === 'function') {
          await seedFunction(queryInterface)
          console.log(`Seeder ${file} executed successfully`)
        } else {
          console.warn(
            `Seeder in file ${file} does not export a 'seed' function`,
          )
        }
      }
      console.log('Database seeding completed.')

      // Log the seeding action
      await AuditLogger.logAction(
        'DatabaseService',
        'Database seeding completed',
        'INFO',
      )
    } else {
      const databaseEmpty = await isDatabaseEmpty()

      if (databaseEmpty) {
        await sequelize.sync()
        console.log('Database synchronized successfully.')
        await AuditLogger.logAction(
          'DatabaseService',
          'Database synchronized successfully',
          'INFO',
        )
      } else {
        console.log('Database is not empty; skipping synchronization.')
        await AuditLogger.logAction(
          'DatabaseService',
          'Database is not empty; skipping synchronization.',
          'INFO',
        )
      }
    }
  } catch (error) {
    console.error('Error during database setup:', error)
    await AuditLogger.logAction(
      'DatabaseService',
      `Error during database setup: ${(error as Error).message}`,
      'ERROR',
    )
    process.exit(1) // Exit with failure
  } finally {
    await AuditLogger.logAction(
      'DatabaseService',
      'Database connection closed',
      'INFO',
    )
    await sequelize.close()
    console.log('Database connection closed.')
  }
})()
