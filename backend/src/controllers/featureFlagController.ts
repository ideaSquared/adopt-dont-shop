import { Request, Response } from 'express'
import FeatureFlagService from '../services/featureFlagService'

class FeatureFlagController {
  public async getAllFlags(req: Request, res: Response) {
    try {
      const flags = await FeatureFlagService.getAllFlags()
      res.json(flags)
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch feature flags' })
    }
  }

  public async getFlagByName(req: Request, res: Response) {
    const { name } = req.params
    try {
      const flag = await FeatureFlagService.getFlagByName(name)
      if (flag) {
        res.json({ name: flag.name, enabled: flag.enabled })
      } else {
        res.status(404).json({ error: `Feature flag ${name} not found` })
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch feature flag' })
    }
  }

  public async updateFlag(req: Request, res: Response) {
    const { flag_id, enabled } = req.body
    try {
      const flag = await FeatureFlagService.updateFlag(flag_id, enabled)
      res.json(flag)
    } catch (error) {
      res.status(500).json({ error: 'Failed to update feature flag' })
    }
  }

  public async createFlag(req: Request, res: Response) {
    const { name, description } = req.body
    try {
      const newFlag = await FeatureFlagService.createFlag(name, description)
      res.status(201).json(newFlag)
    } catch (error) {
      res.status(500).json({ error: 'Failed to create feature flag' })
    }
  }

  public async deleteFlag(req: Request, res: Response) {
    const { id } = req.params
    try {
      await FeatureFlagService.deleteFlag(id)
      res.status(204).send()
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete feature flag' })
    }
  }
}

export default new FeatureFlagController()
