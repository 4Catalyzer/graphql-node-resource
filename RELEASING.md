# Releasing

Package publication, tagging, and pushing are separate maintainer actions performed only after a reviewed release pull request has merged. Never publish from the pull request branch.

## Prepare the release pull request

1. Start from the latest `master` branch and create a release branch.
2. Use Node.js 24 with Corepack and the Yarn 4 version declared in `package.json`.

   ```sh
   node --version
   corepack enable
   yarn --version
   ```

3. Update the package version and add the public release notes to `CHANGELOG.md`. The changelog comparison link should end at the matching `vX.Y.Z` tag.
4. Install and validate without changing the lockfile.

   ```sh
   yarn install --immutable
   yarn test
   yarn build
   npm pack --dry-run
   ```

5. Inspect the package file list. It must include the compiled runtime JavaScript, TypeScript declarations, `CHANGELOG.md`, and `LICENSE`, and must not include development-only source or credentials.
6. Open the pull request for review and merge it through the normal GitHub review process. Do not publish, tag, or push a release as part of the pull request.

## Publish after merge

These steps are for an authorized maintainer after the release pull request has merged.

1. Check out the exact merged commit on `master`, confirm the worktree is clean, and repeat the immutable install, tests, build, and package inspection with Node.js 24.
2. Confirm the npm account has publish permission for `@4c/graphql-node-resource` and satisfies the package or organization 2FA policy. Keep access tokens and one-time codes out of shell history, logs, and repository files.
3. Publish the merged commit manually with the stable distribution tag.

   ```sh
   npm publish --access public --tag latest
   ```

4. Record the exact published commit, then verify the registry version and distribution tags.

   ```sh
   git rev-parse HEAD
   npm view @4c/graphql-node-resource version dist-tags --json
   ```

## Tag and create the GitHub Release

Only after npm publication succeeds:

1. Create an annotated `vX.Y.Z` tag on the exact commit reported by `git rev-parse HEAD`.

   ```sh
   git tag --annotate vX.Y.Z --message "vX.Y.Z" <published-commit>
   ```

2. Push that tag as a separate maintainer action.

   ```sh
   git push origin vX.Y.Z
   ```

3. Create a GitHub Release from `vX.Y.Z`. Use the version as the title and copy the matching public section from `CHANGELOG.md` into the release notes.

## Verify a consumer install

Create a temporary project with Node.js 24, install the exact released version and its peer dependencies, and verify that the ESM entry point loads.

```sh
npm init --yes
npm install @4c/graphql-node-resource@X.Y.Z graphql graphql-relay
node --input-type=module --eval "const packageExports = await import('@4c/graphql-node-resource'); console.log(Object.keys(packageExports))"
```

Recheck `npm view @4c/graphql-node-resource version dist-tags --json` and confirm that `latest` points to the released version.
