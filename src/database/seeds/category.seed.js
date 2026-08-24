import Category from "../models/Category.model.js";

const defaultCategories = [
  { name: 'Technology', slug: 'technology', description: 'All about technology', isActive: true },
  { name: 'Health', slug: 'health', description: 'Health and wellness topics', isActive: true },
  { name: 'Lifestyle', slug: 'lifestyle', description: 'Lifestyle and living tips', isActive: true },
  { name: 'Travel', slug: 'travel', description: 'Travel guides and tips', isActive: true },
  { name: 'Food', slug: 'food', description: 'Recipes and food reviews', isActive: true },
  { name: 'Education', slug: 'education', description: 'Educational resources and tips', isActive: true },
  { name: 'Business', slug: 'business', description: 'Business news and advice', isActive: true },
  { name: 'Entertainment', slug: 'entertainment', description: 'Movies, music, and more', isActive: true },
  { name: 'Sports', slug: 'sports', description: 'Sports news and updates', isActive: true },
  { name: 'Science', slug: 'science', description: 'Scientific discoveries and research', isActive: true },
  { name: 'Arts', slug: 'arts', description: 'Art and culture', isActive: true },
];

const seedCategories = async () => {
  let inserted = 0;
  let skipped = 0;

  for (const categoryData of defaultCategories) {
    const existingCategory = await Category.findOne({ slug: categoryData.slug });

    if (existingCategory) {
      skipped += 1;
      continue;
    }

    await Category.create(categoryData);
    inserted += 1;
  }

  return { inserted, skipped };
};

export default seedCategories;
