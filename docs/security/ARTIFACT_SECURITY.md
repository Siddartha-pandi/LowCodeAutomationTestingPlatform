# Artifact & Storage Security — LowCodeAutomationTestingPlatform

## 1. Access Control & Project Isolation

- Every artifact endpoint (`GET /api/v1/artifacts/:id`, `/download`, `/view`, `/verify`) and execution viewport endpoint (`GET /api/v1/executions/:id/viewport`) enforces `JwtAuthGuard` and `ProjectsService.verifyProjectAccess()`.
- Artifacts are never exposed via public static file middleware.

## 2. Path & Symlink Traversal Prevention

- `ArtifactsService.assertWithinStorage()` and `ExecutionsService.resolveSafeViewportPath()` normalize paths with `path.resolve()`, verify `path.relative(storageDir, resolved)` stays inside `storageDir` (for both relative and absolute paths), and resolve `fs.realpathSync()` on both `storageDir` and the target file to reject symlink escapes.
- `ArtifactsService.getArtifactMetadata()` returns a sanitized relative path inside `storageDir` rather than exposing absolute server filesystem paths.

## 3. Safe Retention Purge (`AuditService.purgeRetention`)

- Retention queries exclude `executions` with `status IN ('queued', 'running')` so active execution artifacts and logs are never deleted mid-run.
- Expired artifact files are unlinked from disk only after verifying containment within `storageDir`.
