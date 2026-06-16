# JSON Structure & Retrieval Guide
### `concept_map_for_lesson_generation.json`

This guide is **self-contained**. Everything needed to read, navigate, and generate lessons from
the accompanying JSON file is described here — no other file, document, or folder is required. The
two files in this bundle (`concept_map_for_lesson_generation.json` + this guide) are the complete
package.

This guide describes **structure and access only**. It deliberately shows **no example concept,
topic, phrase, level, or default** — field shapes are illustrated with schematic placeholders
(`<level>`, `<section_code>`, `<phrase>`, …) and the data is characterised by **whole-corpus
statistics**, never by showcased items. See §2 for why.

---

## 1. What this data is (context — one read, then forget)

The JSON is a **single merged, cross-level model of a four-volume reference description of French**.
The four volumes describe what a learner can do and what language they need at four proficiency
levels of the Common European Framework of Reference (CEFR):

| Level | Proficiency |
|-------|-------------|
| **A1** | beginner |
| **A2** | elementary |
| **B1** | intermediate |
| **B2** | upper-intermediate |

Throughout the file these four levels appear as the keys `"A1"`, `"A2"`, `"B1"`, `"B2"` (also called
**books** in field names like `present_in_books`).

Each volume is divided into the same numbered **chapters**, each inventorying a different layer of
language description. This file contains **chapters 1, 2, 3, 4, 5, 6, 8, 9, 10** (chapter 7 is not
part of this dataset):

| Chapter | Layer | What it inventories |
|---------|-------|---------------------|
| **1** | Orientation / meta | How the volume is organised; pointers to other chapters |
| **2** | CEFR descriptors | "Can-do" statements + situations of communication, per level |
| **3** | Communicative functions | Speech acts + their linguistic realisations |
| **4** | General notions | Abstract notions + their realisations |
| **5** | Grammar | Morphology + syntax, expressed as competence statements |
| **6** | Specific lexicon | Concrete vocabulary by theme |
| **8** | Graphic matter | Spelling / orthography: phoneme→grapheme tables, spelling rules |
| **9** | Sociocultural competence | Cultural / intercultural knowledge + attitudes |
| **10** | Learner strategies | Communication + learning strategies |

**Lineage (context only):** per-(volume, chapter) source extractions were merged into a cross-book
*concept map*, denormalised into a *pedagogical view*, then exported here (author/source
attributions removed; quality-assurance scaffolding stripped). Nothing in this bundle depends on
those intermediate files.

The central idea: a **concept** is a *section that recurs across the four volumes*. The merged
concept carries **one canonical name** plus **each volume's verbatim content** side by side, so you
can compare levels or pull a single level's material in one lookup.

---

## 2. The anti-bias contract (read before generating anything)

This dataset exists for **unbiased content generation**. To keep generation unbiased, this guide
gives you **no exemplars to latch onto** and asks you to follow these rules:

1. **Nothing here ranks, scores, recommends, or defaults any item.** Every concept is an equal
   candidate. There is no "canonical" function, "core" topic, or "starter" lesson in this file.
2. **Select by enumeration, not by recall.** To choose material, *iterate the relevant chapter's
   `concepts` dict and select across the full inventory* (see the recipes in §11). Do not generate
   from memory of "typical" beginner topics — generate from what the data actually contains.
3. **Coverage is uneven — always read per level and verify presence.** Only **38.3%** of concepts
   exist at all four levels; **61.7%** are absent from at least one level; **two entire chapters
   (Ch 9, Ch 10) have no concept present at all four levels.** Never assume a concept exists at your
   target level — check `present_in_books` first.
4. **Expect partial / flagged / unnamed items.** ~**5.3%** of concepts are *asterisked* (flagged as
   "expected at this level but specified more fully higher up") and may carry **zero** content at the
   flagging level. ~**7.3%** (all in Ch 9) have a **null** canonical name and must be read through
   other fields. Handle empties and nulls — they are normal, not errors.
5. **`*_per_book` fields are the source of truth, not this guide.** Where a field is `null`/`[]` for
   a level, that content does not exist there. Read the actual values per level.

The population profile in §6 quantifies points 3–4 per chapter. Treat it as the unbiased map of the
territory.

---

## 3. 30-second mental model

```
concept_map_for_lesson_generation.json
├── version, compiled_date, source_* (metadata strings)
├── lesson_gen_notes            ← how the file was built + how to use it
├── chapter_summaries.{ch1…ch10}← per-chapter rollup stats (counts, page ranges)
├── concepts.{ch1…ch10}         ← THE CONTENT. dict of concepts, keyed by section/row id
│     └── each concept: canonical name + per-book content + per-book links
├── level_scope_by_book         ┐
├── cefr_descriptors_by_book    │
├── orthography_rules_by_book   ├ 5 convenience arrays: flat per-level entry-point lists
├── sociocultural_notes_by_book │
├── learner_strategies_by_book  ┘
└── cross_chapter_links         ← flat index of every cross-chapter reference (1408 entries)
```

- **A "concept" lives in `concepts.chN`** and is the unit you build lessons from.
- **Almost every content field is a `*_per_book` dict** keyed `{A1, A2, B1, B2}`, with `null` where
  that level has no such content. **Always read per level** (§2, rule 3).
- **The primary name is `denomination_canonical`** (may be `null`); every level's verbatim wording
  is in `denominations_per_book`.
- **Navigation** uses three mechanisms: per-concept `links_to_concepts_per_book` /
  `linked_from_per_book`, four typed back-reference fields, and the top-level `cross_chapter_links`.

---

## 4. Top-level keys

| Key | Type | Description |
|-----|------|-------------|
| `version` | string | `"lesson-gen-v2"`. |
| `compiled_date` | string | Build date. |
| `source_pedagogical_view_version` / `source_concept_map_version` / `source_registry_version` | string | Provenance tags (informational). |
| `source_chapter_jsons` | array[36] | Names of the 36 source extractions (4 levels × 9 chapters). Informational only — not a runtime dependency. |
| `lesson_gen_notes` | object | Self-description: `purpose`, `derived_from`, `how_to_use`, `added_vs_pedagogical_view`, `kept_stripped_QA`, `deattribution_v2`. |
| `chapter_summaries` | object | One rollup per chapter (`ch1`…`ch10`). See §7. |
| `concepts` | object | The content. Nine buckets `ch1`…`ch10`; each a **dict of concepts**. See §5–§8. |
| `level_scope_by_book` | object | Convenience array (Ch 1 rows) per level. See §9.4. |
| `cefr_descriptors_by_book` | object | Convenience array (Ch 2 rows) per level. See §9.4. |
| `orthography_rules_by_book` | object | Convenience array (Ch 8 rows) per level. See §9.4. |
| `sociocultural_notes_by_book` | object | Convenience array (Ch 9 rows) per level. See §9.4. |
| `learner_strategies_by_book` | object | Convenience array (Ch 10 rows) per level. See §9.4. |
| `cross_chapter_links` | array[1408] | Flat cross-chapter reference index. See §9.3. |

> **What is NOT here.** This deliverable was stripped of quality-assurance scaffolding: **no**
> divergence catalogue, **no** `denomination_mismatch` / `denomination_mismatch_note`, **no**
> `denomination_canonical_source_book`, **no** anomaly lists. The canonical-name model is exactly two
> fields: `denomination_canonical` (the chosen primary name) and `denominations_per_book` (each
> level's verbatim form). When levels word a section differently, the difference is visible in
> `denominations_per_book`, but the file does **not** explain *why* — there is no divergence-reason
> field.

---

## 5. The concept model (common to every chapter)

`concepts.chN` is a **dictionary**. Each **key** is a stable identifier; each **value** is a concept
object.

### 5.1 Keying — how concepts are addressed

| Chapters | Key form | Shape |
|----------|----------|-------|
| **1, 2, 3, 4, 5, 6** (and most of 9) | `section_code` with a **trailing dot** | `"<n>.<n>.<n>."` |
| **8, 10** (and many rows of 2 and 9) | `row_id_canonical` | `"<section_code><slug>"` |

A section code is unique only when a section holds exactly one thing. Chapters 8, 10 (and parts of 2
and 9) have **multiple rows under one section code**, so those rows are keyed by a
`row_id_canonical` = the section code (which already ends in `.`) + a slug. Because the code ends in
`.`, the join produces a **double dot**:

```
section_code "<a>.<b>.<c>."  +  slug "<slug>"   →   row_id "<a>.<b>.<c>..<slug>"
```

Some chapter-9 keys carry a **`":container"`** suffix — these are family/header rows, not leaf
content.

**Rules**
- **Trailing dots are part of the key.** Index with the dot; the bare numeric string will miss.
- Every concept echoes its own `section_code` and (for Ch 1/2/8/9/10) `row_id_canonical` *inside*
  the object, so you can recover the key after iterating over values.
- **The same section code can mean different things in different volumes** in a few chapters (most
  notably Ch 10). The `*_per_book` values and the per-book attribution on links/back-refs keep this
  disambiguated — trust the per-level fields, not the bare code.

### 5.2 Fields present on (almost) every concept

| Field | Type | Meaning |
|-------|------|---------|
| `section_code` | string | The hierarchical dotted code (trailing dot). |
| `chapter` | int | Chapter number (1–10). |
| `kind` | string | `"leaf"` (content item), `"family"` (top-level grouping header), `"container"` (intermediate header), or `"family_with_direct_content"` (a family that also holds content directly). Corpus totals: 1081 leaf / 32 family / 32 container / 5 family_with_direct_content. |
| `family_code` | string | The owning family's code (first two components). |
| `family_denomination_canonical` | string | The family's canonical name. |
| `denomination_canonical` | string \| null | The concept's primary name. **`null`** for ~7.3% of concepts (entirely Ch 9) — read other fields instead. |
| `denominations_per_book` | object | `{A1,A2,B1,B2}` → that level's verbatim title (or `null` if absent there). |
| `present_in_books` / `absent_in_books` | array | Which levels do / do not contain this concept. They partition `["A1","A2","B1","B2"]`. **Check before assuming presence.** |
| `is_asterisked_per_book` | object | Per level: `true` if flagged (knowledge expected at this level but defined more fully at a higher level). |
| `is_container_per_book` | object | Per level: `true` if the item acts as a header/container there. |
| `cross_references_per_book` | object | Per level: raw cross-reference strings. |
| `narrative_note` / `saturation_arc_note` | string \| null | Editorial notes (often `null`). |
| `links_to_concepts_per_book` / `linked_from_per_book` | object | Outgoing / incoming links — §9.1. |
| `row_id_canonical` | string | (Ch 1/2/8/9/10) the row id used as the dict key. |

### 5.3 The canonical / per-book name model

- `denomination_canonical` — the single primary name (may be `null`).
- `denominations_per_book` — `{A1,A2,B1,B2}` verbatim forms; a level's entry is `null` where the
  concept is absent there, and may differ in wording from other levels.
- There is **no field explaining a wording difference.** Observe differences directly across
  `denominations_per_book`; do not expect a reason.

### 5.4 The `_per_book` convention

The majority of content fields are dictionaries shaped:

```json
{ "A1": <value or null>, "A2": <value or null>, "B1": <value or null>, "B2": <value or null> }
```

- `null`/`[]` means **that level does not have this content** — not an error.
- To know whether a concept exists at a level, check `present_in_books`.
- Page-reference fields (`page_ref_per_book`, …) point into the printed source and are for
  traceability only.

---

## 6. Population profile (the unbiased map)

Computed mechanically over **all 1150 concepts**. Use these distributions — not intuition — to
understand how complete/sparse each layer is before generating.

**Whole corpus (1150 concepts):**

| present in all 4 levels | absent from ≥1 level | asterisked (anywhere) | null canonical name |
|---|---|---|---|
| 440 (38.3%) | **710 (61.7%)** | 61 (5.3%) | 84 (7.3%) |

**Per chapter** (`n` = concept count; percentages of that chapter):

| Chapter | n | present-in-all-4 | absent-in-≥1 | asterisked | null-name | leaf / family / container / fwdc |
|---------|---|------------------|--------------|------------|-----------|-----------------------------------|
| ch1 | 24 | 20.8% | 79.2% | 0% | 0% | 24 / 0 / 0 / 0 |
| ch2 | 268 | 6.0% | 94.0% | 0% | 0% | 268 / 0 / 0 / 0 |
| ch3 | 216 | 94.4% | 5.6% | **18.1%** | 0% | 192 / 7 / 17 / 0 |
| ch4 | 78 | **100%** | 0% | 5.1% | 0% | 66 / 6 / 6 / 0 |
| ch5 | 50 | 56.0% | 44.0% | **20.0%** | 0% | 47 / 3 / 0 / 0 |
| ch6 | 108 | 96.3% | 3.7% | 7.4% | 0% | 86 / 15 / 2 / 5 |
| ch8 | 114 | 4.4% | 95.6% | 0% | 0% | 113 / 1 / 0 / 0 |
| ch9 | 108 | 0% | **100%** | 0% | **77.8%** | 101 / 0 / 7 / 0 |
| ch10 | 184 | 0% | **100%** | 0% | 0% | 184 / 0 / 0 / 0 |

Read this as: function (Ch 3), notion (Ch 4) and lexicon (Ch 6) concepts are mostly shared across all
levels; CEFR descriptors (Ch 2), orthography (Ch 8), sociocultural (Ch 9) and strategy (Ch 10)
concepts are mostly level-specific. Asterisks live almost entirely in Ch 3/5/6/4. Null names live
entirely in Ch 9. **Whatever layer you draw from, iterate it and read per level.**

---

## 7. `chapter_summaries`

A compact rollup per chapter. Common fields: `title_canonical`, `title_per_book`, `primitive` (the
row type — §8), per-level counts (`leaf_concept_count_per_book` / `row_count_per_book`,
`families_count_per_book`, `asterisked_concept_count_per_book`,
`distinct_schema_codes_used_count_per_book`), page ranges (`inventory_start_page_per_book`,
`inventory_end_page_per_book`, `chapter_cover_page_per_book`, `page_range_per_book`), and a
`saturation_arc_note`. Each summary also carries a few **chapter-specific** stats (e.g. Ch 8:
`tier_scheme_per_book`, `has_homophones_lexicon_per_book`; Ch 9: `composantes_used_per_book`,
`cultural_competence_stage_per_book`; Ch 10: `four_phase_framework_present_per_book`). Use
`chapter_summaries` to scope a chapter/level before iterating `concepts`.

---

## 8. Per-chapter reference

Every concept shares the universal fields in §5.2. Below: each chapter's `primitive`, its
distinctive fields, and the schematic shape of any nested structure. **No content examples — index a
real key from §11's enumeration recipes to see actual values.**

### 8.1 Ch 1 — Orientation / meta (`primitive: chapter_meta_section_row`)

Describes how a volume is organised and points at other chapters. No realisations. A **source** of
`cross_chapter_links`; carries **no** typed back-references.

| Field (`…_per_book`) | Meaning |
|----------------------|---------|
| `scope_category` | Kind of meta-section (e.g. `"inventory_meta_description"`, `"material_methodology"`, `"contents"`). |
| `pointed_chapters` | Chapter numbers this section directs the reader to. |
| `pointed_section_codes_in_target` | Specific target section codes, when given. |
| `content_summary` | Prose summary of the section's text. |
| `depth` | Heading depth. |
| `is_unnumbered_subheading` | `true` for unnumbered sub-headings. |
| `inline_cross_refs` | Inline reference objects. |
| `page_ref` | Source page. |

### 8.2 Ch 2 — CEFR descriptors (`primitive: cefr_descriptor_row`)

"Can-do" descriptors and situations of communication. **Source** of the
`cefr_descriptors_pointing_to_this` back-reference (§9.2). Keyed by `row_id_canonical` for
multi-criterion rows.

| Field (`…_per_book`) | Meaning |
|----------------------|---------|
| `format_type` | Source rendering. **12 distinct values** in use: `table_simple`, `table_nested_sublevel`, `criterion_table`, `prose_inline`, `prose_competence`, `tableau_n_domain_bullet`, `situation_de_communication_inventory`, `repertoire_discursif_table`, `discourse_repertoire_table`, `b2_typology_borrowed_2col_nested`, `b1_discursive_genre_inventory_table`, `deep_nested_2_3_4`. |
| `competence_component` | e.g. `"linguistic"`, `"sociolinguistic"`, `"pragmatic"`. |
| `composante_sub_heading` | Sub-heading grouping. |
| `activity_modality` | Reception / production / interaction / mediation, where applicable. |
| `criterion_label` | The descriptor's criterion name. |
| `descriptor_text` | **The can-do statement text.** |
| `sub_level_entries` | For volumes that split a level into sub-levels (e.g. A2.1/A2.2, B1.1/B1.2): the per-sub-level entries. |
| `is_pas_de_descripteur` | `true` when the source says "no descriptor available". |
| `situation_theme` / `situation_capabilities` | For situation rows: theme and listed capabilities. |
| `table_label` / `table_number` | Source table identifiers. |
| `cefr_citation` | The CEFR citation string. |
| `learner_strategies_referencing_this_per_book` | Back-refs from Ch 10 (§9.2). |

### 8.3 Ch 3 — Communicative functions (`primitive: inventory_row`)

Speech acts and their linguistic **realisations** (the phrases a learner uses). Carries **all four**
typed back-references (§9.2). Note: 18.1% of Ch 3 concepts are asterisked (the highest share of any
chapter) — an asterisked concept may have **zero** realisations at the flagging level.

| Field | Shape / meaning |
|-------|-----------------|
| `realisations_per_book` | `{<level>` → **list of** `{ "text": "<phrase>", "schema_codes_used": ["<code>", …], "asterisked": <bool>, "notes": "<optional>" }` `}`. The core content. |
| `realisation_count_per_book` | Count per level. |
| `realisations_by_pos_per_book` | When grouped by part of speech, `{<level>` → `{ "<POS>": ["<phrase>", …] } }`; else `null`. |
| `examples_per_book` | `{<level>` → list of `{ "text": "<example>" }` `}` or `null`. Illustrative usage, separate from realisations. |
| `schema_codes_used_per_book` / `schema_codes_used_union` / `schema_codes_unique_count_per_book` | Grammatical category tags (§10). |
| `regional_markers_per_book` | Regional-variant markers, where present. |
| `glosses_per_book` | `{<level>` → short definitional gloss string `}` (present on a handful of mostly family-level concepts). |
| `cefr_descriptors_pointing_to_this_per_book` / `orthography_rules_applying_to_this_per_book` / `sociocultural_notes_referencing_this_per_book` / `learner_strategies_referencing_this_per_book` | The four typed back-refs (§9.2). |

### 8.4 Ch 4 — General notions (`primitive: inventory_row`)

Identical shape to Ch 3 (`realisations_per_book`, `examples_per_book`, `realisation_count_per_book`,
`schema_codes_*`, `glosses_per_book`, all four typed back-refs). Where Ch 3 inventories *what you do
with language*, Ch 4 inventories *abstract notional categories* and the words that express them.
(Coverage note: every Ch 4 concept is present at all four levels.)

### 8.5 Ch 5 — Grammar (`primitive: competence_section`)

Grammar is expressed as **competence statements**, not realisations — there is **no**
`realisations_per_book` here. 20% of Ch 5 concepts are asterisked, and 44% are absent from at least
one level.

| Field (`…_per_book`) | Shape / meaning |
|----------------------|-----------------|
| `competence_statements` | `{<level>` → **list of** `{ "text": "<statement>", "pattern": <…\|null>, "instantiation": <…\|null>, "schema_codes_used": ["<code>", …], "notes": <…\|null> }` `}`. The grammatical knowledge expected at that level. |
| `lead_sentence` | The introductory sentence preceding the statement list. |
| `competence_statement_count` | Count per level. |
| `competence_shape` | A structural tag for the statement block. |
| `coreference_markers_populated` | Whether co-reference markers were used. |
| `glosses_per_book` | Definitional glosses (rare). |
| typed back-refs | All four (§9.2). |

### 8.6 Ch 6 — Specific lexicon (`primitive: inventory_row`)

Concrete thematic vocabulary. Same realisation shape as Ch 3/4, **plus sub-rubrics** (53 of the 108
Ch 6 concepts have them).

| Field | Shape / meaning |
|-------|-----------------|
| `realisations_per_book` / `realisations_by_pos_per_book` | Vocabulary items; Ch 6 frequently groups by part of speech (`{<level>` → `{ "<POS>": ["<word>", …] } }`). Individual realisation objects carry `pos_grouping` and `is_pos_label_first_item`. |
| `sub_rubric_concepts` | **A nested dict keyed by sub-rubric name.** Each sub-rubric is its own mini-concept: `present_in_books`, `absent_in_books`, `schema_codes_used_*`, `realisation_count_per_book`, `realisations_by_pos_per_book`. Use it when a theme is subdivided. |
| `regional_markers_per_book` | Regional-variant markers (Ch 6 uses these more than other chapters). |
| `glosses_per_book` | Definitional glosses. |
| typed back-refs | All four (§9.2). |

### 8.7 Ch 8 — Graphic matter / spelling (`primitive: graphic_matter_row`)

Orthography. Keyed by `row_id_canonical`. **Source** of the `orthography_rules_applying_to_this`
back-reference (its rows point at the grammar/morphology they govern, mostly Ch 5). 95.6% of Ch 8
concepts are level-specific.

| Field (`…_per_book`) | Shape / meaning |
|----------------------|-----------------|
| `subsection_type` | The row type. **7 distinct values:** `phoneme_grapheme_table`, `commentary`, `morphological_rule`, `verb_form_rule`, `gender_homonyms_inventory`, `bibliography`, `introduction`. |
| `phoneme` | The phoneme symbol for phoneme rows. |
| `grapheme_inventory` | `{<level>` → **list of** `{ "tier": "<base\|autre\|…>", "spelling": "<grapheme>", "examples": ["<word>", …], "commentary": <…\|null> }` `}`. The spellings that render a phoneme, tiered by frequency. |
| `rule_text` | Spelling-rule text (`morphological_rule` rows). |
| `example_pairs` | Worked example pairs for a rule. |
| `gender_homonyms_set` | For `gender_homonyms_inventory` rows. |
| `phonetic_transcription` | Phonetic transcriptions (verb-form rows). |
| `verb_form_table` | Verb-conjugation spelling tables. |
| `word_groups` / `process_groups` | Grouped word lists / process groupings for rules. |
| `commentary` | Prose commentary. |
| `page_ref` | Source page. |

**Aggregate concept (one row id `"8.2.aggregate"`):** summarises the homophone lexicon (too large to
inline) via metadata: `homophone_lexicon_count_per_book`, `homophone_letter_coverage_per_book`
(alphabet letters covered), `homophone_page_range_per_book`, `homophone_notation_per_book` (the
notation conventions used). The full homophone word lists are **not** in this file.

> Two rows (`row_id_canonical` `"bibliography"` and `"8.bibliography"`) are end-of-chapter
> bibliography rows whose content was removed for this audience — titles remain, content is empty.
> Skip them for generation.

### 8.8 Ch 9 — Sociocultural competence (`primitive: sociocultural_note_row`)

Cultural / intercultural knowledge and attitudes. Keyed by `row_id_canonical`. **Source** of the
`sociocultural_notes_referencing_this` back-reference: rows attach to the functions (Ch 3/4) and
lexicon (Ch 6) they contextualise, via two id lists. 77.8% of Ch 9 concepts have a **null** canonical
name — read `category_left_col` / `material_right_col` instead.

| Field (`…_per_book`) | Meaning |
|----------------------|---------|
| `composante` | Competence component: `actionnelle`, `ethnolinguistique`, `relationnelle`, `interprétative`, plus volume-specific educational/intercultural labels. |
| `variant_overlay` | Special table-form tag. |
| `category_left_col` | Left-column text (the cultural category / attitude). |
| `material_right_col` | Right-column text (the capability / teaching material). |
| `is_prescriptive` | `true` for prescriptive-strategy rows. |
| `examples` | Example items. |
| `country_columns` | For cross-region comparison tables: per-country columns. |
| `thematic_inventory_bullets` | Bullet lists for thematic-inventory rows. |
| `attachment_concept_ids` | **List of Ch 3/4 section codes this note attaches to** — drives the back-ref into those concepts. |
| `attachment_lexicon_ids` | **List of Ch 6 section codes this note attaches to** — drives the back-ref into lexicon concepts. |
| `cefr_page_ref` / `page_ref` | Source pages. |
| `learner_strategies_referencing_this_per_book` | Back-refs from Ch 10. |

### 8.9 Ch 10 — Learner strategies (`primitive: learner_strategy_row`)

Communication and learning strategies. Keyed by `row_id_canonical`. **Source** of the
`learner_strategies_referencing_this` back-reference. Every Ch 10 concept is level-specific (none
present at all four levels). For many rows `denomination_canonical` is `null` — read
`strategy_label` / `strategy_text`.

| Field (`…_per_book`) | Meaning |
|----------------------|---------|
| `strategy_category` | e.g. `"communication"`, `"apprentissage"`. |
| `strategy_sub_modality` | e.g. `"réception"`, `"production"`, `"interaction"`, `"médiation"`. |
| `cefr_phase` | CEFR strategy phase (planning / execution / evaluation / repair), where tagged. |
| `strategy_label` | Short label. |
| `strategy_text` | **The strategy statement.** |
| `cefr_page_refs` | CEFR citations. |
| `shared_with_books` / `shared_with_books_union` | When a strategy's wording is reused verbatim from another level, the levels it is shared with. |
| `section_title` | The owning section's title. |
| `page_ref` | Source page. |

---

## 9. The linking model

Three ways concepts are connected. Use them together. (Resolving a link target is *navigation* and
is unbiased — it does not select content for you.)

### 9.1 Per-concept links: `links_to_concepts_per_book` & `linked_from_per_book`

Both are `{A1…B2}` dicts of link objects.

- **`links_to_concepts_per_book`** — references this concept *makes* (outgoing), per level.
- **`linked_from_per_book`** — references *made to* this concept (incoming), per level.

Incoming-link object shape:

```json
{
  "type": "<explicit_link | see | see_also | inline_section | inline_chap | …>",
  "source_chapter": <int>,
  "source_section_code": "<section_code>",
  "source_concept_key": "<dict key in concepts.chN>",
  "source_chN_bucket": "<ch2 | ch3 | …>",
  "source_row_id_canonical": "<row id>",
  "raw": "<raw reference string from source>",
  "intra_chapter": <bool>
}
```

Follow an incoming link via `concepts[source_chN_bucket][source_concept_key]`.

### 9.2 The four typed back-references

Pre-computed reverse indexes, populated on the **target** concept (the thing pointed at), per level:

| Field (on target) | Populated on | Source chapter | Answers |
|-------------------|--------------|----------------|---------|
| `cefr_descriptors_pointing_to_this_per_book` | Ch 3/4/5/6 | Ch 2 | "Which can-do descriptors assess this?" |
| `orthography_rules_applying_to_this_per_book` | Ch 3/4/5/6 | Ch 8 | "Which spelling rules govern this?" |
| `sociocultural_notes_referencing_this_per_book` | Ch 3/4/5/6 | Ch 9 | "Which cultural notes contextualise this?" |
| `learner_strategies_referencing_this_per_book` | Ch 2/3/4/5/6/9 | Ch 10 | "Which learner strategies apply here?" |

Each is `{<level>` → **list of** source-reference objects `}`:

```json
{
  "source_row_id_canonical": "<row id>",
  "source_section_code": "<section_code>",
  "source_chapter": <int>,
  "source_variant_or_type": "<…|null>",
  "page_ref": <int>,
  "criterion_label": "<…>"   // present on cefr_descriptors_* entries
}
```

Resolve a source via `concepts["ch"+source_chapter][source_row_id_canonical]` (fall back to
`source_section_code` if the row id is not a key).

### 9.3 Top-level `cross_chapter_links` (the flat index)

An array of **1408** cross-chapter reference records — the global navigation index.

```json
{
  "source": { "chapter": <int>, "section_code": "<code>", "concept_key": "<key>", "chN_bucket": "<chN>" },
  "target": { "chapter": <int>, "section_code": "<code or null>" },
  "type": "<see type vocab below>",
  "present_in_books": ["<level>", …],
  "absent_in_books": ["<level>", …],
  "unresolved": <bool>,
  "raw_sample": "<raw reference string>"
}
```

- `source` carries `concept_key` + `chN_bucket` → jump straight to the source concept.
- `target` carries **only** `chapter` + `section_code`. Resolve it yourself:
  `concepts["ch"+target.chapter][target.section_code]`. **`target.section_code` may be `null`** when
  the reference is to a whole chapter.
- `present_in_books` / `absent_in_books` say which levels actually contain the reference.
- **`unresolved: true` (29 of 1408)** marks a dangling reference whose target section was not found —
  kept verbatim so nothing is silently lost; **skip these when building content.**
- `type` vocabulary with counts: `attachment_lexicon` 403, `explicit_link` 283,
  `learner_strategy_xref` 247, `attachment_concept` 212, `orthography_xref` 110, `see` 57,
  `inline_chap` 53, `inline_section` 23, `see_also`+`see-also` 11, `family_xref` 5,
  `inline_chap_range` 4. (The `attachment_*` / `*_xref` types mirror the typed back-refs in §9.2;
  `see` / `inline_*` / `explicit_link` mirror the per-concept links in §9.1.)

### 9.4 The five convenience arrays (per-level entry points)

Five top-level `{A1…B2}` objects, each → a flat list of compact row summaries: shortcuts into one
chapter's content for one level, for fast enumeration. Each entry carries `section_code`,
`row_id_canonical`, and a few chapter-specific summary fields; follow those keys back into the full
`concepts.chN` object for the complete record.

| Array | Backs | Per-level sizes (A1 / A2 / B1 / B2) |
|-------|-------|--------------------------------------|
| `level_scope_by_book` | Ch 1 | 14 / 14 / 22 / 16 |
| `cefr_descriptors_by_book` | Ch 2 | 125 / 110 / 41 / 77 |
| `orthography_rules_by_book` | Ch 8 | 40 / 40 / 58 / 60 |
| `sociocultural_notes_by_book` | Ch 9 | 24 / 24 / 36 / 59 |
| `learner_strategies_by_book` | Ch 10 | 54 / 82 / 57 / 74 |

---

## 10. Schema codes (grammatical category tags)

Realisation and competence-statement objects carry a `schema_codes_used` array (and each concept a
`schema_codes_used_union`). These are **stable, opaque, self-descriptive snake_case identifiers** for
the grammatical shape of a phrase. The **complete set in use is 43 codes** (listed below — this is
the full inventory, not a selection). The plain-English glosses are *derived from the tag names* (no
glossary ships in the data); treat the codes as category tags — you need not expand them to use the
phrase text.

| Code | Gloss | Code | Gloss |
|------|-------|------|-------|
| `groupe_nominal` | noun group | `proposition` | clause |
| `marker_open_list` | open-list marker (`[…]`) | `marker_alternative` | alternative marker (`/`) |
| `proposition_infinitive` | infinitive clause | `verbe_infinitif` | infinitive verb |
| `adjectif` | adjective | `nom` | noun |
| `groupe_verbal_infinitif` | infinitive verb group | `verbe` | verb |
| `groupe_verbal` | verb group | `infinitif` | infinitive |
| `groupe_prepositionnel` | prepositional group | `adverbe` | adverb |
| `pronom` | pronoun | `nom_categorie_semantique` | semantic-category noun |
| `proposition_interrogative` | interrogative clause | `proposition_subjonctive` | subjunctive clause |
| `proposition_imperative` | imperative clause | `verbe_futur` | future-tense verb |
| `proposition_indicative` | indicative clause | `verbe_imperatif` | imperative verb |
| `negation` | negation | `groupe_nominal_temps` | time noun group |

Remaining codes in use (lower frequency): `proposition_interrogative_indirecte`, `groupe_adjectival`,
`proposition_relative`, `proposition_assertive`, `interrogation`, `proposition_negative`,
`verbe_subjonctif`, `verbe_attributif`, `proposition_conditionnelle`, `verbe_imparfait`,
`participe_passe`, `verbe_passe`, `demonstratif`, `article_defini`, `verbe_infinitif_passe`,
`verbe_indicatif`, `groupe_adverbial`, `preposition`, `relatif`.

The two markers you will meet most when parsing realisation `text`: `marker_open_list` (`[…]` = an
open, extendable list) and `marker_alternative` (`/` = interchangeable alternatives).

---

## 11. Retrieval recipes (enumeration-first)

All paths are into the loaded JSON object (`root`). Addresses use placeholders — substitute keys you
discover by **iterating**, not keys you recall. The first two recipes are the unbiased foundation;
prefer them over any "look up a known item" habit.

**R1 — Enumerate a layer (the default move).** To get candidate material of a given type, iterate the
chapter dict and read per level:
```
for key, c in root.concepts["ch3"].items():        # ch3 functions; ch4 notions; ch6 lexicon; etc.
    if "<level>" in c["present_in_books"]:
        name = c["denomination_canonical"]          # may be null → fall back to other fields
        items = (c.get("realisations_per_book") or {}).get("<level>")   # may be null
```
Select **across the whole iteration**, uniformly — do not stop at the first or a "familiar" one.

**R2 — Filter a layer by a field.** e.g. all concepts present at a level and not asterisked there,
or all Ch 2 rows of a given `format_type`, or all Ch 10 rows of a `strategy_sub_modality`:
```
hits = [c for c in root.concepts["ch3"].values()
        if "<level>" in c["present_in_books"] and not (c["is_asterisked_per_book"] or {}).get("<level>")]
```

**R3 — Resolve a concept by a known section code** (when you already hold a code, e.g. from a link):
```
root.concepts["ch3"]["<section_code>"]              # remember the trailing dot
```

**R4 — Read a function/notion/lexicon item's realisations at a level:**
```
root.concepts["ch3"]["<section_code>"].realisations_per_book["<level>"]
   → [ {text, schema_codes_used, asterisked, notes?}, … ]   (or null if absent at that level)
```

**R5 — Read the grammar expected at a level:**
```
root.concepts["ch5"]["<section_code>"].competence_statements_per_book["<level>"]
   (read lead_sentence_per_book["<level>"] first for framing)
```

**R6 — Read thematic vocabulary, optionally by part of speech / sub-rubric:**
```
root.concepts["ch6"]["<section_code>"].realisations_by_pos_per_book["<level>"]   → { "<POS>": [...] }
root.concepts["ch6"]["<section_code>"].sub_rubric_concepts["<sub_rubric_name>"].realisations_by_pos_per_book["<level>"]
```

**R7 — Which CEFR descriptors assess a concept:**
```
root.concepts["ch3"]["<section_code>"].cefr_descriptors_pointing_to_this_per_book["<level>"]
   → resolve each via root.concepts["ch2"][source_row_id_canonical].descriptor_text_per_book["<level>"]
```

**R8 — Which spelling rules govern a concept:**
```
root.concepts["ch5"]["<section_code>"].orthography_rules_applying_to_this_per_book["<level>"]
   → resolve via root.concepts["ch8"][source_row_id_canonical]
```

**R9 — Cultural context for a concept:**
```
root.concepts["ch3"]["<section_code>"].sociocultural_notes_referencing_this_per_book["<level>"]
   → resolve via root.concepts["ch9"][source_row_id_canonical]  (read category_left_col / material_right_col)
```

**R10 — Learner strategies relevant to a concept:**
```
root.concepts["ch3"]["<section_code>"].learner_strategies_referencing_this_per_book["<level>"]
   → resolve via root.concepts["ch10"][source_row_id_canonical]  (read strategy_text)
```

**R11 — Cross-chapter navigation:** filter `root.cross_chapter_links` by `source.chapter` /
`target.chapter` (skip `unresolved == true`); resolve a target with
`root.concepts["ch"+target.chapter][target.section_code]`.

**R12 — Fast per-level entry:** use a convenience array (§9.4), e.g.
`root.learner_strategies_by_book["<level>"]`, then follow `row_id_canonical` into `concepts.ch10`.

**R13 — Assemble a level-scoped lesson (putting it together, without bias):**
1. **Enumerate** the target layer (R1/R2) and **select uniformly** across the full candidate set —
   do not privilege any topic, family, or position. Confirm your pick is `present_in_books` at the
   level.
2. Core language → `realisations_per_book["<level>"]` (+ `examples_per_book["<level>"]`). If the item
   is asterisked at that level it may be empty — pick another or pull from a higher level
   deliberately.
3. Assessment framing → `cefr_descriptors_pointing_to_this_per_book["<level>"]` → descriptor texts in
   ch2 (R7).
4. Supporting grammar → relevant ch5 `competence_statements_per_book["<level>"]` (R5/R8).
5. Supporting vocabulary → relevant ch6 `realisations_by_pos_per_book["<level>"]` (R6).
6. Cultural notes → `sociocultural_notes_referencing_this_per_book["<level>"]` → ch9 (R9).
7. Strategy hints → `learner_strategies_referencing_this_per_book["<level>"]` → ch10 (R10).
Everything cited is in this one file; no external lookup is required.

---

## 12. Conventions & gotchas (checklist)

- **Read per level.** Most fields are `*_per_book`; `null`/`[]` = *absent at that level*, not an
  error. Confirm with `present_in_books`. Only 38.3% of concepts exist at all four levels.
- **Select by enumeration, not recall** (§2). The data, not intuition, defines what exists.
- **Trailing dots are part of the key** (`"<n>.<n>.<n>."`). Slugged row ids may contain a **double
  dot** (`"<code>..<slug>"`).
- **Two keying schemes.** Ch 1–6 & most of Ch 9 key by `section_code`; Ch 8, Ch 10, and many Ch 2 /
  Ch 9 rows key by `row_id_canonical`. The dict key is always echoed inside the object.
- **`denomination_canonical` can be `null`** (~7.3%, all Ch 9) — fall back to `strategy_label` /
  `strategy_text` (Ch 10) or `category_left_col` / `material_right_col` (Ch 9).
- **Grammar ≠ realisations.** Ch 5 uses `competence_statements_per_book`; it has no
  `realisations_per_book`.
- **Asterisked items (~5.3%, mostly Ch 3/5/6/4) may carry zero content at the flagging level.**
- **The same section code can mean different things across levels** (notably Ch 10). Trust the
  per-level fields and per-level attributions, not the bare code.
- **No reason-for-divergence field exists.** You get the canonical name + each level's verbatim
  wording; differences are visible but unexplained by design.
- **Two Ch 8 bibliography rows are content-empty**; the full homophone lexicon is summarised only as
  metadata in `"8.2.aggregate"`.
- **Skip `cross_chapter_links` where `unresolved == true`** (29 entries) for content.
- **Page references point at the printed source** — traceability only, not in-app content.
- **Orientation counts:** 9 chapters; 1150 concepts
  (ch1 24 / ch2 268 / ch3 216 / ch4 78 / ch5 50 / ch6 108 / ch8 114 / ch9 108 / ch10 184);
  1408 `cross_chapter_links` (29 unresolved); 4 levels.

---

## 13. Appendix — field quick-reference by chapter

Universal (all chapters): `section_code`, `chapter`, `kind`, `family_code`,
`family_denomination_canonical`, `denomination_canonical`, `denominations_per_book`,
`present_in_books`, `absent_in_books`, `is_asterisked_per_book`, `is_container_per_book`,
`cross_references_per_book`, `narrative_note`, `saturation_arc_note`, `links_to_concepts_per_book`,
`linked_from_per_book`, `row_id_canonical` (Ch 1/2/8/9/10).

| Chapter | `primitive` | Distinctive content fields | Typed back-refs present |
|---------|-------------|----------------------------|--------------------------|
| ch1 | `chapter_meta_section_row` | `scope_category`, `pointed_chapters`, `pointed_section_codes_in_target`, `content_summary`, `depth`, `is_unnumbered_subheading`, `inline_cross_refs`, `page_ref` | none |
| ch2 | `cefr_descriptor_row` | `format_type` (12 values), `competence_component`, `composante_sub_heading`, `activity_modality`, `criterion_label`, `descriptor_text`, `sub_level_entries`, `is_pas_de_descripteur`, `situation_theme`, `situation_capabilities`, `table_label`/`table_number`, `cefr_citation`, `domain_b2` | `learner_strategies_referencing_this` |
| ch3 | `inventory_row` | `realisations_per_book`, `examples_per_book`, `realisation_count`, `realisations_by_pos`, `schema_codes_used_*`, `regional_markers`, `glosses` | all four |
| ch4 | `inventory_row` | same as ch3 | all four |
| ch5 | `competence_section` | `competence_statements_per_book`, `lead_sentence`, `competence_statement_count`, `competence_shape`, `coreference_markers_populated`, `glosses`, `schema_codes_used_*` | all four |
| ch6 | `inventory_row` | ch3 fields **+ `sub_rubric_concepts`** + `regional_markers` | all four |
| ch8 | `graphic_matter_row` | `subsection_type` (7 values), `phoneme`, `grapheme_inventory`, `rule_text`, `example_pairs`, `gender_homonyms_set`, `phonetic_transcription`, `verb_form_table`, `word_groups`, `process_groups`, `commentary`, `page_ref`; aggregate `homophone_*` on `"8.2.aggregate"` | none (it is a *source* of `orthography_rules_applying_to_this`) |
| ch9 | `sociocultural_note_row` | `composante`, `variant_overlay`, `category_left_col`, `material_right_col`, `is_prescriptive`, `examples`, `country_columns`, `thematic_inventory_bullets`, `attachment_concept_ids`, `attachment_lexicon_ids`, `cefr_page_ref`, `page_ref` | `learner_strategies_referencing_this` |
| ch10 | `learner_strategy_row` | `strategy_category`, `strategy_sub_modality`, `cefr_phase`, `strategy_label`, `strategy_text`, `cefr_page_refs`, `shared_with_books`/`_union`, `section_title`, `page_ref` | none (it is a *source* of `learner_strategies_referencing_this`) |

**Levels everywhere:** `"A1"`, `"A2"`, `"B1"`, `"B2"`. **Chapters present:** 1, 2, 3, 4, 5, 6, 8, 9, 10.
