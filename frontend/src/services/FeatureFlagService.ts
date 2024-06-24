// featureFlagService.ts
import featureFlags from './featureFlags.json';

class FeatureFlagService {
	private flags: { [key: string]: boolean };

	constructor() {
		this.flags = featureFlags;
	}

	isFeatureEnabled(feature: string): boolean {
		return !!this.flags[feature];
	}
}

const featureFlagService = new FeatureFlagService();
export default featureFlagService;
