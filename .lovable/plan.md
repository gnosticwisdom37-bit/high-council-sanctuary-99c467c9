## Plan: restore Councillor drafting across Scriptorium and Studio

### Goal
Fix the universal drafting failure showing:

```text
zai-org-glm-4.6: 400 Bad Request
All models in the fallback chain failed
```

This affects AI-assisted drafting only; self-curation/manual writing remains untouched.

### What I will change
1. **Create one shared drafting gateway helper**
   - Add a server-only helper that all Studio/Scriptorium drafting code can use.
   - It will choose the correct gateway from the active provider, call models safely, and report clearer errors.

2. **Sanitize the fallback chain before drafting**
   - Filter out stale/known-bad Venice model IDs such as `zai-org-glm-4.6` for Lovable AI Gateway drafting.
   - Fall back to the current safe default chain when the saved compact chain is unusable:
     - `google/gemini-3-flash-preview`
     - `google/gemini-2.5-flash`
     - `google/gemini-2.5-flash-lite`

3. **Patch all affected Councillor drafting paths**
   - Scriptorium reply drafting.
   - Scriptorium new-letter drafting.
   - Workshop intake drawer promo-card drafting.
   - Studio Blog Archive → Promo Card.
   - Studio New Post.
   - Studio Legal Docket → Milestone Card.
   - Studio Curator source selection.

4. **Improve error messages**
   - Include response body snippets for 400/404/410 failures so future model retirements are diagnosable.
   - Preserve specific credit/rate-limit messages.

5. **Keep the working email send/reply-recipient fix intact**
   - No changes to recipient resolution, sent-folder reply logic, scheduling, or self-curation/manual compose flows.

### Technical notes
- The root cause appears to be the database `provider_compact.fallback_chain` still containing `zai-org-glm-4.6`, which the gateway now rejects with 400.
- I will avoid spending paid credits and keep the Credit Hierarchy Doctrine intact.
- I will not edit generated files such as `src/routeTree.gen.ts` or auto-generated backend integration files.

### Verification
- Confirm all AI draft call sites use the shared safe helper.
- Check the relevant server-function output path so a failed stale Venice model no longer blocks the whole drafting flow.
- If possible, verify one lightweight draft call or inspect logs after implementation.