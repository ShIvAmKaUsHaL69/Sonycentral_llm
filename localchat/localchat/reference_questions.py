"""
Reference questions for prompt training (basic → complex).

Usage: import `REFERENCE_QUESTIONS` in experiments or UI to seed examples.
"""

from __future__ import annotations

# Organized categories with escalating difficulty
REFERENCE_QUESTIONS = {
    "schema_meta": [
        "list all tables",
        "show the total number of tables",
        "show columns for customers table",
        "fetch column names of all tables",
        "show tables like 'order%'",
        "describe customers table",
        "show create table orders",
        "list primary keys of all tables",
        "list foreign keys for orders table",
        "list indexes for products table",
        "which tables reference customers table",
        "columns containing 'email' across all tables",
        "find tables containing column 'created_at'",
        "list table sizes in MB",
    ],
    "schema_queries": [
        "what is the current database name",
        "list all tables in the current schema (information_schema.tables)",
        "count the number of tables in this database",
        "show tables like 'order%'",
        "describe the customers table",
        "show create table orders",
        "list all columns for each table (information_schema.columns)",
        "list columns and data types for orders",
        "list nullable columns in each table",
        "list primary keys for all tables",
        "list foreign keys for orders table",
        "which tables reference customers table",
        "list indexes for products table",
        "find tables without a primary key",
        "list views in the database",
        "show constraints for order_items table",
        "list relationships between tables (FK summary)",
        "list table sizes in MB (information_schema.tables)",
        "list tables ordered by size descending",
        "show last update time per table if available",
        "find columns containing the word 'email'",
        "find tables containing column 'created_at'",
    ],
    "basics": [
        "show recent orders",
        "what products do we have",
        "show store information",
        "list customers",
        "list distinct customer countries",
    ],
    "filters": [
        "list customers from Bahrain",
        "customers with gmail emails",
        "orders with status PAID",
        "products priced above 100",
        "orders created this month",
    ],
    "aggregations": [
        "how many customers do we have",
        "customer count by country",
        "total revenue by order status",
        "orders per day in the last 30 days",
    ],
    "joins": [
        "latest 20 orders with product titles",
        "orders with customer email and total price",
        "products with variant counts",
    ],
    "segments": [
        "top 20 customers by total_spent",
        "stores with most orders",
        "products with highest prices",
    ],
    "time_series": [
        "monthly order counts for current year",
        "average order amount per month",
        "daily new customers this week",
    ],
    "quality_checks": [
        "orders missing email",
        "customers without country",
        "products without variants",
    ],
    "inventory_pricing": [
        "variants with low inventory",
        "average product price by vendor",
    ],
    "store_analytics": [
        "stores with totals (orders, customers, products)",
        "stores synced most recently",
    ],
    "complex": [
        "for each store, total revenue and top country by orders",
        "repeat customers: customers with more than 2 orders",
        "customer lifetime value approximation using total_spent",
        "conversion: orders per customer by country",
        "top 10 products contributing to revenue in the last 90 days",
    ],
}


def all_questions() -> list[str]:
    items: list[str] = []
    for _, qs in REFERENCE_QUESTIONS.items():
        items.extend(qs)
    return items


# Detailed training examples (user → SQL → NLP expected summary)
EXAMPLES = [
    {
        "user": "list all tables",
        "sql": (
            "SELECT table_name\n"
            "FROM information_schema.tables\n"
            "WHERE table_schema = DATABASE()\n"
            "ORDER BY table_name;"
        ),
        "nlp": "Here are the tables in the current database, ordered alphabetically.",
    },
    {
        "user": "show the total number of tables",
        "sql": (
            "SELECT COUNT(*) AS total_tables\n"
            "FROM information_schema.tables\n"
            "WHERE table_schema = DATABASE();"
        ),
        "nlp": "Total number of tables in this database: {total_tables}.",
    },
    {
        "user": "describe customers table",
        "sql": "DESCRIBE customers;",
        "nlp": "Structure of the customers table with column names, types, and nullability.",
    },
    {
        "user": "show recent orders",
        "sql": (
            "SELECT order_id, name, email, status, currency, total_price, created_at\n"
            "FROM orders\n"
            "ORDER BY created_at DESC\n"
            "LIMIT 20;"
        ),
        "nlp": "Latest 20 orders with buyer, status, currency, amount, and date.",
    },
    {
        "user": "what products do we have",
        "sql": (
            "SELECT product_id, title, vendor, product_type, status, created_at\n"
            "FROM products\n"
            "ORDER BY created_at DESC\n"
            "LIMIT 20;"
        ),
        "nlp": "Recent products with title, vendor, type, status, and created date.",
    },
    {
        "user": "list customers",
        "sql": (
            "SELECT customer_id, first_name, last_name, email, country, created_at\n"
            "FROM customers\n"
            "ORDER BY created_at DESC\n"
            "LIMIT 50;"
        ),
        "nlp": "Recent customers with name, email, country, and signup date.",
    },
    {
        "user": "customers from Bahrain",
        "sql": (
            "SELECT customer_id, first_name, last_name, email, country, created_at\n"
            "FROM customers\n"
            "WHERE country = 'Bahrain'\n"
            "ORDER BY created_at DESC\n"
            "LIMIT 50;"
        ),
        "nlp": "Customers located in Bahrain, most recent first.",
    },
    {
        "user": "orders with status PAID",
        "sql": (
            "SELECT order_id, name, email, status, total_price, currency, created_at\n"
            "FROM orders\n"
            "WHERE status = 'PAID'\n"
            "ORDER BY created_at DESC\n"
            "LIMIT 50;"
        ),
        "nlp": "Paid orders with buyer, amount, currency, and date.",
    },
    {
        "user": "products priced above 100",
        "sql": (
            "SELECT pv.variant_id, p.product_id, p.title, pv.sku, pv.price, pv.inventory_quantity\n"
            "FROM product_variants pv\n"
            "JOIN products p ON pv.product_id = p.product_id\n"
            "WHERE pv.price > 100\n"
            "ORDER BY pv.price DESC\n"
            "LIMIT 50;"
        ),
        "nlp": "Variants priced above 100, with product title, SKU, price, and stock.",
    },
    {
        "user": "how many customers do we have",
        "sql": "SELECT COUNT(*) AS total_customers FROM customers;",
        "nlp": "Total customers: {total_customers}.",
    },
    {
        "user": "customer count by country",
        "sql": (
            "SELECT country, COUNT(*) AS customer_count\n"
            "FROM customers\n"
            "WHERE country IS NOT NULL\n"
            "GROUP BY country\n"
            "ORDER BY customer_count DESC;"
        ),
        "nlp": "Customer distribution by country, highest to lowest.",
    },
    {
        "user": "orders per day in the last 30 days",
        "sql": (
            "SELECT DATE(created_at) AS day, COUNT(*) AS orders_count\n"
            "FROM orders\n"
            "WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)\n"
            "GROUP BY DATE(created_at)\n"
            "ORDER BY day DESC;"
        ),
        "nlp": "Daily order counts for the last 30 days.",
    },
    {
        "user": "latest 20 orders with product titles",
        "sql": (
            "SELECT o.order_id, o.name, o.email, o.status, o.total_price, o.created_at, p.title\n"
            "FROM orders o\n"
            "JOIN order_items oi ON o.order_id = oi.order_id\n"
            "JOIN products p ON oi.product_id = p.product_id\n"
            "ORDER BY o.created_at DESC\n"
            "LIMIT 20;"
        ),
        "nlp": "Recent orders with included product titles and order details.",
    },
    {
        "user": "orders with customer email and total price",
        "sql": (
            "SELECT o.order_id, o.name, c.email, o.total_price, o.created_at\n"
            "FROM orders o\n"
            "JOIN order_customer oc ON o.order_id = oc.order_id\n"
            "JOIN customers c ON oc.customer_id = c.customer_id\n"
            "ORDER BY o.created_at DESC\n"
            "LIMIT 50;"
        ),
        "nlp": "Orders joined to customers, showing email, price, and date.",
    },
    {
        "user": "top 20 customers by total_spent",
        "sql": (
            "SELECT customer_id, first_name, last_name, email, total_spent, orders_count, country\n"
            "FROM customers\n"
            "ORDER BY total_spent DESC\n"
            "LIMIT 20;"
        ),
        "nlp": "Top 20 customers ranked by total spending, with contact and country.",
    },
    {
        "user": "stores with most orders",
        "sql": (
            "SELECT s.store_id, s.store_name, s.shop_url, s.total_orders\n"
            "FROM stores s\n"
            "ORDER BY s.total_orders DESC\n"
            "LIMIT 10;"
        ),
        "nlp": "Top stores by total orders with store name and URL.",
    },
    {
        "user": "monthly order counts for current year",
        "sql": (
            "SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS orders_count\n"
            "FROM orders\n"
            "WHERE YEAR(created_at) = YEAR(CURDATE())\n"
            "GROUP BY DATE_FORMAT(created_at, '%Y-%m')\n"
            "ORDER BY month;"
        ),
        "nlp": "Monthly order volumes for the current year.",
    },
    {
        "user": "average order amount per month",
        "sql": (
            "SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, AVG(total_price) AS avg_order_amount\n"
            "FROM orders\n"
            "GROUP BY DATE_FORMAT(created_at, '%Y-%m')\n"
            "ORDER BY month;"
        ),
        "nlp": "Average order amount by month.",
    },
    {
        "user": "orders missing email",
        "sql": (
            "SELECT order_id, name, status, total_price, created_at\n"
            "FROM orders\n"
            "WHERE email IS NULL OR email = ''\n"
            "ORDER BY created_at DESC\n"
            "LIMIT 50;"
        ),
        "nlp": "Orders without an email populated.",
    },
    {
        "user": "customers without country",
        "sql": (
            "SELECT customer_id, first_name, last_name, email, created_at\n"
            "FROM customers\n"
            "WHERE country IS NULL OR country = ''\n"
            "ORDER BY created_at DESC\n"
            "LIMIT 50;"
        ),
        "nlp": "Customers with no country recorded.",
    },
    {
        "user": "variants with low inventory",
        "sql": (
            "SELECT pv.variant_id, p.title, pv.sku, pv.inventory_quantity\n"
            "FROM product_variants pv\n"
            "JOIN products p ON pv.product_id = p.product_id\n"
            "WHERE pv.inventory_quantity IS NOT NULL AND pv.inventory_quantity <= 5\n"
            "ORDER BY pv.inventory_quantity ASC\n"
            "LIMIT 50;"
        ),
        "nlp": "Variants with low stock (<=5), including product title and SKU.",
    },
    {
        "user": "average product price by vendor",
        "sql": (
            "SELECT p.vendor, AVG(pv.price) AS avg_price\n"
            "FROM products p\n"
            "JOIN product_variants pv ON pv.product_id = p.product_id\n"
            "WHERE pv.price IS NOT NULL\n"
            "GROUP BY p.vendor\n"
            "ORDER BY avg_price DESC;"
        ),
        "nlp": "Average variant price grouped by vendor.",
    },
    {
        "user": "stores synced most recently",
        "sql": (
            "SELECT store_id, store_name, shop_url, status, synced_at\n"
            "FROM stores\n"
            "ORDER BY synced_at DESC\n"
            "LIMIT 10;"
        ),
        "nlp": "Stores ordered by most recent sync time.",
    },
    {
        "user": "stores with totals (orders, customers, products)",
        "sql": (
            "SELECT store_id, store_name, shop_url, total_orders, total_customers, total_products\n"
            "FROM stores\n"
            "ORDER BY total_orders DESC\n"
            "LIMIT 20;"
        ),
        "nlp": "Stores with their aggregate counts for orders, customers, and products.",
    },
    {
        "user": "repeat customers: customers with more than 2 orders",
        "sql": (
            "SELECT c.customer_id, c.first_name, c.last_name, c.email, c.country, c.orders_count\n"
            "FROM customers c\n"
            "WHERE c.orders_count > 2\n"
            "ORDER BY c.orders_count DESC\n"
            "LIMIT 50;"
        ),
        "nlp": "Customers with more than two orders, showing name, email, country, and order count.",
    },
    {
        "user": "top 10 products contributing to revenue in the last 90 days",
        "sql": (
            "SELECT p.product_id, p.title, SUM(oi.price * oi.quantity) AS revenue\n"
            "FROM orders o\n"
            "JOIN order_items oi ON o.order_id = oi.order_id\n"
            "JOIN products p ON oi.product_id = p.product_id\n"
            "WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)\n"
            "GROUP BY p.product_id, p.title\n"
            "ORDER BY revenue DESC\n"
            "LIMIT 10;"
        ),
        "nlp": "Top 10 products by revenue over the last 90 days.",
    },
]


