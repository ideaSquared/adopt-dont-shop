import sequelize from './sequelize'
import { AuditLogger } from './services/auditLogService'

// Function to check if the database is empty (i.e., has no tables)
async function isDatabaseEmpty(): Promise<boolean> {
  const queryInterface = sequelize.getQueryInterface()
  const tables = await queryInterface.showAllTables()
  return tables.length === 0
}

// Main function to handle database sync
;(async () => {
  const args = process.argv.slice(2)
  const forceSync = args.includes('--sync')

  try {
    await sequelize.authenticate()
    console.log('Connection established successfully.')
    AuditLogger.logAction(
      'DatabaseService',
      'Connection established successfully',
      'INFO',
    )

    if (forceSync) {
      console.log('Forcing database synchronization...')
      await sequelize.sync({ force: true })
      AuditLogger.logAction(
        'DatabaseService',
        'Database forced sync completed',
        'INFO',
      )
    } else {
      const databaseEmpty = await isDatabaseEmpty()

      if (databaseEmpty) {
        await sequelize.sync()
        console.log('Database synchronized successfully.')
        AuditLogger.logAction(
          'DatabaseService',
          'Database synchronized successfully',
          'INFO',
        )
      } else {
        console.log('Database is not empty; skipping synchronization.')
        AuditLogger.logAction(
          'DatabaseService',
          'Database is not empty; skipping synchronization.',
          'INFO',
        )
      }
    }
  } catch (error) {
    console.error('Error during database setup:', error)
    AuditLogger.logAction(
      'DatabaseService',
      `Error during database setup: ${(error as Error).message}`,
      'ERROR',
    )
    process.exit(1) // Exit with failure
  } finally {
    await sequelize.close()
    console.log('Database connection closed.')
    AuditLogger.logAction(
      'DatabaseService',
      'Database connection closed',
      'INFO',
    )
  }
})()
