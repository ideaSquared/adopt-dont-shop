import fs from 'fs'
import path from 'path'
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

async function runSeeders() {
  try {
    const seedersPath = path.join(__dirname, 'Seeders')

    // First run the critical seeders in order
    // Empty as renaming the files with numerical prefixes resolves this
    const orderedSeeders: string[] = []

    console.log('Running critical seeders in sequence...')
    for (const file of orderedSeeders) {
      const seeder = await import(path.join(seedersPath, file))
      const seedFunction = seeder.seed || seeder.up

      if (typeof seedFunction === 'function') {
        await seedFunction(sequelize.getQueryInterface())
        console.log(`Critical seeder ${file} completed successfully`)
      } else {
        console.warn(
          `Warning: Seeder ${file} does not export a 'seed' or 'up' function`,
        )
      }
    }

    // Then run any remaining seeders
    const remainingSeederFiles = fs
      .readdirSync(seedersPath)
      .filter((file) => file.endsWith('.ts'))
      .filter((file) => !orderedSeeders.includes(file))
      .sort((a, b) => {
        // Extract the numeric prefix if it exists
        const aMatch = a.match(/^(\d+)-/)
        const bMatch = b.match(/^(\d+)-/)

        // If both have numeric prefixes, sort by number
        if (aMatch && bMatch) {
          return parseInt(aMatch[1]) - parseInt(bMatch[1])
        }

        // If only one has a numeric prefix, put it first
        if (aMatch) return -1
        if (bMatch) return 1

        // Otherwise, sort alphabetically
        return a.localeCompare(b)
      })

    if (remainingSeederFiles.length > 0) {
      console.log('Running remaining seeders:', remainingSeederFiles)

      for (const file of remainingSeederFiles) {
        const seeder = await import(path.join(seedersPath, file))
        const seedFunction = seeder.seed || seeder.up

        if (typeof seedFunction === 'function') {
          await seedFunction(sequelize.getQueryInterface())
          console.log(`Seeder ${file} completed successfully`)
        } else {
          console.warn(
            `Warning: Seeder ${file} does not export a 'seed' or 'up' function`,
          )
        }
      }
    }

    console.log('All seeders completed successfully')
  } catch (error) {
    console.error('Error running seeders:', error)
    throw error
  }
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

      // Run seeders after force sync
      await runSeeders()
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
        await sequelize.sync({ alter: true })
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
