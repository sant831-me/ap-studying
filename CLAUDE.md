# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

PhysicsOS — a single-file, no-build, client-only web app for AP Physics 1 exam prep (lessons, flashcards, quizzes, an AI tutor chat, conversion practice, FRQ practice, essay grading, etc). Everything — HTML, CSS, JS, and all content data — lives in `index.html` (~4800 lines). There is no backend, no package.json, no bundler, and no test suite.

Repo pushes to GitHub (`sant831-me/ap-studying`); commits are typically just "Update index.html" since the whole app is one file edited directly.

## Development workflow

There is no build step. To work on the app:

- Open `index.html` directly in a browser, or serve it locally (e.g. `python3 -m http.server` from the repo root) and visit the served URL.
- There is no lint, test, or build command — verify changes by loading the page and exercising the relevant feature in-browser.
- Tailwind is loaded via the CDN browser build (`@tailwindcss/browser@4` `<script>` tag), so Tailwind utility classes work directly in markup with no compilation.
- Fonts (Inter, JetBrains Mono) are loaded via a Google Fonts `@import` in the `<style>` block.

## Architecture

Everything is in `index.html`, structured top to bottom as:

1. **`<head>`** — Tailwind CDN script + a `<style>` block defining CSS custom properties (`--bg-primary`, `--accent`, etc.) and component classes (`.card`, `.btn`, `.nav-item`, ...) used throughout the markup.
2. **`<body>`** — a sidebar nav (`#nav`) with one `<button data-page="...">` per feature, and a `<main>` containing one `<section id="page-*">` per page. All sections exist in the DOM simultaneously; navigation just toggles the `hidden` class (see `navigateTo()`).
3. **One big `<script>` block** at the end containing all app logic, organized under `// ============ SECTION ============` banner comments. Grep for `============` to jump between sections (STATE, HELPERS, NAVIGATION, LESSONS, FORMULAS, UNIT CONVERSIONS, FLASHCARDS, FRQ, QUIZ, CHALLENGE, WRONG LOG, FLAGGED, NIGHT BEFORE, POMODORO, SPARK.E AI TUTOR, LIVE LECTURE, DOC & VIDEO AI PROCESSOR, ESSAY GRADER, AUDIO RECAP, INIT).

### Key patterns

- **Single global `state` object** holds all runtime/UI state (streak, xp, flashcard index, quiz progress, pomodoro timer, chat messages, etc). There is no persistence — `state` is not written to `localStorage`, so progress resets on page reload.
- **Content data as top-level `const` arrays/objects**, separate from `state`: `UNITS` (the 8 official AP Physics 1 units, each with `topics`, `apContent`, `deepContent`, `workedExamples`), `LESSON_SUBUNITS`, `FORMULAS`, `FRQS`, `QUIZ_QUESTIONS`, `DEFAULT_FLASHCARDS`, `METRIC_PREFIXES`/`SI_BASE_UNITS`/`CONV_UNITS`/`CONV_PRACTICE_QUESTIONS`, `SPARKE_RESPONSES`, `LECTURE_SCRIPT`, `AUDIO_SCRIPTS`. When adding physics content, extend these data structures rather than hardcoding markup.
- **Page routing**: `navigateTo(page)` shows `#page-{page}` and hides the rest, updates the active nav button, and calls that page's `init`/`render` function (e.g. `renderLessons`, `initFlashcards`, `initQuiz`) — new pages need a `data-page` nav button, a matching `#page-*` section, and a dispatch line in `navigateTo`.
- **`$(id)`** is a shorthand for `document.getElementById(id)`, used everywhere instead of querySelector.
- **`parseMarkdown(text)`** is a hand-rolled Markdown+LaTeX-ish renderer (headers, bullet lists, tables, `**bold**`/`*italic*`/`` `code` ``, and cleanup of `\[ \]`/`\( \)`/`$ $` math delimiters into styled `<code>`/`<div>` blocks) used to render lesson/tutor content into HTML. Reuse it for any new content that needs formatted text rather than writing a second parser.
- **Spark.E AI Tutor** (`sendSparkeMessage`) calls the free, keyless Pollinations.ai endpoint (`https://text.pollinations.ai/openai`, with a GET fallback) directly from the client, and falls back to a canned local response (`generateLocalSparkeResponse`, keyed off keyword matching against `SPARKE_RESPONSES`) if the network call fails or the response is empty. There is no API key and no server proxy — any future AI-backed feature in this app follows the same client-only-call pattern.
- **`init()`** at the bottom seeds `state.flashcards` from `DEFAULT_FLASHCARDS`, then calls `updateDashboard()`, `navigateTo('dashboard')`, `updatePomodoroDisplay()`, and `generateFRQ()` to bring the app to its initial state on load.

### Working in this file

- Because everything is one file, prefer targeted edits (Edit tool) over rewriting large sections. Use the `============` banner comments and `grep -n` to locate the right section before editing.
- Keep new UI consistent with the existing CSS custom properties and `.card`/`.btn`/`.nav-item` classes rather than introducing new styling systems.
- New content (units, formulas, quiz/flashcard questions) should follow the existing object shape for that array so rendering functions (which destructure specific fields) keep working.
