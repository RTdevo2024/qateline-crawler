import type { CrawledProductData } from "@/types/crawler";

interface ProductPrompts {
  systemPrompt: string;
  userPrompt: string;
}

export function buildProductProcessingPrompt(
  input: CrawledProductData,
  categoriesList: string[]
): ProductPrompts {
  const systemPrompt = `شما یک متخصص محتوای محصولات فروشگاهی ایرانی هستید.
وظیفه شما: تبدیل داده‌های خام کرال‌شده به محتوای حرفه‌ای، SEO-friendly و فارسی.

قوانین مهم:
- خروجی فقط و فقط یک JSON خالص باشد — بدون \`\`\`json، بدون توضیح اضافه، فقط JSON
- تمام متون فارسی با کیفیت بالا، روان و ادبی باشند
- توضیحات HTML فقط از تگ‌های p، ul، li، h3 استفاده کند
- هیچ اطلاعات نادرست یا ساختگی اضافه نکنید — فقط از داده‌های موجود استفاده کنید
- slug فقط شامل حروف فارسی، انگلیسی، اعداد و خط تیره (-) باشد`;

  const attrsText =
    Object.keys(input.product.attributes).length > 0
      ? Object.entries(input.product.attributes)
          .map(([k, v]) => `  - ${k}: ${v}`)
          .join("\n")
      : "  (مشخصات فنی موجود نیست)";

  const categoriesText =
    categoriesList.length > 0
      ? categoriesList.map((c) => `  - ${c}`).join("\n")
      : "  (لیست دسته‌بندی ارائه نشده)";

  const userPrompt = `محصول زیر را پردازش کنید و JSON با فیلدهای مشخص‌شده برگردانید:

عنوان خام: ${input.product.title}
توضیحات خام: ${input.product.description ?? "(توضیحاتی موجود نیست)"}
قیمت: ${input.inventory.price.toLocaleString()} ریال
دسته‌بندی در سایت مبدأ: ${input.product.category ?? "(نامشخص)"}
برند: ${input.product.brand ?? "(نامشخص)"}
تعداد تصاویر: ${input.product.images.length}
مشخصات فنی:
${attrsText}

دسته‌بندی‌های موجود در فروشگاه قطعه‌لاین:
${categoriesText}

JSON مورد نیاز (همه فیلدها را پر کنید):
{
  "title": "عنوان فارسی بازنویسی‌شده، 60 تا 80 کاراکتر، SEO-friendly",
  "description": "توضیحات HTML کامل با p/ul/li/h3، 300 تا 500 کلمه فارسی",
  "category": "یکی از دسته‌بندی‌های لیست بالا (یا null اگر هیچ‌کدام مناسب نبود)",
  "attrs": [{"key": "نام ویژگی", "value": "مقدار ویژگی"}],
  "title_en": "English product title",
  "slug": "persian-url-safe-slug-with-hyphens",
  "seo_title": "عنوان SEO 50 تا 60 کاراکتر",
  "seo_description": "توضیحات متا SEO 120 تا 160 کاراکتر فارسی"
}`;

  return { systemPrompt, userPrompt };
}
