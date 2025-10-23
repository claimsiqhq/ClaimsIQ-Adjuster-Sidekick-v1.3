# Edge Function Fixes - fnol-extract

## Issues Found and Fixed

The `fnol-extract` edge function had several critical issues that would cause failures when processing FNOL documents.

---

## 🚨 Critical Issue #1: Response Field Mismatch

**Problem**: The client code expects a response field named `extraction`, but the edge function was returning `extracted`.

**Location**: Line 523

**Before**:
```typescript
return new Response(JSON.stringify({
  success: true,
  documentId: payload.documentId,
  claimId: doc.claim_id || payload.claimId,
  extracted,  // ❌ Wrong field name
  workflowGenerated: workflowItems.length > 0
}), ...
```

**After**:
```typescript
return new Response(JSON.stringify({
  success: true,
  documentId: payload.documentId,
  claimId: doc.claim_id || payload.claimId,
  extraction: extracted,  // ✅ Fixed to match client expectation
  workflowGenerated: workflowItems.length > 0
}), ...
```

**Client Code** (`services/documents.ts` line 224):
```typescript
if (data?.extraction) {  // Expects 'extraction'
  const extracted = data.extraction;
  // ... mapping logic
}
```

**Impact**: This would cause the client to not receive the extracted data, making FNOL processing appear to succeed but with no data populated.

---

## 🚨 Critical Issue #2: Database Schema Mismatch for inspection_steps

**Problem**: The edge function was trying to insert records with wrong/missing column names that don't match the actual database schema.

**Location**: Lines 507-516

**Actual Schema** (from `supabase/schema/inspection_steps.sql`):
```sql
CREATE TABLE inspection_steps (
  id UUID PRIMARY KEY,
  claim_id UUID NOT NULL,
  step_order INT NOT NULL,
  title TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('photo', 'scan', 'doc', 'note', 'measure')),  -- REQUIRED
  instructions TEXT,  -- Not 'description'
  status TEXT DEFAULT 'pending',  -- Not 'completed'
  evidence_rules JSONB,
  validation JSONB,
  next_steps TEXT[],
  orig_id TEXT,
  ...
)
```

**Before** (would fail):
```typescript
{
  claim_id: doc.claim_id || payload.claimId,
  step_order: idx + 1,
  title: item.title,
  description: `Generated...`,  // ❌ Column doesn't exist
  completed: false,              // ❌ Column doesn't exist (should be 'status')
  required: true                 // ❌ Column doesn't exist
  // ❌ Missing 'kind' (REQUIRED, NOT NULL)
}
```

**After** (correct):
```typescript
{
  claim_id: doc.claim_id || payload.claimId,
  step_order: idx + 1,
  title: item.title,
  kind: 'photo',                          // ✅ Required field added
  instructions: `Generated from FNOL...`, // ✅ Correct column name
  status: 'pending',                      // ✅ Correct column name
  evidence_rules: { min_count: 1 },       // ✅ Added
  orig_id: `fnol_step_${idx + 1}`        // ✅ Added for tracking
}
```

**Impact**: Database insert would fail with "null value in column 'kind' violates not-null constraint" or "column 'description' does not exist".

---

## ⚠️ Issue #3: Duplicate Claim Update Logic

**Problem**: Both the edge function AND the client code (`services/documents.ts`) were trying to map and update claim fields, creating redundant and potentially conflicting updates.

**Edge Function** (Lines 407-459): Mapped ~15 fields from extraction to claims table
**Client Code** (`services/documents.ts` lines 229-330): Also mapped the same fields

**Solution**: Removed claim update logic from edge function. The client already has comprehensive mapping that:
- Handles creating new claims if needed
- Maps both old and new field name variations
- Has better error handling
- Removes null/undefined values

**After**:
```typescript
// 7) Update document with extracted data
await sb.from("documents").update({
  extracted_data: extracted,
  extraction_status: "completed",
  extraction_error: null,
  extraction_confidence: 0.95
}).eq("id", payload.documentId);

// Note: Claim field mapping is handled by the client (services/documents.ts)
// This keeps the edge function focused on extraction only
```

**Benefits**:
- Single source of truth for claim mapping
- Edge function is simpler and more focused on extraction
- Avoids race conditions or conflicting updates
- Client can handle cases where claim doesn't exist yet

---

## ✅ Enhancement #1: Better Error Handling for Workflow Creation

**Added**: Try-catch around workflow step insertion so extraction doesn't fail if workflow creation has issues.

**Before**:
```typescript
if (workflowItems.length > 0 && (doc.claim_id || payload.claimId)) {
  await sb.from("inspection_steps").insert(...);  // Would fail entire extraction if this fails
}
```

**After**:
```typescript
if (workflowItems.length > 0 && (doc.claim_id || payload.claimId)) {
  try {
    await sb.from("inspection_steps").insert(...);
  } catch (workflowError) {
    // Log but don't fail the entire extraction if workflow creation fails
    console.error("Failed to create initial workflow steps:", workflowError);
  }
}
```

**Benefit**: FNOL extraction succeeds even if workflow generation has issues (e.g., constraint violations, missing claim).

---

## ✅ Enhancement #2: Better HTTP Status Codes

**Problem**: All errors returned `400 Bad Request`, even for server errors.

**Solution**: Added logic to return appropriate status codes:
- `400` for client errors (missing params, invalid data)
- `500` for server errors (OpenAI failures, database errors)

```typescript
// Determine appropriate HTTP status code
const isClientError =
  error.message?.includes("documentId required") ||
  error.message?.includes("Document not found") ||
  error.message?.includes("Failed to fetch PDF");

return new Response(JSON.stringify({
  success: false,
  error: error.message
}), {
  status: isClientError ? 400 : 500,  // ✅ Proper status codes
  headers: { ...CORS, "Content-Type": "application/json" }
});
```

---

## ✅ Enhancement #3: Safer Error Status Updates

**Added**: Try-catch around document status update in error handler to prevent cascading failures.

```typescript
if (payload?.documentId && sb) {
  try {
    await sb.from("documents").update({
      extraction_status: "failed",
      extraction_error: error.message
    }).eq("id", payload.documentId);
  } catch (updateError) {
    console.error("Failed to update document error status:", updateError);
  }
}
```

---

## Summary of Changes

| File | Changes | Impact |
|------|---------|--------|
| `supabase/functions/fnol-extract/index.ts` | Response field name fix | ✅ CRITICAL - Client can now receive extraction data |
| `supabase/functions/fnol-extract/index.ts` | Database schema fix | ✅ CRITICAL - Workflow steps can now be created |
| `supabase/functions/fnol-extract/index.ts` | Remove duplicate claim updates | ✅ Cleaner separation of concerns |
| `supabase/functions/fnol-extract/index.ts` | Better error handling | ✅ More resilient to failures |
| `supabase/functions/fnol-extract/index.ts` | Proper HTTP status codes | ✅ Better API semantics |

---

## Testing the Fixes

### Test 1: Basic FNOL Upload
1. Upload a FNOL PDF
2. ✅ Should extract data successfully
3. ✅ Response should include `extraction` field (not `extracted`)
4. ✅ Document status should be 'completed'

### Test 2: Workflow Generation
1. Upload FNOL with water damage
2. ✅ Should create 4 initial workflow steps
3. ✅ Each step should have:
   - `kind: 'photo'`
   - `status: 'pending'`
   - `instructions` (not description)
   - `evidence_rules`

### Test 3: Claim Population
1. Upload FNOL
2. ✅ Claim fields should be populated by client code
3. ✅ All extracted data mapped correctly
4. ✅ No duplicate/conflicting updates

---

## Deployment

After these fixes, redeploy the edge function:

```bash
supabase functions deploy fnol-extract
```

Monitor the logs for the first few uploads:
```bash
supabase functions logs fnol-extract
```

---

## Files Modified

- ✅ `supabase/functions/fnol-extract/index.ts` - Fixed all critical issues
- ✅ `EDGE_FUNCTION_FIXES.md` - This documentation

---

## Next Steps

1. **Deploy the fixed edge function**
2. **Test with a real FNOL PDF**
3. **Monitor logs** for any remaining issues
4. **Verify workflow steps** are created correctly
5. **Check claim field population** works end-to-end

The edge function should now work correctly with the app!
