import { Button, DateTime, Table } from '@adoptdontshop/components'
import { FeatureFlagService } from '@adoptdontshop/libs/feature-flags/'
import React, { useEffect, useState } from 'react'

interface FeatureFlag {
  flag_id: string
  name: string
  enabled: boolean
  description: string
  updated_at: string
  created_at: string
}

const FeatureFlags: React.FC = () => {
  const [flags, setFlags] = useState<FeatureFlag[]>([])

  useEffect(() => {
    const loadFlags = async () => {
      const flags = await FeatureFlagService.fetchFeatureFlags()
      setFlags(flags)
    }
    loadFlags()
  }, [])

  const toggleFlag = async (flag_id: string, enabled: boolean) => {
    const updatedFlag = await FeatureFlagService.updateFeatureFlag(
      flag_id,
      !enabled,
    )
    setFlags((prevFlags) =>
      prevFlags.map((flag) => (flag.flag_id === flag_id ? updatedFlag : flag)),
    )
  }

  return (
    <div>
      <h1>Feature Flags</h1>
      <Table>
        <thead>
          <tr>
            <th>Flag ID</th>
            <th>Name</th>
            <th>Description</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {flags.map((flag) => (
            <tr key={flag.flag_id}>
              <td>{flag.flag_id}</td>
              <td>{flag.name}</td>
              <td>{flag.description}</td>
              <td>
                <DateTime timestamp={flag.created_at} />
              </td>
              <td>
                <DateTime timestamp={flag.updated_at} />
              </td>
              <td>
                <Button onClick={() => toggleFlag(flag.flag_id, flag.enabled)}>
                  {flag.enabled ? 'Disable' : 'Enable'}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  )
}

export default FeatureFlags
