# WordPress Custom Database Table Implementation Guide

This guide outlines the best practices for creating and managing custom database tables in WordPress. Custom tables are highly recommended over Custom Post Types (CPTs) or the `wp_postmeta` table when you are dealing with a large volume of relational data, require high-performance queries, or need a clean, structured schema independent of WordPress's default content models.

## 1. Why Use Custom Database Tables?

*   **Performance:** Querying a custom table is significantly faster than performing multiple `JOIN` operations across `wp_posts` and `wp_postmeta`, especially with large datasets.
*   **Scalability:** Custom tables scale much better for custom application logic (like a CRM, logs, or custom analytics).
*   **Data Integrity:** You can enforce strict data types, unique constraints, and foreign keys at the database level.
*   **Cleanliness:** Keeps your `wp_posts` and `wp_postmeta` tables free from clutter.

## 2. Setting Up the Custom Table on Plugin Activation

The first step is to create the custom table when your plugin is activated. You should use WordPress's `dbDelta()` function, which safely handles table creation and schema updates.

### 2.1 The Activation Hook

Create an activation function in your main plugin file or a dedicated installer class:

```php
// In your main plugin file (e.g., divider-mes-plugin.php)

register_activation_hook( __FILE__, 'divider_mes_create_custom_tables' );

function divider_mes_create_custom_tables() {
    global $wpdb;

    // Define the table name with the dynamic WordPress prefix
    $table_name = $wpdb->prefix . 'divider_custom_data';

    // Get the character set and collation used by the current database
    $charset_collate = $wpdb->get_charset_collate();

    // Define the SQL query for table creation
    $sql = "CREATE TABLE $table_name (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        user_id bigint(20) unsigned NOT NULL,
        data_key varchar(255) NOT NULL,
        data_value longtext,
        status varchar(50) DEFAULT 'active' NOT NULL,
        created_at datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        PRIMARY KEY  (id),
        KEY user_id (user_id),
        KEY data_key (data_key)
    ) $charset_collate;";

    // Include the dbDelta function
    require_once( ABSPATH . 'wp-admin/includes/upgrade.php' );

    // Execute dbDelta
    dbDelta( $sql );
    
    // Optional: Store the DB version to track future schema updates
    add_option( 'divider_mes_db_version', '1.0.0' );
}
```

### Important `dbDelta()` Rules to Remember:
1.  You must put two spaces after the `PRIMARY KEY` keyword.
2.  You must use the key word `KEY` rather than its synonym `INDEX` and you must include at least one KEY.
3.  Do not use any apostrophes or backticks around field names.
4.  Field types must be lowercase.

## 3. Creating a CRUD Data Access Layer (DAL)

Instead of scattering `$wpdb` queries throughout your code, create a dedicated class to handle Create, Read, Update, and Delete operations for your table.

```php
// class-divider-mes-data-handler.php

class Divider_MES_Data_Handler {

    private $table_name;

    public function __construct() {
        global $wpdb;
        $this->table_name = $wpdb->prefix . 'divider_custom_data';
    }

    /**
     * Create a new record
     */
    public function insert( $data ) {
        global $wpdb;

        $defaults = array(
            'created_at' => current_time( 'mysql' ),
            'updated_at' => current_time( 'mysql' ),
        );

        $data = wp_parse_args( $data, $defaults );

        // Define format based on the structure of your data array
        // %s (string), %d (integer), %f (float)
        $format = array( '%d', '%s', '%s', '%s', '%s', '%s' );

        $inserted = $wpdb->insert( $this->table_name, $data, $format );

        if ( ! $inserted ) {
            return new WP_Error( 'db_insert_error', 'Could not insert data into the database', $wpdb->last_error );
        }

        return $wpdb->insert_id;
    }

    /**
     * Read a single record by ID
     */
    public function get( $id ) {
        global $wpdb;
        
        $sql = $wpdb->prepare( "SELECT * FROM {$this->table_name} WHERE id = %d", $id );
        return $wpdb->get_row( $sql, ARRAY_A ); // Return as an associative array
    }

    /**
     * Read multiple records (with optional arguments for WHERE clauses, pagination, etc.)
     */
    public function get_all( $args = array() ) {
        global $wpdb;
        
        // Basic example: get all. 
        // In a real scenario, you'd parse $args to build WHERE, ORDER BY, LIMIT clauses dynamically.
        $sql = "SELECT * FROM {$this->table_name} ORDER BY created_at DESC";
        
        return $wpdb->get_results( $sql, ARRAY_A );
    }

    /**
     * Update a record
     */
    public function update( $id, $data ) {
        global $wpdb;

        $data['updated_at'] = current_time( 'mysql' );

        $where = array( 'id' => $id );
        $where_format = array( '%d' );

        // Assuming all fields passed in $data are strings for this example format. Adjust accordingly.
        $data_format = array_fill(0, count($data), '%s'); 

        $updated = $wpdb->update( $this->table_name, $data, $where, $data_format, $where_format );

        if ( $updated === false ) {
            return new WP_Error( 'db_update_error', 'Could not update data', $wpdb->last_error );
        }

        return $updated; // Returns number of rows affected
    }

    /**
     * Delete a record
     */
    public function delete( $id ) {
        global $wpdb;
        
        $where = array( 'id' => $id );
        $where_format = array( '%d' );

        return $wpdb->delete( $this->table_name, $where, $where_format );
    }
}
```

## 4. Upgrading the Schema Later

When you need to add columns to your custom table in future versions of your plugin, you use `dbDelta` again, checking the stored version option.

```php
function divider_mes_update_db_schema() {
    $current_db_version = get_option( 'divider_mes_db_version' );
    $new_db_version = '1.1.0';

    if ( version_compare( $current_db_version, $new_db_version, '<' ) ) {
        global $wpdb;
        $table_name = $wpdb->prefix . 'divider_custom_data';
        $charset_collate = $wpdb->get_charset_collate();

        // Include the new column in the SQL definition
        $sql = "CREATE TABLE $table_name (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            user_id bigint(20) unsigned NOT NULL,
            data_key varchar(255) NOT NULL,
            data_value longtext,
            status varchar(50) DEFAULT 'active' NOT NULL,
            new_column varchar(100) DEFAULT NULL, -- NEW COLUMN ADDED
            created_at datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY  (id),
            KEY user_id (user_id),
            KEY data_key (data_key)
        ) $charset_collate;";

        require_once( ABSPATH . 'wp-admin/includes/upgrade.php' );
        dbDelta( $sql ); // dbDelta will detect the difference and execute an ALTER TABLE query

        update_option( 'divider_mes_db_version', $new_db_version );
    }
}
add_action( 'plugins_loaded', 'divider_mes_update_db_schema' );
```

## 5. Security & Best Practices

1.  **Always prepare your queries:** Never pass raw user input or variable data directly into a query string. Always use `$wpdb->prepare()`.
2.  **Nonce verification:** When inserting, updating, or deleting data via a form or AJAX request, ensure you verify WordPress nonces to prevent CSRF attacks.
3.  **Capability checks:** Check if the user has the right permissions (e.g., `current_user_can('manage_options')`) before allowing them to modify the data.
4.  **Sanitization & Validation:** Sanitize data before it enters the database (e.g., `sanitize_text_field()`) and validate it to ensure it matches expected formats.
