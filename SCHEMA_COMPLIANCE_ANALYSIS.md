# Database Schema Compliance Analysis

## 🔍 Comparing Actual Database vs Application Code

### ✅ Tables Present (All Required)
- app_prompts ✓
- app_settings ✓
- claims ✓
- documents ✓
- media ✓
- profiles ✓
- routes ✓
- stops ✓

---

## ❌ Issues Found

### 1. **media table - Missing `updated_at` column**

**Database has:**
```sql
created_at timestamp with time zone NOT NULL DEFAULT now()
-- NO updated_at column!
```

**App expects** (from media.sql line 10):
```sql
updated_at timestamptz not null default now()
```

**Used in:**
- `services/offline.ts` - sync logic uses `updated_at`
- `services/sync.ts` - conflict resolution uses `updated_at`

---

### 2. **media table - Missing `derived` column**

**Database:** Column not present

**App schema defines** (media.sql line 30):
```sql
derived jsonb null  -- Derived/computed data
```

**Impact:** Low - column defined but not currently used

---

### 3. **media table - Missing update trigger**

**Database:** No `set_updated_at_media` trigger visible

**App expects** (media.sql lines 44-55):
```sql
create trigger set_updated_at_media
  before update on public.media
  for each row execute function public.set_updated_at_media();
```

---

### 4. **documents table - Incomplete array type**

**Database has:**
```sql
tags ARRAY  -- ❌ Missing element type
```

**Should be:**
```sql
tags TEXT[]  -- ✅ Properly typed array
```

---

### 5. **routes table - Incomplete array type**

**Database has:**
```sql
optimized_order ARRAY NOT NULL  -- ❌ Missing element type
```

**Should be:**
```sql
optimized_order TEXT[] NOT NULL  -- ✅ For claim IDs
```

**Used in:**
- `services/routing.ts` line 186: `optimized_order: route.stops.map(s => s.claimId)`

---

### 6. **documents table - Missing precision on extraction_confidence**

**Database has:**
```sql
extraction_confidence numeric
```

**Should be:**
```sql
extraction_confidence numeric(3,2)  -- For values 0.00 to 1.00
```

---

### 7. **documents table - Missing ON DELETE CASCADE**

**Database has:**
```sql
CONSTRAINT documents_claim_id_fkey FOREIGN KEY (claim_id) REFERENCES public.claims(id)
```

**Should have:**
```sql
CONSTRAINT documents_claim_id_fkey FOREIGN KEY (claim_id) REFERENCES public.claims(id) ON DELETE CASCADE
```

**Impact:** Orphaned documents when claims deleted

---

### 8. **media table - Missing ON DELETE SET NULL**

**Database has:**
```sql
CONSTRAINT media_claim_id_fkey FOREIGN KEY (claim_id) REFERENCES public.claims(id)
```

**App schema defines** (claims.sql lines 72-82):
```sql
CONSTRAINT media_claim_id_fkey FOREIGN KEY (claim_id) REFERENCES public.claims(id) ON DELETE SET NULL
```

**Impact:** Can't delete claims that have media

---

## ✅ GOOD NEWS - Everything Else Matches!

- All claims extended columns present ✓
- All FNOL fields present ✓
- Routes and stops tables correct ✓
- Foreign keys exist ✓
- Constraints correct ✓
- All other columns match ✓

