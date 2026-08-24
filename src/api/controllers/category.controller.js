import catchAsync from "../../utils/catchAsync.js";
import {GetAllCategories,GetCategoryById,GetCategoryByslug} from "../services/category.services.js";

const getAllCategories = catchAsync(async (req, res) => {
  await GetAllCategories(req, res);
});

const getCategoryById = catchAsync(async (req, res) => {
  await GetCategoryById(req, res);
});

const getCategoryByslug = catchAsync(async (req, res) => {
  await GetCategoryByslug(req, res);
});


export { getAllCategories, GetCategoryById, getCategoryByslug };