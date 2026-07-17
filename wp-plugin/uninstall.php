<?php
/**
 * Uninstall Divider MES Plugin
 *
 * This file is called automatically by WordPress when the user clicks
 * "Delete" in the Plugins screen. It permanently removes all plugin data.
 *
 * WARNING: This is a destructive, irreversible operation. All factory
 * production records, inventory, financial ledger, and downtime logs
 * stored in the custom tables will be deleted permanently.
 *
 * This file is ONLY executed when:
 *   1. The plugin has been deactivated.
 *   2. The administrator clicks "Delete" (not just "Deactivate").
 *   3. WordPress verifies WP_UNINSTALL_PLUGIN is defined.
 *
 * @package DividerMES
 * @since   1.0.0
 */

// WordPress sets this constant before calling uninstall.php.
// Bail immediately if this file is accessed directly.
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

global $wpdb;

// ─── Drop all custom MES tables ───────────────────────────────────────────
$tables = [
	$wpdb->prefix . 'mes_inventory',
	$wpdb->prefix . 'mes_production_logs',
	$wpdb->prefix . 'mes_financial_ledger',
	$wpdb->prefix . 'mes_downtime_logs',
];

foreach ( $tables as $table ) {
	// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
	$wpdb->query( "DROP TABLE IF EXISTS `{$table}`" );
}

// ─── Remove plugin options ────────────────────────────────────────────────
delete_option( 'mes_db_version' );
delete_option( 'mes_settings' );
delete_option( 'mes_piece_rates' );
delete_option( 'mes_waste_thresholds' );

// ─── Clear any scheduled events ───────────────────────────────────────────
wp_clear_scheduled_hook( 'mes_weekly_payroll_export' );
wp_clear_scheduled_hook( 'mes_daily_backup' );
