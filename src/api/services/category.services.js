import { Category } from "../../database/models/index.js";


const GetAllCategories = async (req, res) => {
  const categories = await Category.find({ isActive: true }).lean();
  res.status(200).json({ success: true, data: categories });
};

const GetCategoryById = async (req, res) => {
  const categoryId = req.params.id;
  const category = await Category.findById(categoryId).lean();
  if (!category) {
    return res.status(404).json({ success: false, message: "Category not found" });
  }
  res.status(200).json({ success: true, data: category });
};

const GetCategoryByslug = async (req, res) => {
  const categorySlug = req.params.slug;
  const category = await Category.findOne({ slug: categorySlug }).lean();
  if (!category) {
    return res.status(404).json({ success: false, message: "Category not found" });
  }
  res.status(200).json({ success: true, data: category });
};



export { GetAllCategories, GetCategoryById, GetCategoryByslug };
