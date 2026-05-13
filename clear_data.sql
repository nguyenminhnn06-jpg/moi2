-- Hide all products and categories (safely preserve data without deletion)
UPDATE products SET product_is_display = 0;
UPDATE categories SET category_is_display = 0;
UPDATE product_variants SET product_variant_is_display = 0;

-- Clear related product data (optional - if you want to remove details but keep main records)
-- DELETE FROM product_details;
-- DELETE FROM product_imgs;