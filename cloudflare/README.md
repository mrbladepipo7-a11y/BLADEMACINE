# STUDIA Cloudflare additions

The new GitHub Pages screens call additional Worker endpoints. They remain inactive until the existing Cloudflare Worker is extended and redeployed. Preserve the current /api/register and /api/login handlers and session logic.

## Bindings
- Existing D1 binding: DB
- R2 bucket binding: FILES (connect the bucket you created)
- Existing secret: ADMIN_PASSWORD

## Required routes
- GET /api/quizzes — approved-user auth; return published quizzes with id,title,description.
- GET /api/quiz?id=... — approved-user auth; return quiz questions/options, never correct answers.
- POST /api/quiz/submit — approved-user auth; accept quizId,answers; calculate score on server and store attempt.
- GET /api/dashboard — return only rows belonging to authenticated user.
- POST /api/dashboard — insert row using authenticated user ID; ignore client user IDs.
- POST /api/dashboard/delete — delete only when row ID and authenticated user ID match.
- POST /api/admin/quiz-add — existing admin auth; create quiz/questions and answer keys.
- POST /api/admin/file-upload — existing admin auth; multipart fields file,title,description; store bytes in env.FILES and metadata in D1.

For uploads, enforce a 20 MiB maximum and allow only PDF, DOC/DOCX, PPT/PPTX, XLS/XLSX, TXT. Generate an opaque UUID object key; never trust user filenames. Students must be authenticated before file delivery.

## Migration
Run schema-additions.sql on the existing D1 database. It only creates new tables and leaves users, sessions, and materials untouched.