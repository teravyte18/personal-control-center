# Food and Recipe Book

## Purpose

Food should help make home cooking easier to repeat, not turn Personal Control Center into a calorie tracker, grocery platform, or rigid meal-planning system.

The first useful slice is a **personal recipe book**: a place to keep recipes that are worth trying or making again, preserve practical cooking notes, and make ingredient lists easy to reuse elsewhere in the application.

## Slice 11 — Food v1

**Status: implemented in PR #60; pending merge and real-device acceptance.**

Food v1 is intentionally recipe-book-first. Meal calendars, prepared-food inventory, nutrition tracking, and broader weekly-routine planning are deferred until real use shows which of them would reduce friction.

### Implemented recipe record

A recipe supports:

- **Name** — required.
- **Ingredients** — multiline plain text, normally written as Markdown-style list lines such as `- garlic` or `- 500 g chicken`.
- **Steps** — multiline cooking instructions; numbered or free-form text is accepted.
- **Source link** — optional HTTP/HTTPS URL to the original website, YouTube video, Instagram post, or other reference.
- **Photo** — optional private user-scoped image. The intended default is often the user's own photo after making the dish rather than automatically sourced catalogue artwork.
- **Servings** — optional positive integer.
- **Prep and cooking time** — optional practical minute values, with the combined duration shown on recipe cards.
- **Tags** — optional lightweight labels useful for retrieval, such as quick, freezer-friendly, breakfast, chicken, rice, or vegetarian.
- **Rating** — optional 0–10 score in half-point steps.
- **Make again** — optional Yes/No preference signal, with an undecided default.
- **Cooking notes** — optional observations after making it, such as quantity adjustments, substitutions, temperature changes, or what to do differently next time.

### Ingredient workflow

Ingredients are deliberately stored and edited as plain text rather than as a structured grocery database.

Current rules:

- line breaks and leading `- ` list markers are preserved;
- ingredients are not rendered through a Markdown preview;
- **Copy ingredients** copies the ingredient block exactly as stored;
- copied ingredients paste cleanly into Notes so a shopping list can be created or refined there;
- there is no automatic pantry subtraction, quantity normalisation, unit conversion, or ingredient matching.

### Recipe browsing

The Food space is available through All Spaces, desktop navigation, and configurable mobile quick access.

Current behaviour:

- compact photo-first recipe cards;
- title and tag search;
- exact tag filtering;
- rated recipes sort from highest to lowest, followed by unrated recipes in title order;
- full-screen phone-first add/edit view;
- add, edit, and permanent delete;
- optional source-link opening;
- private photo upload, replacement, removal, bounded display optimisation, private caching, and ETag revalidation;
- all structured recipe data remains user-scoped inside the normal authenticated personal-data snapshot, so normal export/import and database backups include it;
- recipe photos live under the existing per-user upload root and therefore follow the normal upload/off-site backup boundary;
- Recipe records reuse the proven note-backed snapshot architecture but are explicitly excluded from the normal Notes view.

The first version has no dependency on external recipe metadata services.

## Persistence and image boundary

Recipe metadata is serialized into active `note` items using a dedicated `__pcc_recipe_v1__` description prefix. This avoids a new schema/table while retaining existing snapshot normalization, account isolation, export/import, and restore behaviour.

Recipe photos are stored separately from Library covers under each user's `recipe-photos` upload directory. Uploads accept JPEG, PNG, WebP, or GIF images up to 10 MB. Display responses are authenticated, resized/converted to a bounded WebP when possible, and use private browser caching rather than public cacheability.

Deleting or replacing a recipe photo removes the superseded upload. If a new upload succeeds but the recipe save fails, the unused new upload is cleaned up.

## Explicit v1 non-goals

The first Food slice does **not** include:

- nutrition or calorie targets;
- automatic nutrition calculation;
- macro tracking or daily intake logging;
- weekly meal calendar;
- automatic meal scheduling;
- "Prep Sunday" batch calculations;
- prepared-meal/fridge/freezer inventory;
- raw pantry or ingredient inventory;
- grocery-list database or automatic shopping-list generation;
- recipe scraping from arbitrary websites or social platforms;
- AI meal generation;
- routines, streaks, or location scheduling.

The recipe book should remain useful even if none of those features are ever added.

## Real-device acceptance for PR #60

Before treating the slice as fully accepted in production, verify on the installed phone:

1. create a recipe with multiline `- item` ingredients, steps, source, optional metadata, and tags;
2. copy ingredients and paste them into a normal Note without losing line breaks or list markers;
3. reopen and edit the recipe, including rating/make-again and cooking notes;
4. search by title and tag, and filter by a tag;
5. open an HTTP/HTTPS source link;
6. upload a photo, confirm it displays after reload, replace it, then remove it;
7. delete a throwaway recipe and confirm it disappears from Food without appearing in Notes;
8. pin Food into mobile quick access and confirm the phone layout remains comfortable.

## Likely follow-ups after real use

### Prepared batches / portions

If batch cooking becomes a recurring workflow, add a lightweight prepared-food view tied to recipes. A batch could record when it was made, portions made, portions remaining, storage location such as fridge/freezer, and an optional use-by date.

This should track **prepared meals**, not every raw ingredient in the home. The feature is deferred until the recipe book is used enough to prove that keeping track of cooked portions is recurring friction.

### Weekly meal planning

A future week view may schedule a recipe, a prepared portion, eating out, or nothing for a meal. It should reflect uncertainty rather than pressure every meal to be planned in advance.

The planner is deliberately deferred because it only becomes valuable when the user's weekly eating pattern is stable enough for advance planning to beat morning-of decisions.

### Prep view

A later prep-oriented view could derive approximate batches or portions needed from an established meal plan. It should not be built before the meal-planning workflow itself proves useful.

### Nutrition

Nutrition is optional future metadata, not a current requirement. If real use creates a reason to add it, start with a small understandable set rather than a full nutrition label — for example calories, protein, fibre, and saturated fat per serving — and keep all values optional.

Do not introduce health scoring, dietary judgement, or daily targets merely because nutrition fields exist.

### Weekly Rhythm / Routines

A broader future **Weekly Rhythm** concept may describe the intended shape of days — for example home, library, café, flexible, meal-prep day, or another recurring context — without becoming a generic streak tracker.

Food could eventually use that context: a day usually spent away from home may be more likely to contain an eating-out meal, while a home day may suit cooking or consuming prepared food. This integration needs separate product design before implementation.

## Relationship to the Personal Advisor

Food can become another explicit opt-in Advisor context domain later. Useful signals may include saved recipes, personal ratings, make-again decisions, cooking notes, and eventually meal/prep state if those features are implemented.

The Advisor should remain suggestion-only and must not silently change recipes, schedule meals, or infer health goals.
