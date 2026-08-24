import express from 'express';
import {getAllCategories, GetCategoryById, getCategoryByslug } from '../../controllers/category.controller.js';

const router = express.Router();

router.get('/', getAllCategories);
router.get('/:id', GetCategoryById);
router.get('/slug/:slug', getCategoryByslug);

export default router;