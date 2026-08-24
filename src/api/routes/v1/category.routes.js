import express from 'express';
import {getAllCategories, GetCategoryById, getCategoryByslug } from '../../controllers/category.controller.js';

const router = express.Router();

router.get('/', getAllCategories);

/**
 * @swagger
 * /Cat:
 *   get:
 *     summary: Get all active categories
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: List of categories retrieved successfully
 */

router.get('/:id', GetCategoryById);

/**
 * @swagger
 * /Cat/{id}:
 *   get:
 *     summary: Get category by ID
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category found
 *       404:
 *         description: Category not found
 */

router.get('/slug/:slug', getCategoryByslug);

/**
 * @swagger
 * /Cat/slug/{slug}:
 *   get:
 *     summary: Get category by slug
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category found
 *       404:
 *         description: Category not found
 */

export default router;