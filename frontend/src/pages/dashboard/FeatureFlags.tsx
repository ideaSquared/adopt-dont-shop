import React, { useEffect, useState } from 'react'

// Third-party imports
import styled from 'styled-components'

// Internal imports
import { Button, DateTime, Table } from '@adoptdontshop/components'
import { FeatureFlagService } from '@adoptdontshop/libs/feature-flags/'

// Style definitions
const Container = styled.div`
  padding: 2rem;
`

const Title = styled.h1`
  font-size: 2rem;
  color: #333;
  margin-bottom: 2rem;
`

// Types
type FeatureFlagsProps = Record<string, never>

type FeatureFlag = {
  flag_id: string
  name: string
  enabled: boolean
  description: string
  updated_at: string
  created_at: string
}

export const FeatureFlags: React.FC<FeatureFlagsProps> = () => {
  // State
  const [flags, setFlags] = useState<FeatureFlag[]>([])

  // Effects
  useEffect(() => {
    const loadFlags = async () => {
      const flags = await FeatureFlagService.fetchFeatureFlags()
      setFlags(flags)
    }
    loadFlags()
  }, [])

  // Event handlers
  const toggleFlag = async (flag_id: string, enabled: boolean) => {
    const updatedFlag = await FeatureFlagService.updateFeatureFlag(
      flag_id,
      !enabled,
    )
    setFlags((prevFlags) =>
      prevFlags.map((flag) => (flag.flag_id === flag_id ? updatedFlag : flag)),
    )
  }

  // Render
  return (
    <Container>
      <Title>Feature Flags</Title>
      <Table>
        <thead>
          <tr>
            <th>Flag ID</th>
            <th>Name</th>
            <th>Description</th>
            <th>Created At</th>
            <th>Updated At</th>
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
    </Container>
  )
}
