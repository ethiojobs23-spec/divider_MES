# Divider MES

Divider MES is a small, purpose-built Manufacturing Execution System (MES) designed to track and manage production for divider factories. It provides a tablet-friendly Vue.js frontend for operators and a lightweight WordPress-based headless REST API that stores factory data in dedicated SQL tables for ACID-compliant, relational operations.

Key goals

- Capture production events (who, when, what, quantity, waste).
- Track raw material inventory and simple stock levels.
- Record financial transactions related to production (advances, bonuses, expenses, payouts).
- Log machine/line downtime and stoppage events for fast reporting.
- Keep the backend minimal and reliable by using WordPress strictly as a REST framework and dedicated database tables for factory data.

Project structure

- wp-plugin/ — WordPress plugin implementing the headless REST API and custom database schema.
- (frontend) — Vue 3 + Vite tablet application (separate folder or repo; uses the REST API).

Highlights

- Backend: WordPress plugin exposing REST endpoints at `/wp-json/factory/v1/` and managing four custom tables:
  - mes_inventory — raw material stock levels
  - mes_production_logs — production save events (variant matrix)
  - mes_financial_ledger — advances, bonuses, expenses, payouts
  - mes_downtime_logs — stoppage events and durations

- Frontend: Vue 3 + Vite tablet app (uses VITE_API_BASE_URL to target the WordPress REST API) with a minimal UI for operators to record production and stoppages.

Requirements

- PHP >= 8.1
- WordPress >= 6.0
- MySQL/MariaDB supported by WordPress
- Node.js / pnpm or npm for the Vue frontend (see frontend README if present)

Installation (backend plugin)

1. Copy the `wp-plugin/` directory into your WordPress install at:

   `wp-content/plugins/divider-mes/`

2. In WP Admin → Plugins, activate "Divider MES — Factory REST API".
3. On activation the plugin creates the four custom tables and seeds inventory with default materials.

Environment (frontend)

Set your API base URL in the frontend `.env.local`:

VITE_API_BASE_URL=https://your-wordpress-domain.com/wp-json/factory/v1/

Development notes

- The WordPress plugin is intentionally headless: it provides a stable REST surface and keeps all factory data in dedicated tables (no CPTs or wp_postmeta), so data and reporting queries are straightforward and performant.
- The activator class in the plugin includes an upgrade path via dbDelta(); schema changes add columns/indexes without dropping existing data.

Further documentation

See `wp-plugin/README.md` for full details about the plugin schema, installation, uninstall behavior, and table definitions.

Contributing

Contributions are welcome. Open an issue to discuss larger changes before submitting pull requests. Keep changes scoped and include tests or manual verification steps where appropriate.

License

Divider MES — Factory REST API is licensed under GPL-2.0-or-later.
