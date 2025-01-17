import { FeatureFlag } from '../Models/FeatureFlag'

export const getAllFeatureFlagsService = async () => {
  return await FeatureFlag.findAll()
}

export const getFlagByNameService = async (name: string) => {
  return await FeatureFlag.findOne({ where: { name } })
}

export const updateFeatureFlagService = async (
  id: string,
  enabled: boolean,
) => {
  const flag = await FeatureFlag.findByPk(id)
  if (!flag) {
    throw new Error('Feature flag not found')
  }
  flag.enabled = enabled
  await flag.save()

  return flag
}

export const createFeatureFlagService = async (
  name: string,
  description: string,
) => {
  const newFlag = await FeatureFlag.create({ name, description })
  return newFlag
}

export const deleteFeatureFlagService = async (id: string) => {
  const flag = await FeatureFlag.findByPk(id)
  if (!flag) {
    throw new Error('Feature flag not found')
  }
  await flag.destroy()
  return true
}
