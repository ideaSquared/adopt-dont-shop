import { FeatureFlag } from '../Models/FeatureFlag'

class FeatureFlagService {
  public async getAllFlags() {
    try {
      return await FeatureFlag.findAll()
    } catch (error) {
      console.error('Error fetching feature flags:', error)
      throw new Error('Failed to fetch feature flags')
    }
  }

  public async getFlagByName(name: string) {
    return await FeatureFlag.findOne({ where: { name } })
  }

  public async updateFlag(id: string, enabled: boolean) {
    try {
      const flag = await FeatureFlag.findByPk(id)
      if (!flag) throw new Error('Feature flag not found')
      flag.enabled = enabled
      await flag.save()
      return flag
    } catch (error) {
      console.error(`Error updating feature flag with ID ${id}:`, error)
      throw new Error('Failed to update feature flag')
    }
  }

  public async createFlag(name: string, description: string) {
    try {
      return await FeatureFlag.create({ name, description })
    } catch (error) {
      console.error('Error creating feature flag:', error)
      throw new Error('Failed to create feature flag')
    }
  }

  public async deleteFlag(id: number) {
    try {
      const flag = await FeatureFlag.findByPk(id)
      if (!flag) throw new Error('Feature flag not found')
      await flag.destroy()
    } catch (error) {
      console.error(`Error deleting feature flag with ID ${id}:`, error)
      throw new Error('Failed to delete feature flag')
    }
  }
}

export default new FeatureFlagService()
