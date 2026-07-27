<?php
/**
 * MES Database Schema Builder
 *
 * Defines all custom ACID-compliant SQL tables and their relationships
 * (Foreign Keys). Organised in a dedicated folder as requested.
 *
 * @package DividerMES
 * @subpackage DividerMES/includes/database
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MES_Schema_Builder {

	/**
	 * Execute all table creations and foreign key bindings.
	 */
	public static function build_schema(): void {
		global $wpdb;
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		
		$charset_collate = $wpdb->get_charset_collate();
		$prefix = $wpdb->prefix;

		// 1. Core / Parent Tables (No FK dependencies)
		dbDelta( self::sql_mes_operators( $prefix, $charset_collate ) );
		dbDelta( self::sql_mes_inventory( $prefix, $charset_collate ) );

		// 2. Child Tables (Depend on mes_operators)
		dbDelta( self::sql_mes_production_logs( $prefix, $charset_collate ) );
		dbDelta( self::sql_mes_financial_ledger( $prefix, $charset_collate ) );
		dbDelta( self::sql_mes_downtime_logs( $prefix, $charset_collate ) );
		dbDelta( self::sql_mes_attendance( $prefix, $charset_collate ) );
		dbDelta( self::sql_mes_loans( $prefix, $charset_collate ) );
		
		// 3. Establish strict Foreign Key relationships
		self::apply_foreign_keys( $prefix );
	}

	/**
	 * DDL: mes_operators (Workers & Admins)
	 */
	private static function sql_mes_operators( $prefix, $charset_collate ): string {
		$table = $prefix . 'mes_operators';
		return "CREATE TABLE {$table} (
  id            bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  pin_code      varchar(4) NOT NULL COMMENT '4-digit login PIN',
  name          varchar(100) NOT NULL,
  role          varchar(50) NOT NULL DEFAULT 'employee',
  avatar        varchar(10) DEFAULT '',
  color         varchar(50) DEFAULT 'bg-slate-500',
  is_active     tinyint(1) NOT NULL DEFAULT 1,
  created_at    datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY  (id),
  UNIQUE KEY idx_pin_code (pin_code),
  KEY idx_role (role)
) {$charset_collate};";
	}

	/**
	 * DDL: mes_attendance (Clock-in / Clock-out)
	 */
	private static function sql_mes_attendance( $prefix, $charset_collate ): string {
		$table = $prefix . 'mes_attendance';
		return "CREATE TABLE {$table} (
  id            bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  operator_id   bigint(20) UNSIGNED NOT NULL,
  production_week varchar(20) NOT NULL,
  shift_date    date NOT NULL,
  clock_in      datetime NOT NULL,
  clock_out     datetime DEFAULT NULL,
  status        varchar(50) DEFAULT 'on_time',
  created_at    datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY  (id),
  KEY idx_operator_id (operator_id),
  KEY idx_shift_date (shift_date),
  KEY idx_week (production_week)
) {$charset_collate};";
	}

	/**
	 * DDL: mes_loans (Interest-bearing loans)
	 */
	private static function sql_mes_loans( $prefix, $charset_collate ): string {
		$table = $prefix . 'mes_loans';
		return "CREATE TABLE {$table} (
  id            bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  operator_id   bigint(20) UNSIGNED NOT NULL,
  production_week varchar(20) NOT NULL,
  principal     decimal(10,2) NOT NULL DEFAULT 0.00,
  interest_rate decimal(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Percentage e.g. 5.00',
  status        varchar(20) NOT NULL DEFAULT 'active' COMMENT 'active|paid',
  issued_at     datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY  (id),
  KEY idx_operator_id (operator_id),
  KEY idx_status (status)
) {$charset_collate};";
	}

	// ─── Existing tables, upgraded with operator_id ──────────────────────

	private static function sql_mes_inventory( $prefix, $charset_collate ): string {
		$table = $prefix . 'mes_inventory';
		return "CREATE TABLE {$table} (
  id            bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  material_name varchar(100) NOT NULL DEFAULT '',
  stock_level   decimal(10,2) NOT NULL DEFAULT 0.00,
  unit          varchar(20) NOT NULL DEFAULT '',
  last_updated  datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY  (id),
  KEY idx_material_name (material_name)
) {$charset_collate};";
	}

	private static function sql_mes_production_logs( $prefix, $charset_collate ): string {
		$table = $prefix . 'mes_production_logs';
		return "CREATE TABLE {$table} (
  id              bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  operator_id     bigint(20) UNSIGNED DEFAULT NULL,
  operator_name   varchar(50) NOT NULL DEFAULT '' COMMENT 'Legacy string fallback',
  production_week varchar(20) NOT NULL DEFAULT '',
  production_date date NOT NULL,
  divider_type    tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  placement_style varchar(50) NOT NULL DEFAULT '',
  size_cm         tinyint(2) UNSIGNED NOT NULL DEFAULT 0,
  qty_produced    mediumint(8) UNSIGNED NOT NULL DEFAULT 0,
  qty_waste       mediumint(8) UNSIGNED NOT NULL DEFAULT 0,
  created_at      datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY  (id),
  KEY idx_operator_id (operator_id),
  KEY idx_date_type (production_date, divider_type)
) {$charset_collate};";
	}

	private static function sql_mes_financial_ledger( $prefix, $charset_collate ): string {
		$table = $prefix . 'mes_financial_ledger';
		return "CREATE TABLE {$table} (
  id               bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  operator_id      bigint(20) UNSIGNED DEFAULT NULL,
  target_name      varchar(50) NOT NULL DEFAULT '' COMMENT 'Legacy/Company fallback',
  transaction_type varchar(20) NOT NULL DEFAULT '',
  amount           decimal(10,2) NOT NULL DEFAULT 0.00,
  transaction_date date NOT NULL,
  notes            text,
  created_at       datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY  (id),
  KEY idx_operator_id (operator_id),
  KEY idx_type (transaction_type)
) {$charset_collate};";
	}

	private static function sql_mes_downtime_logs( $prefix, $charset_collate ): string {
		$table = $prefix . 'mes_downtime_logs';
		return "CREATE TABLE {$table} (
  id                 bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  operator_id        bigint(20) UNSIGNED DEFAULT NULL,
  issue_category     varchar(50) NOT NULL DEFAULT '',
  operator_name      varchar(50) NOT NULL DEFAULT '',
  start_time         datetime NOT NULL,
  end_time           datetime DEFAULT NULL,
  duration_minutes   int(11) DEFAULT NULL,
  resolution_notes   text,
  resolved_by        varchar(50) NOT NULL DEFAULT '',
  created_at         datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY  (id),
  KEY idx_operator_id (operator_id),
  KEY idx_active (end_time)
) {$charset_collate};";
	}

	/**
	 * Explicitly define Foreign Key relationships outside dbDelta.
	 * dbDelta struggles with CONSTRAINT parsing, so we apply them manually
	 * using ALTER TABLE if they don't exist.
	 */
	private static function apply_foreign_keys( $prefix ): void {
		global $wpdb;
		
		$ops_table = $prefix . 'mes_operators';
		
		$relations = [
			$prefix . 'mes_production_logs' => 'operator_id',
			$prefix . 'mes_financial_ledger' => 'operator_id',
			$prefix . 'mes_downtime_logs' => 'operator_id',
			$prefix . 'mes_attendance' => 'operator_id',
			$prefix . 'mes_loans' => 'operator_id',
		];

		foreach ( $relations as $child_table => $fk_col ) {
			// Check if FK exists
			$fk_name = "fk_{$child_table}_{$ops_table}";
			$check_fk = $wpdb->get_results( $wpdb->prepare(
				"SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS 
				 WHERE CONSTRAINT_SCHEMA = DATABASE() 
				 AND TABLE_NAME = %s 
				 AND CONSTRAINT_NAME = %s",
				$child_table, $fk_name
			) );

			if ( empty( $check_fk ) ) {
				// We must ignore errors if the operator_id doesn't match an existing ID during upgrade
				$wpdb->query( "SET FOREIGN_KEY_CHECKS=0;" );
				$wpdb->query( "
					ALTER TABLE {$child_table}
					ADD CONSTRAINT {$fk_name}
					FOREIGN KEY ({$fk_col}) REFERENCES {$ops_table}(id)
					ON DELETE SET NULL
					ON UPDATE CASCADE
				" );
				$wpdb->query( "SET FOREIGN_KEY_CHECKS=1;" );
			}
		}
	}
}
