-- 0003_seed_dev_products.sql ran before the `status` column existed
-- (added in 0004), so those 8 rows defaulted to 'draft' — meaning the
-- storefront's own catalogue couldn't be added to a cart. These are the
-- listings src/lib/fixtures/listings.ts renders, so they need to be
-- purchasable.

UPDATE products SET status = 'published', updated_at = 1755000000000
WHERE id IN ('1', '2', '3', '4', '5', '6', '7', '8');
