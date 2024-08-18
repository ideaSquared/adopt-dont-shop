import fs from 'fs'
import path from 'path'
import { QueryInterface } from 'sequelize'
import sequelize from './sequelize'

const modelsPath = path.resolve(__dirname, 'Models')
fs.readdirSync(modelsPath).forEach((file) => {
  require(path.join(modelsPath, file))
})
;(async () => {
  try {
    await sequelize.authenticate()
    console.log('Connection established successfully.')

    await sequelize.sync({ force: true }) // Set to `force: true` if you want to drop tables and recreate them
    console.log('Database synchronized')

    if (process.env.NODE_ENV === 'development') {
      console.log('Seeding the database...')

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

      console.log('Database seeded successfully')
    }
  } catch (error) {
    console.error('Error synchronizing database:', error)
  } finally {
    await sequelize.close()
  }
})()
