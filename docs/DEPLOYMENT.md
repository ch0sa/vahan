# GitHub and Vercel release

MoveKA must be deployed only as a fictional hackathon demonstration. It does not support real citizen, vehicle, identity, payment, document, or government information.

## Required services

- A GitHub repository connected to Vercel.
- A dedicated PostgreSQL database. Vercel now provisions external Postgres providers through its Marketplace; Neon is an appropriate free-tier option for this prototype.
- A Vercel project using Node.js and the repository's `pnpm` lockfile.

The release pins both the Neon database and Vercel Functions to Singapore (`sin1`) so application requests do not cross continents before reaching PostgreSQL. Runtime queries use the pooled connection supplied as `DATABASE_URL`; Prisma migration commands prefer Neon's `DATABASE_URL_UNPOOLED` automatically.

## Environment variables

Configure these for the Vercel Production environment:

```text
DATABASE_URL=<provider PostgreSQL connection string>
DEMO_MODE=true
DEMO_SHARED_PASSWORD=admin
SESSION_HASH_KEY=<random base64-encoded 32-byte value>
```

Generate `SESSION_HASH_KEY` locally in PowerShell:

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Do not commit that output. `TOTP_ENCRYPTION_KEY` and `DEMO_OPERATOR_BOOTSTRAP_TOKEN` are needed only if the separate legacy internal-operator enrollment path is deliberately enabled; they are not part of the citizen demo.

## Deployment behavior

Vercel uses `pnpm vercel-build`, configured in `vercel.json`. The command:

1. Generates Prisma Client.
2. Applies committed migrations with `prisma migrate deploy`.
3. Runs the idempotent fictional seed.
4. Produces the Next.js production build.

The seed upserts only the fixed Ananya, Rahul and demo-operator fixtures, the sample vehicle, the default demo workspace, and the versioned demo rule. It does not clear existing journeys.

## Release sequence

1. Run `pnpm verify` locally.
2. Commit the reviewed files and push them to GitHub.
3. Import the repository into Vercel.
4. Add a Postgres integration from the Vercel Marketplace and ensure its connection string is available as `DATABASE_URL`.
5. Add the remaining environment variables above.
6. Deploy and check the build log for successful migrations, seed, and Next.js build.
7. Open the deployed URL in two isolated browser contexts. Sign in as Ananya and Rahul with `admin`, then complete the golden path.

Do not point Preview deployments at the Production database when testing migrations or destructive reset scenarios. Use a separate database or provider-supported database branching.

## Official references

- [Postgres on Vercel](https://vercel.com/docs/postgres)
- [Vercel Marketplace storage](https://vercel.com/docs/marketplace-storage)
- [Deploy Prisma to Vercel](https://www.prisma.io/docs/orm/v6/prisma-client/deployment/serverless/deploy-to-vercel)
