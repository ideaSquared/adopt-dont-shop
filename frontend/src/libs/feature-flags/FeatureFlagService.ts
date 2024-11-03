const API_URL = 'http://localhost:5000/api' // Base API URL

const fetchFeatureFlags = async () => {
  const response = await fetch(`${API_URL}/feature-flags/`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  })
  return response.json()
}

const fetchFeatureFlagByName = async (flagName: string): Promise<boolean> => {
  const response = await fetch(`${API_URL}/feature-flags/${flagName}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  })

  if (!response.ok) {
    console.error(
      `Failed to fetch feature flag ${flagName}:`,
      response.statusText,
    )
    return false // Default to false if the fetch fails
  }

  const flag = await response.json()
  console.log(`Fetched feature flag ${flagName}:`, flag)

  // Assuming the response contains { name: "chat_beta", enabled: true }
  return flag.enabled
}

const updateFeatureFlag = async (flag_id: string, enabled: boolean) => {
  const response = await fetch(`${API_URL}/feature-flags/`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    body: JSON.stringify({ flag_id, enabled }),
  })
  return response.json()
}

export default {
  fetchFeatureFlags,
  updateFeatureFlag,
  fetchFeatureFlagByName,
}
