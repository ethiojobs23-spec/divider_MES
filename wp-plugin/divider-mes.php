<?php
/**
 * Plugin Name:       Divider MES — Factory REST API
 * Plugin URI:        https://github.com/ethiojobs23-spec/divider_MES
 * Description:       Headless REST API for the Divider Manufacturing Execution System. Provides ACID-compliant custom SQL tables and authenticated JSON endpoints for the Vue.js tablet frontend.
 * Version:           1.0.0
 * Requires at least: 6.0
 * Requires PHP:      8.1
 * Author:            ethiojobs23-spec
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       divider-mes
 *
 * @package DividerMES
 */

// Prevent direct file access.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// ─── Plugin Constants ─────────────────────────────────────────────────────
define( 'MES_VERSION',     '1.0.0' );
define( 'MES_PLUGIN_DIR',  plugin_dir_path( __FILE__ ) );
define( 'MES_PLUGIN_URL',  plugin_dir_url( __FILE__ ) );
define( 'MES_PLUGIN_FILE', __FILE__ );

// REST API namespace — all endpoints live under /wp-json/factory/v1/
define( 'MES_API_NAMESPACE', 'factory/v1' );

// ─── Includes ─────────────────────────────────────────────────────────────
require_once MES_PLUGIN_DIR . 'includes/class-mes-activator.php';

// ─── Activation / Deactivation Hooks ─────────────────────────────────────
register_activation_hook( MES_PLUGIN_FILE, [ 'MES_Activator', 'activate' ] );
register_deactivation_hook( MES_PLUGIN_FILE, [ 'MES_Activator', 'deactivate' ] );

// ─── Schema upgrade on every load (handles update without re-activation) ──
add_action( 'plugins_loaded', [ 'MES_Activator', 'maybe_upgrade' ] );
