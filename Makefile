.PHONY: help staging prod rollback watch history

# `make` (or `make help`) lists every target. Each target's `## ` comment is the
# description shown by `help`. Deploy targets dispatch GitHub Actions workflows
# via `gh workflow run` — they return immediately, so use `make watch` to follow
# the run. See README "Deployment" for the gh prerequisites.
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help

staging: ## Deploy main to staging (runs immediately)
	gh workflow run deploy.yml -f environment=staging

prod: ## Deploy main to production (requires approval in the GitHub UI)
	gh workflow run deploy.yml -f environment=production

rollback: ## Roll an env back to a SHA — usage: make rollback env=production sha=abc1234
	gh workflow run rollback.yml -f environment=$(env) -f sha=$(sha)

watch: ## Stream the most recent deploy.yml run to the terminal
	gh run watch $$(gh run list --workflow=deploy.yml -L 1 --json databaseId -q '.[0].databaseId')

history: ## List recent commits to pick a rollback target
	git log --oneline -20
