import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { YadakMarketAdapter, parsePersianPrice } from '../yadakmarket';

// ── HTML نمونه برای تست (بدون نیاز به سایت واقعی) ────────────────────────────
const SAMPLE_HTML = `
<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
  <meta property="og:title" content="فیلتر روغن سامسونگ مدل SM-G980F" />
</head>
<body>
  <nav class="woocommerce-breadcrumb">
    <a href="/">خانه</a> /
    <a href="/category/filters/">فیلترها</a> /
    <a href="/category/oil-filters/">فیلتر روغن</a>
  </nav>

  <h1 class="product_title entry-title">فیلتر روغن سامسونگ مدل SM-G980F</h1>

  <div class="woocommerce-product-gallery__image" data-large_image="https://www.yadakmarket.com/wp-content/uploads/filter-oil-large.jpg">
    <a href="https://www.yadakmarket.com/wp-content/uploads/filter-oil-large.jpg">
      <img src="https://www.yadakmarket.com/wp-content/uploads/filter-oil-thumb.jpg"
           data-large_image="https://www.yadakmarket.com/wp-content/uploads/filter-oil-large.jpg"
           alt="فیلتر روغن" />
    </a>
  </div>

  <p class="price">
    <del><span class="woocommerce-Price-amount amount">۹۵۰,۰۰۰ تومان</span></del>
    <ins><span class="woocommerce-Price-amount amount">۸۵۰,۰۰۰ تومان</span></ins>
  </p>

  <p class="stock in-stock">موجود در انبار</p>

  <div class="woocommerce-product-details__short-description">
    <p>فیلتر روغن اصل برای خودروهای سامسونگ</p>
  </div>

  <div id="tab-description">
    <p>این محصول یک فیلتر روغن اصلی با کیفیت بالا است.</p>
  </div>

  <table class="shop_attributes">
    <tr>
      <th>برند</th>
      <td>سامسونگ</td>
    </tr>
    <tr>
      <th>مدل</th>
      <td>SM-G980F</td>
    </tr>
    <tr>
      <th>گارانتی</th>
      <td>۱۸ ماهه</td>
    </tr>
  </table>
</body>
</html>
`;

const SAMPLE_URL = 'https://www.yadakmarket.com/product/filter-oil-samsung/';

describe('parsePersianPrice', () => {
  test('converts Persian digits and removes تومان', () => {
    assert.equal(parsePersianPrice('۸۵۰,۰۰۰ تومان'), 850000);
  });

  test('handles ASCII digits with commas', () => {
    assert.equal(parsePersianPrice('1,250,000 تومان'), 1250000);
  });

  test('handles plain number string', () => {
    assert.equal(parsePersianPrice('500000'), 500000);
  });

  test('returns 0 for empty/invalid string', () => {
    assert.equal(parsePersianPrice(''), 0);
    assert.equal(parsePersianPrice('ناموجود'), 0);
  });
});

describe('YadakMarketAdapter', () => {
  const adapter = new YadakMarketAdapter();

  describe('canHandle', () => {
    test('returns true for yadakmarket.com URLs', () => {
      assert.equal(adapter.canHandle('https://www.yadakmarket.com/product/test/'), true);
      assert.equal(adapter.canHandle('https://yadakmarket.com/shop/'), true);
    });

    test('returns false for other domains', () => {
      assert.equal(adapter.canHandle('https://www.digikala.com/product/dkp-123/'), false);
      assert.equal(adapter.canHandle('https://torob.com/product/456/'), false);
    });

    test('returns false for malformed URLs', () => {
      assert.equal(adapter.canHandle('not-a-url'), false);
    });
  });

  describe('extract', () => {
    test('extracts title from h1.product_title', async () => {
      const result = await adapter.extract(SAMPLE_HTML, SAMPLE_URL);
      assert.equal(result.product.title, 'فیلتر روغن سامسونگ مدل SM-G980F');
    });

    test('sets correct siteSlug and url', async () => {
      const result = await adapter.extract(SAMPLE_HTML, SAMPLE_URL);
      assert.equal(result.source.siteSlug, 'yadak-market');
      assert.equal(result.source.url, SAMPLE_URL);
    });

    test('extracts sale price', async () => {
      const result = await adapter.extract(SAMPLE_HTML, SAMPLE_URL);
      assert.equal(result.inventory.price, 850000);
    });

    test('extracts original price', async () => {
      const result = await adapter.extract(SAMPLE_HTML, SAMPLE_URL);
      assert.equal(result.inventory.originalPrice, 950000);
    });

    test('detects in-stock status', async () => {
      const result = await adapter.extract(SAMPLE_HTML, SAMPLE_URL);
      assert.equal(result.inventory.inStock, true);
    });

    test('extracts large image URL (not thumbnail)', async () => {
      const result = await adapter.extract(SAMPLE_HTML, SAMPLE_URL);
      assert.ok(result.product.images.length > 0);
      assert.ok(result.product.images[0]?.includes('large'));
    });

    test('extracts specifications as key-value', async () => {
      const result = await adapter.extract(SAMPLE_HTML, SAMPLE_URL);
      assert.equal(result.product.attributes['برند'], 'سامسونگ');
      assert.equal(result.product.attributes['مدل'], 'SM-G980F');
    });

    test('extracts brand from specifications', async () => {
      const result = await adapter.extract(SAMPLE_HTML, SAMPLE_URL);
      assert.equal(result.product.brand, 'سامسونگ');
    });

    test('extracts category from breadcrumb (excluding خانه)', async () => {
      const result = await adapter.extract(SAMPLE_HTML, SAMPLE_URL);
      assert.ok(result.product.category?.includes('فیلترها'));
      assert.ok(!result.product.category?.includes('خانه'));
    });

    test('crawledAt is a valid ISO datetime', async () => {
      const result = await adapter.extract(SAMPLE_HTML, SAMPLE_URL);
      assert.ok(!isNaN(Date.parse(result.source.crawledAt)));
    });
  });
});
