# Yappaflow GitHub Organization — Migration & Setup

Plan for moving from a personal GitHub account to a proper Yappaflow organization,
without losing history, issues, or breaking existing CI/deploy hooks.

---

## Decision summary

- **Keep the monorepo.** Move it as one repo to the new org.
- **Add only 1–2 supporting repos** at most: a `.github` repo (org profile) and optionally a separate `yappaflow-infra` repo for AWS Terraform/OpenTofu.
- **Don't split the monorepo by workspace.** That breaks the atomic-commit rule for `@yappaflow/types` schemaVersion changes, and modern serious companies use monorepos anyway.

---

## Phase 1 — Create the Organization

### 1.1 Create the org

- Go to https://github.com/organizations/new
- Plan: **Free** (private repos are free since 2020 — no need for paid plan as a solo dev)
- Org name: `yappaflow`
- Billing email: your Yappaflow business email
- Add yourself as the only owner for now

### 1.2 Configure org-wide settings

**Settings → General:**

- Add logo (favicon-ish, will show on every repo and PR)
- Set description and website (yappaflow.com or whatever the domain is)
- Default branch name: `main`
- Default repository visibility: `private`

**Settings → Authentication security:**

- Require two-factor authentication for everyone in the org

**Settings → Verified domains:**

- Verify `yappaflow.com` (TXT record). Verified domain badge looks legit and unlocks SAML/SSO if you ever need it.

### 1.3 Create the `.github` repo

This is a special repo name that GitHub uses for org-wide config. It hosts your org profile, default issue/PR templates, and reusable workflow templates.

```bash
gh repo create yappaflow/.github --public --clone
cd .github
mkdir -p profile
echo "# Yappaflow\n\nAgency conversations → shippable websites." > profile/README.md
git add . && git commit -m "Initial org profile" && git push
```

The `profile/README.md` shows on `github.com/yappaflow` as the org landing page.

---

## Phase 2 — Migrate the Monorepo

### Option A — Transfer (do this)

GitHub's repository transfer keeps everything: history, issues, PRs, stars, watches, releases, even traffic stats.

1. Go to https://github.com/yusufmirza/yappaflow → **Settings** (bottom of page) → **Transfer ownership**
2. New owner: `yappaflow`
3. Confirm by typing the repo name
4. GitHub creates redirects from the old URL automatically — old `git clone` commands keep working temporarily

### Option B — Fresh push (only if you want zero history)

```bash
gh repo create yappaflow/yappaflow --private
git remote set-url origin git@github.com:yappaflow/yappaflow.git
git push -u origin main --force
```

### After the transfer — update local + downstream

```bash
# Update local remote
cd ~/Projects/Yappaflow
git remote set-url origin git@github.com:yappaflow/yappaflow.git
git remote -v   # verify

# Verify push works
git fetch
```

Things to also update:

- [ ] `package.json` `repository.url` field in monorepo root and every workspace
- [ ] README badges (build status, version, etc.)
- [ ] Any `CODEOWNERS` file path references
- [ ] Vercel project — point at new repo
- [ ] Railway projects — reconnect to new repo
- [ ] Any deploy webhooks pointing at the old URL
- [ ] Cursor / VS Code: re-authenticate to grant access to org repos

---

## Phase 3 — Branch Protection & Security

### 3.1 Branch protection on `main`

**Settings → Branches → Add branch protection rule:**

- Branch name pattern: `main`
- Require a pull request before merging: ✅
  - Required approvals: `0` for now (solo), raise to `1` when team grows
  - Dismiss stale reviews when new commits are pushed: ✅
- Require status checks before merging: ✅
  - Require branches up to date: ✅
  - Add specific checks: `lint`, `typecheck`, `test`, `build` (once CI is set up)
- Require conversation resolution: ✅
- Restrict who can push: leave empty initially
- Allow force pushes: ❌
- Allow deletions: ❌

### 3.2 Security features

**Settings → Code security:**

- Dependabot alerts: ✅
- Dependabot security updates: ✅
- Dependabot version updates: optional, can spam PRs
- Secret scanning: ✅
- Push protection (blocks commits with detected secrets): ✅
- Code scanning (CodeQL): ✅

All free for private repos in an org. Turn them all on.

### 3.3 Org-level security policy

Create `.github/SECURITY.md` (in the `.github` repo):

```markdown
# Security Policy

Report vulnerabilities to: security@yappaflow.com

We aim to respond within 48 hours.
```

---

## Phase 4 — GitHub Actions for Deploys

### 4.1 Org-level secrets vs. AWS OIDC

**Bad way (works but leaks risk):**
- Settings → Secrets → Actions → add `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- Long-lived static keys in GitHub. If a workflow logs them or a bad action exfiltrates, you're toast.

**Good way: AWS OIDC trust**

GitHub Actions can authenticate to AWS without any static keys. AWS issues short-lived creds for each workflow run.

1. In AWS, create an OIDC identity provider for `token.actions.githubusercontent.com`
2. Create an IAM role `github-actions-deploy` with a trust policy that only allows runs from `repo:yappaflow/yappaflow:ref:refs/heads/main`
3. In your workflow:

```yaml
permissions:
  id-token: write
  contents: read

steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::ACCOUNT_ID:role/github-actions-deploy
      aws-region: eu-central-1
```

Set this up before your first deploy. It's harder once you've got static keys everywhere.

### 4.2 Environments

**Settings → Environments → New:**

- `staging` — no protection, auto-deploys from `main`
- `production` — required reviewer (yourself), waits 5 minutes, only deploys from `main` tags

In workflows: `environment: production` makes the job require the env's protection rules.

### 4.3 Workflow strategy for the monorepo

`.github/workflows/` in the monorepo:

```
ci.yml                   # runs on every PR — lint, typecheck, test
deploy-mcp.yml           # paths: 'apps/yappaflow-mcp/**'  → ECS Fargate via Copilot
deploy-builder.yml       # paths: 'apps/builder/**'        → ECS Fargate
deploy-server.yml        # paths: 'server/**'              → ECS Fargate
deploy-web.yml           # paths: 'web/**'                 → ECS Fargate
deploy-types.yml         # paths: 'packages/types/**'      → re-trigger all consumers
```

Use Turbo's `--filter` to rebuild only changed workspaces:

```yaml
- run: npx turbo run build --filter=...[origin/main]
```

This is the "polyrepo benefit" without the polyrepo pain — services deploy independently because their workflows only trigger on relevant path changes.

---

## Phase 5 — Teams & CODEOWNERS

Even as a solo dev, set up teams now so adding hires later is one-click.

### Teams

**Settings → Teams → New team:**

- `core` — admin access, you're the only member
- `engineering` — write access (future engineers)
- `contractors` — triage access for future short-term help

### CODEOWNERS

`.github/CODEOWNERS` in the monorepo:

```
# Default owner — everything not matched below
* @yappaflow/core

# Load-bearing schemas — extra-careful review needed
/packages/types/ @yappaflow/core
/packages/sections/ @yappaflow/core

# Service workspaces
/apps/yappaflow-mcp/ @yappaflow/core
/apps/builder/ @yappaflow/core
/server/ @yappaflow/core
/web/ @yappaflow/core

# Infra
/infra/ @yappaflow/core
/.github/workflows/ @yappaflow/core
```

When `packages/types/**` changes in a PR, GitHub auto-requests review from `@yappaflow/core`.

---

## Phase 6 — Optional: Separate `yappaflow-infra` Repo

Only worth doing if you want **stricter access control on infrastructure changes** than on app code.

### Pros

- Different reviewers for infra vs. app code
- Smaller blast radius for the IAM role that applies infra
- Easier to make public someday (showcases your AWS chops)
- Production secrets / Terraform state references stay out of the main monorepo

### Cons

- Harder to coordinate "deploy code change + matching infra change" atomically — you need to merge in the right order

### Recommendation

Keep `infra/` inside the monorepo for now. Move it out the day you have someone helping with code who shouldn't have prod IAM access.

---

## Phase 7 — Migration Checklist

Run through this in order:

- [ ] **1.** Create `yappaflow` org with business email + 2FA enforced
- [ ] **2.** Verify `yappaflow.com` domain
- [ ] **3.** Create `yappaflow/.github` repo with `profile/README.md`
- [ ] **4.** Transfer `yusufmirza/yappaflow` → `yappaflow/yappaflow`
- [ ] **5.** Update local git remote
- [ ] **6.** Update `package.json` repository URLs across all workspaces
- [ ] **7.** Update README badges
- [ ] **8.** Reconnect Vercel / Railway / AWS deploy hooks
- [ ] **9.** Configure branch protection on `main`
- [ ] **10.** Enable Dependabot, secret scanning, push protection, CodeQL
- [ ] **11.** Set up AWS OIDC identity provider + IAM role for GitHub Actions
- [ ] **12.** Create `staging` and `production` environments
- [ ] **13.** Create `core` / `engineering` teams
- [ ] **14.** Add `CODEOWNERS` to monorepo
- [ ] **15.** Re-authenticate Cursor / VS Code with org access

---

## When to revisit this

- **First hire** → activate the team you already created, raise required PR approvals to 1
- **First enterprise customer asking for SOC 2** → pull infra repo out, restrict access, add audit log review
- **Public packages (yappaflow-ui)** → create separate public repo for that one package only
- **Public docs site** → can stay in monorepo (`apps/yappaflow-ui-docs`) or move out — your call based on deploy cadence

---

**Last updated:** 2026-04-26
**Owner:** Yusuf Mirza
