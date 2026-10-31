# STUDIA Cloudflare additions (D1-only file storage)

The new GitHub Pages screens call additional Worker endpoints. Extend the existing Worker and redeploy it. Preserve the current /api/register and /api/login handlers and session logic.

## Existing bindings and secrets
- Existing D1 binding: DB
- Existing secret: ADMIN_PASSWORD
- No R2 bucket binding is required. Do not add FILES.

## Protected study-file storage using D1
- POST /api/admin/file-upload — existing admin auth; accept multipart fields file,title,description. Store file bytes in D1 in chunks no larger than 1.5 MiB each; store metadata in study_files and bytes in study_file_chunks.
- GET /api/files — approved-user auth; return only file metadata (id,title,description,original_name,content_type,size_bytes,created_at).
- GET /api/file?id=... — approved-user auth; stream the requested file from D1 after validating the session. Never expose a public storage URL.
- DELETE /api/admin/file-delete — existing admin auth; delete metadata and all chunks for that file.
- Enforce a 20 MiB upload maximum and allow only PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT. Generate opaque UUID IDs; never trust user filenames or client-supplied user IDs.
- For PDF, display in an in-site viewer. For DOCX, render in the page using a document viewer; do not show a download link. Browser-level copying or saving cannot be completely prevented.

D1 limits: each BLOB/row is limited to 2,000,000 bytes, so chunk files below that limit (1.5 MiB recommended). The Free plan has 500 MB maximum per database and 5 GB storage total per account; monitor usage.

## Other required routes
- GET /api/quizzes — approved-user auth; return published quizzes with id,title,description.
- GET /api/quiz?id=... — approved-user auth; return quiz questions/options, never correct answers.
- POST /api/quiz/submit — approved-user auth; accept quizId,answers; calculate score on server and store attempt.
- GET /api/dashboard — return only rows belonging to authenticated user.
- POST /api/dashboard — insert row using authenticated user ID; ignore client user IDs.
- POST /api/dashboard/delete — delete only when row ID and authenticated user ID match.
- POST /api/admin/quiz-add — existing admin auth; create quiz/questions and answer keys.

## Migration
Run schema-additions.sql on the existing D1 database. It only creates new tables and leaves users, sessions, and materials untouched.
