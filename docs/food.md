# Food and Recipe Book

## Purpose

Food should help make home cooking easier to repeat, not turn Personal Control Center into a calorie tracker, grocery platform, or rigid meal-planning system.

The first useful slice is a **personal recipe book**: a place to keep recipes that are worth trying or making again, preserve practical cooking notes, and make ingredient lists easy to reuse elsewhere in the application.

## Slice 11 — Food v1

**Status: selected as the next implementation slice.**

Food v1 is intentionally recipe-book-first. Meal calendars, prepared-food inventory, nutrition tracking, and broader weekly-routine planning are deferred until real use shows which of them would reduce friction.

### Recipe record

A recipe should support:

- **Name** — required.
- **Ingredients** — multiline plain text, normally written as Markdown-style list lines such as `- garlic` or `- 500 g chicken`.
- **Steps** — multiline cooking instructions; simple numbered or free-form text is enough for v1.
- **Source link** — optional URL to the original website, YouTube video, Instagram post, or other reference.
- **Photo** — optional private user-scoped image. The intended default is often the user's own photo after making the dish rather than automatically sourced catalogue artwork.
- **Servings** — optional.
- **Prep/cooking time** — optional lightweight timing fields or a single practical duration field; exact modelling is not important.
- **Tags** — optional lightweight labels useful for retrieval, such as quick, freezer-friendly, breakfast, chicken, rice, or vegetarian.
- **Rating / make again** — optional personal preference signal.
- **Cooking notes** — optional observations after making it, such as quantity adjustments, substitutions, temperature changes, or what to do differently next time.

### Ingredient workflow

Ingredients are deliberately stored and edited as plain text rather than as a structured grocery database.

Product rules:

- preserve line breaks and leading `- ` list markers;
- do not require a Markdown preview for ingredients;
- provide a **Copy ingredients** action that copies the ingredient block as written;
- copied ingredients should paste cleanly into Notes so a shopping list can be created or refined there;
- do not attempt automatic pantry subtraction, quantity normalisation, unit conversion, or ingredient matching in v1.

### Recipe browsing

The Food space should make saved recipes easy to retrieve on a phone. Reuse proven Library patterns where sensible without copying book-specific complexity.

Useful v1 behaviour:

- compact recipe cards;
- title search;
- optional tag filtering if tags are included in the first implementation;
- clear recipe detail/edit view;
- add, edit, and delete recipes;
- keep all recipe data user-scoped and included in the normal authenticated persistence/export/backup boundary;
- use the existing private upload approach for recipe photos if photos ship in v1.

The first version does not need external recipe metadata services. A source URL is enough.

## Explicit v1 non-goals

Do not make these requirements for the first Food slice:

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
