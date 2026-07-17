<?php
/**
 * MES Activator — Database Schema Provisioner
 *
 * Responsible for creating all four dedicated custom SQL tables upon plugin
 * activation. This class deliberately bypasses Custom Post Types and
 * wp_postmeta in favour of normalised, ACID-compliant, relational tables
 * that can be queried with full SQL expressiveness.
 *
 * @package DividerMES
 * @subpackage DividerMES/includes
 * @since 1.0.0
 */

// Prevent direct file access.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class MES_Activator
 *
 * Called statically from the main plugin file's `register_activation_hook`
 * callback. All table creation is idempotent — running it multiple times
 * (e.g. on plugin update or re-activation) safely alters existing tables
 * rather than dropping and recreating them, because `dbDelta()` is used
 * exclusively.
 *
 * Table naming convention:  {$wpdb->prefix}mes_{entity}
 *
 * Tables created:
 *   - {prefix}mes_inventory
 *   - {prefix}mes_production_logs
 *   - {prefix}mes_financial_ledger
 *   - {prefix}mes_downtime_logs
 */
class MES_Activator {

	/**
	 * Plugin database schema version stored in wp_options.
	 * Increment this string whenever the schema changes so the upgrade
	 * routine can detect and apply structural deltas on existing installs.
	 *
	 * @var string
	 */
	const DB_VERSION = '1.0.0';

	/**
	 * wp_options key used to persist the installed schema version.
	 *
	 * @var string
	 */
	const DB_VERSION_OPTION = 'mes_db_version';

	// ──────────────────────────────────────────────────────────────────────
	// Public entry point
	// ──────────────────────────────────────────────────────────────────────

	/**
	 * Plugin activation hook callback.
	 *
	 * Bootstraps the schema creation sequence, records the installed version,
	 * and flushes rewrite rules so any registered REST routes are immediately
	 * available.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public static function activate(): void {
		self::create_tables();
		self::record_db_version();
		self::seed_default_inventory();
		flush_rewrite_rules();
	}

	// ──────────────────────────────────────────────────────────────────────
	// Schema creation
	// ──────────────────────────────────────────────────────────────────────

	/**
	 * Execute all CREATE TABLE statements via dbDelta().
	 *
	 * dbDelta() is the WordPress-approved mechanism for schema management.
	 * It will:
	 *   - Create the table if it does not exist.
	 *   - Add any missing columns to an existing table.
	 *   - Add any missing indexes.
	 * It will NOT drop columns or indexes from an existing table, which
	 * makes it safe to run on live databases during upgrades.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	private static function create_tables(): void {
		global $wpdb;

		/*
		 * dbDelta() requires upgrade.php which is not loaded on the front-end.
		 * Always include it here before calling dbDelta().
		 */
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		/*
		 * Retrieve the active charset/collate string from the $wpdb object.
		 * This respects the WordPress installation's database configuration
		 * (e.g. utf8mb4_unicode_ci) and must be appended to every table.
		 */
		$charset_collate = $wpdb->get_charset_collate();

		// Run each DDL statement through dbDelta individually.
		// Grouping all statements into one dbDelta() call can cause silent
		// failures on some MySQL/MariaDB configurations.
		dbDelta( self::sql_mes_inventory( $wpdb->prefix, $charset_collate ) );
		dbDelta( self::sql_mes_production_logs( $wpdb->prefix, $charset_collate ) );
		dbDelta( self::sql_mes_financial_ledger( $wpdb->prefix, $charset_collate ) );
		dbDelta( self::sql_mes_downtime_logs( $wpdb->prefix, $charset_collate ) );
	}

	// ──────────────────────────────────────────────────────────────────────
	// Table DDL definitions
	// ──────────────────────────────────────────────────────────────────────

	/**
	 * DDL: mes_inventory — Raw Materials Stock Ledger
	 *
	 * Tracks current on-hand quantity for every raw material used on the
	 * factory floor (Wire, Chaf, Shibo, Glue Stucko, etc.).  `stock_level`
	 * uses DECIMAL(10,2) to store fractional quantities such as 14.75 kg.
	 *
	 * Critical dbDelta() formatting rules applied:
	 *   - Two spaces between the column name and its type.
	 *   - PRIMARY KEY definition on its own line with two spaces indent.
	 *   - No trailing comma after the last column definition before PRIMARY KEY.
	 *
	 * @param string $prefix          WordPress table prefix.
	 * @param string $charset_collate Charset/collate string from $wpdb.
	 * @return string SQL CREATE TABLE statement.
	 */
	private static function sql_mes_inventory( string $prefix, string $charset_collate ): string {
		$table = $prefix . 'mes_inventory';

		return "CREATE TABLE {$table} (
  id            bigint(20)    UNSIGNED NOT NULL AUTO_INCREMENT,
  material_name varchar(100)  NOT NULL DEFAULT '',
  stock_level   decimal(10,2) NOT NULL DEFAULT 0.00,
  unit          varchar(20)   NOT NULL DEFAULT '',
  last_updated  datetime      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY  (id),
  KEY idx_material_name (material_name)
) {$charset_collate};";
	}

	/**
	 * DDL: mes_production_logs — Variant Matrix Production Ledger
	 *
	 * The central fact table for all production events. Every save action
	 * on the tablet (operator + divider type + placement + size + quantities)
	 * inserts one row here. This gives full audit history and enables
	 * GROUP BY aggregations for payroll, quality, and analytics.
	 *
	 * Column constraints:
	 *   - `divider_type`   — factory uses only 50, 40, 30, 16, 12, 45 mm.
	 *     Enforced at application layer; stored as TINYINT UNSIGNED for
	 *     space efficiency (max value 127 fits all valid types).
	 *   - `placement_style`— Amharic values (ብተና / ውስጥ / የተለየ) stored
	 *     as-is; utf8mb4 charset handles the multi-byte characters correctly.
	 *   - `size_cm`        — strictly 9 or 7 cm; enforced at app layer,
	 *     stored as TINYINT UNSIGNED.
	 *   - `qty_produced`, `qty_waste` — MEDIUMINT UNSIGNED sufficient for
	 *     a full day's factory output (max ~16 million per row).
	 *
	 * Composite index on (production_date, divider_type) supports the most
	 * common weekly-aggregation query pattern.
	 *
	 * @param string $prefix          WordPress table prefix.
	 * @param string $charset_collate Charset/collate string from $wpdb.
	 * @return string SQL CREATE TABLE statement.
	 */
	private static function sql_mes_production_logs( string $prefix, string $charset_collate ): string {
		$table = $prefix . 'mes_production_logs';

		return "CREATE TABLE {$table} (
  id              bigint(20)       UNSIGNED NOT NULL AUTO_INCREMENT,
  operator_name   varchar(50)      NOT NULL DEFAULT '',
  production_date date             NOT NULL,
  divider_type    tinyint(3)       UNSIGNED NOT NULL DEFAULT 0 COMMENT '50|40|30|16|12|45',
  placement_style varchar(50)      NOT NULL DEFAULT '' COMMENT 'Amharic: ብተና|ውስጥ|የተለየ',
  size_cm         tinyint(2)       UNSIGNED NOT NULL DEFAULT 0 COMMENT '9 or 7',
  qty_produced    mediumint(8)     UNSIGNED NOT NULL DEFAULT 0,
  qty_waste       mediumint(8)     UNSIGNED NOT NULL DEFAULT 0,
  created_at      datetime         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY  (id),
  KEY idx_operator_name   (operator_name),
  KEY idx_production_date (production_date),
  KEY idx_divider_type    (divider_type),
  KEY idx_date_type       (production_date, divider_type)
) {$charset_collate};";
	}

	/**
	 * DDL: mes_financial_ledger — Advances, Payroll, Bonuses, Expenses
	 *
	 * A single flexible ledger table covering all monetary movements:
	 *   - 'advance'  — cash advance issued to an employee
	 *   - 'bonus'    — performance-related bonus
	 *   - 'expense'  — factory expense not tied to a person
	 *   - 'payout'   — final weekly piece-rate settlement
	 *
	 * Using a single table with a `transaction_type` discriminator column
	 * (rather than four separate tables) keeps financial queries simple:
	 * SUM(amount) WHERE transaction_type IN (...) for any balance sheet.
	 *
	 * `target_name` holds the employee name or 'Company' for general expenses.
	 * Future: add a FK to a `mes_operators` table when operator management
	 * is migrated to the backend.
	 *
	 * @param string $prefix          WordPress table prefix.
	 * @param string $charset_collate Charset/collate string from $wpdb.
	 * @return string SQL CREATE TABLE statement.
	 */
	private static function sql_mes_financial_ledger( string $prefix, string $charset_collate ): string {
		$table = $prefix . 'mes_financial_ledger';

		return "CREATE TABLE {$table} (
  id               bigint(20)    UNSIGNED NOT NULL AUTO_INCREMENT,
  target_name      varchar(50)   NOT NULL DEFAULT '' COMMENT 'Employee name or Company',
  transaction_type varchar(20)   NOT NULL DEFAULT '' COMMENT 'advance|bonus|expense|payout',
  amount           decimal(10,2) NOT NULL DEFAULT 0.00,
  transaction_date date          NOT NULL,
  notes            text,
  created_at       datetime      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY  (id),
  KEY idx_target_name      (target_name),
  KEY idx_transaction_date (transaction_date),
  KEY idx_type             (transaction_type),
  KEY idx_target_date      (target_name, transaction_date)
) {$charset_collate};";
	}

	/**
	 * DDL: mes_downtime_logs — Machine / Line Stoppages
	 *
	 * Records every production interruption from the moment an operator
	 * flags a stoppage to the moment a supervisor resolves it.
	 *
	 * `end_time` and `duration_minutes` are nullable because the row is
	 * written at FLAG time (start_time) and updated at RESOLVE time.
	 *
	 * `duration_minutes` is denormalised (it could be derived from
	 * start_time/end_time) but is stored explicitly for fast aggregation
	 * queries (SUM(duration_minutes) for weekly efficiency reports).
	 *
	 * `issue_category` maps to the tablet dropdown categories:
	 *   Machine Breakdown | Material Shortage | Power Failure |
	 *   Operator Absence  | Quality Issue     | Other
	 *
	 * @param string $prefix          WordPress table prefix.
	 * @param string $charset_collate Charset/collate string from $wpdb.
	 * @return string SQL CREATE TABLE statement.
	 */
	private static function sql_mes_downtime_logs( string $prefix, string $charset_collate ): string {
		$table = $prefix . 'mes_downtime_logs';

		return "CREATE TABLE {$table} (
  id                 bigint(20)   UNSIGNED NOT NULL AUTO_INCREMENT,
  issue_category     varchar(50)  NOT NULL DEFAULT '',
  operator_name      varchar(50)  NOT NULL DEFAULT '' COMMENT 'Who flagged the stoppage',
  start_time         datetime     NOT NULL,
  end_time           datetime     DEFAULT NULL COMMENT 'NULL = stoppage still active',
  duration_minutes   int(11)      DEFAULT NULL COMMENT 'Denormalised for fast SUM queries',
  resolution_notes   text,
  resolved_by        varchar(50)  NOT NULL DEFAULT '' COMMENT 'Supervisor who resolved it',
  created_at         datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY  (id),
  KEY idx_issue_category (issue_category),
  KEY idx_start_time     (start_time),
  KEY idx_active         (end_time)
) {$charset_collate};";
	}

	// ──────────────────────────────────────────────────────────────────────
	// Post-activation helpers
	// ──────────────────────────────────────────────────────────────────────

	/**
	 * Persist the current schema version to wp_options.
	 *
	 * Stored under `mes_db_version`. The plugin's update routine compares
	 * this value against the class constant to decide whether to run dbDelta()
	 * again on plugin update.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	private static function record_db_version(): void {
		$installed = get_option( self::DB_VERSION_OPTION );

		if ( false === $installed ) {
			add_option( self::DB_VERSION_OPTION, self::DB_VERSION );
		} else {
			update_option( self::DB_VERSION_OPTION, self::DB_VERSION );
		}
	}

	/**
	 * Seed the inventory table with the factory's standard raw materials
	 * if the table is empty (i.e. fresh installation only).
	 *
	 * Uses INSERT IGNORE so re-activation on an existing install is safe
	 * and does not overwrite manually adjusted stock levels.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	private static function seed_default_inventory(): void {
		global $wpdb;

		$table = $wpdb->prefix . 'mes_inventory';

		// Check if the table already has data — avoids duplicate seeding.
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$count = (int) $wpdb->get_var( "SELECT COUNT(*) FROM `{$table}`" );

		if ( $count > 0 ) {
			return;
		}

		$now = current_time( 'mysql' );

		$default_materials = [
			[
				'material_name' => 'Wire (ሽቦ)',
				'stock_level'   => 0.00,
				'unit'          => 'meters',
				'last_updated'  => $now,
			],
			[
				'material_name' => 'Chaf (ቻፍ)',
				'stock_level'   => 0.00,
				'unit'          => 'kg',
				'last_updated'  => $now,
			],
			[
				'material_name' => 'Shibo (ሺቦ)',
				'stock_level'   => 0.00,
				'unit'          => 'pieces',
				'last_updated'  => $now,
			],
			[
				'material_name' => 'Glue Stucko',
				'stock_level'   => 0.00,
				'unit'          => 'kg',
				'last_updated'  => $now,
			],
			[
				'material_name' => 'Plastic Sheet',
				'stock_level'   => 0.00,
				'unit'          => 'meters',
				'last_updated'  => $now,
			],
			[
				'material_name' => 'Packaging Boxes',
				'stock_level'   => 0.00,
				'unit'          => 'pieces',
				'last_updated'  => $now,
			],
			[
				'material_name' => 'Binding Thread',
				'stock_level'   => 0.00,
				'unit'          => 'rolls',
				'last_updated'  => $now,
			],
		];

		foreach ( $default_materials as $material ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery
			$wpdb->insert(
				$table,
				[
					'material_name' => sanitize_text_field( $material['material_name'] ),
					'stock_level'   => (float) $material['stock_level'],
					'unit'          => sanitize_text_field( $material['unit'] ),
					'last_updated'  => $material['last_updated'],
				],
				[ '%s', '%f', '%s', '%s' ]
			);
		}
	}

	// ──────────────────────────────────────────────────────────────────────
	// Schema upgrade hook (called on plugins_loaded, not just activation)
	// ──────────────────────────────────────────────────────────────────────

	/**
	 * Run dbDelta() again if the stored schema version is behind the
	 * current class constant. Call this from `plugins_loaded` in the main
	 * plugin file to handle upgrades without re-activation.
	 *
	 * Usage in main plugin file:
	 *   add_action( 'plugins_loaded', [ 'MES_Activator', 'maybe_upgrade' ] );
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public static function maybe_upgrade(): void {
		$installed_version = get_option( self::DB_VERSION_OPTION, '0.0.0' );

		if ( version_compare( $installed_version, self::DB_VERSION, '<' ) ) {
			self::create_tables();
			self::record_db_version();
		}
	}

	/**
	 * Plugin deactivation hook callback.
	 *
	 * Tables are intentionally NOT dropped on deactivation — only on
	 * uninstall (handled in uninstall.php) — to prevent accidental data loss.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public static function deactivate(): void {
		flush_rewrite_rules();
	}
}
