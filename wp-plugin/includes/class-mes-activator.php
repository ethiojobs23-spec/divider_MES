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

	private static function create_tables(): void {
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'includes/database/class-mes-schema-builder.php';
		MES_Schema_Builder::build_schema();
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
