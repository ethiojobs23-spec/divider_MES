# Divider MES — WordPress Plugin (`wp-plugin/`)

## Overview

This directory contains the **WordPress headless REST API plugin** that serves as the backend for the Divider MES Vue.js tablet application.

WordPress is used **strictly as a REST framework** — no frontend themes, no CPTs, no `wp_postmeta`. All factory data is stored in four dedicated custom SQL tables for ACID compliance, relational integrity, and maximum query speed.

---

## Plugin Details

| Field | Value |
|---|---|
| **Plugin Name** | Divider MES — Factory REST API |
| **PHP Requirement** | ≥ 8.1 |
| **WP Requirement** | ≥ 6.0 |
| **REST Namespace** | `/wp-json/factory/v1/` |
| **License** | GPL-2.0-or-later |

---

## Directory Structure

```
wp-plugin/
├── divider-mes.php          # Main plugin bootstrap (constants, hooks)
├── uninstall.php            # DROP tables + delete options on plugin delete
└── includes/
    └── class-mes-activator.php   # dbDelta() schema provisioner
```

---

## Custom Database Tables

All tables use `{$wpdb->prefix}` dynamically and the active WP charset/collate.

### `{prefix}mes_inventory`
Raw material stock levels.

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGINT UNSIGNED` AUTO_INCREMENT PK | |
| `material_name` | `VARCHAR(100)` | Wire, Chaf, Shibo, Glue Stucko… |
| `stock_level` | `DECIMAL(10,2)` | Fractional quantities (e.g. 14.75 kg) |
| `unit` | `VARCHAR(20)` | meters / kg / pieces / rolls |
| `last_updated` | `DATETIME` | Auto-updated on every write |

### `{prefix}mes_production_logs`
The variant matrix fact table — one row per production save event.

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGINT UNSIGNED` AUTO_INCREMENT PK | |
| `operator_name` | `VARCHAR(50)` | Indexed |
| `production_date` | `DATE` | Indexed (+ composite with divider_type) |
| `divider_type` | `TINYINT UNSIGNED` | 50 \| 40 \| 30 \| 16 \| 12 \| 45 |
| `placement_style` | `VARCHAR(50)` | ብተና \| ውስጥ \| የተለየ (utf8mb4) |
| `size_cm` | `TINYINT UNSIGNED` | 9 or 7 |
| `qty_produced` | `MEDIUMINT UNSIGNED` | |
| `qty_waste` | `MEDIUMINT UNSIGNED` | |
| `created_at` | `DATETIME` | Auto-set on INSERT |

**Indexes:** `operator_name`, `production_date`, `divider_type`, composite `(production_date, divider_type)`

### `{prefix}mes_financial_ledger`
Single ledger for advances, bonuses, expenses, and payouts.

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGINT UNSIGNED` AUTO_INCREMENT PK | |
| `target_name` | `VARCHAR(50)` | Employee name or "Company" |
| `transaction_type` | `VARCHAR(20)` | `advance` \| `bonus` \| `expense` \| `payout` |
| `amount` | `DECIMAL(10,2)` | ETB |
| `transaction_date` | `DATE` | Indexed |
| `notes` | `TEXT` | Nullable |
| `created_at` | `DATETIME` | Auto-set on INSERT |

**Indexes:** `target_name`, `transaction_date`, `transaction_type`, composite `(target_name, transaction_date)`

### `{prefix}mes_downtime_logs`
Machine / line stoppage events.

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGINT UNSIGNED` AUTO_INCREMENT PK | |
| `issue_category` | `VARCHAR(50)` | Machine Breakdown \| Power Failure… |
| `operator_name` | `VARCHAR(50)` | Who flagged the stoppage |
| `start_time` | `DATETIME` | Set on FLAG |
| `end_time` | `DATETIME NULL` | NULL = stoppage active |
| `duration_minutes` | `INT NULL` | Denormalised for fast SUM |
| `resolution_notes` | `TEXT` | |
| `resolved_by` | `VARCHAR(50)` | Supervisor name |
| `created_at` | `DATETIME` | Auto-set on INSERT |

**Indexes:** `issue_category`, `start_time`, `end_time` (for "active stoppages" query)

---

## Installation

1. Copy the `wp-plugin/` directory into your WordPress install at:
   ```
   wp-content/plugins/divider-mes/
   ```
2. In WP Admin → Plugins, activate **Divider MES — Factory REST API**.
3. On activation, all four tables are created and the inventory is seeded with default materials.

### Environment Variables (Vue.js frontend)

Set in your `.env.local`:
```env
VITE_API_BASE_URL=https://your-wordpress-domain.com/wp-json/factory/v1/
```

---

## Schema Upgrades

The activator class implements `maybe_upgrade()` wired to `plugins_loaded`. When you bump `MES_Activator::DB_VERSION`:

1. The stored `mes_db_version` option is compared to the class constant.
2. If behind, `create_tables()` runs again via `dbDelta()`.
3. `dbDelta()` **adds** new columns/indexes but never drops existing ones — safe on live data.

---

## Uninstall

Clicking **Delete** in WP Admin → Plugins triggers `uninstall.php` which:
- Drops all four `mes_*` tables
- Deletes all `mes_*` options
- Clears scheduled cron hooks

> ⚠️ **This is irreversible.** Export your data before uninstalling.
