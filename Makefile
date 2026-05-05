.PHONY: staging prod rollback history

# Deploy main to staging (immediate)
staging:
	gh workflow run deploy.yml -f environment=staging

# Deploy main to production (requires approval in GitHub UI)
prod:
	gh workflow run deploy.yml -f environment=production

# Rollback to a previous SHA
# Usage: make rollback env=production sha=abc1234
rollback:
	gh workflow run rollback.yml -f environment=$(env) -f sha=$(sha)

# Show recent commits for rollback target selection
history:
	git log --oneline -20
