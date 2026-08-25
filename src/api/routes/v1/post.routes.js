import express from 'express';
import {protect} from "../../middleware/auth.js";
import {createPost, getAllPosts, updatePost, deletePost,getUserPosts,searchPosts} from "../../controllers/post.controller.js";
import validate from '../../middleware/validation.js';
import {createPostValidationSchema,updatePostValidationSchema,deletePostValidationSchema} from "../../validations/post.validation.js";


const router = express.Router();
router.use(protect); 
router.get('/search', searchPosts); // Search posts route should be defined before the general GET route

/**
 * @swagger
 * /Post/search:
 *   get:
 *     summary: Search published posts
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: afterId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Search results retrieved
 */

router.post('/', validate(createPostValidationSchema), createPost);

/**
 * @swagger
 * /Post:
 *   post:
 *     summary: Create a new post
 *     tags: [Posts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, content, status]
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               isPremium:
 *                 type: boolean
 *               premiumContent:
 *                 type: string
 *               categories:
 *                 type: array
 *                 items:
 *                   type: string
 *               price:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [draft, published, archived, scheduled, pending]
 *     responses:
 *       201:
 *         description: Post created successfully
 */

router.get('/', getAllPosts);

/**
 * @swagger
 * /Post:
 *   get:
 *     summary: Get all published posts (paginated)
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: afterId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Posts retrieved successfully
 */

router.get('/user', getUserPosts);

/**
 * @swagger
 * /Post/user:
 *   get:
 *     summary: Get posts authored by logged-in user
 *     tags: [Posts]
 *     responses:
 *       200:
 *         description: User posts retrieved successfully
 */

router.put('/:postId', validate(updatePostValidationSchema), updatePost);

/**
 * @swagger
 * /Post/{postId}:
 *   put:
 *     summary: Update an existing post
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Post updated successfully
 */


router.delete('/:postId', validate(deletePostValidationSchema,'params'), deletePost);

/**
 * @swagger
 * /Post/{postId}:
 *   delete:
 *     summary: Delete a post
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Post deleted successfully
 */

export default router;