import express from 'express';
import {protect} from "../../middleware/auth.js";
import {createPost, getAllPosts, updatePost, deletePost,getUserPosts,searchPosts} from "../../controllers/post.controller.js";
import validate from '../../middleware/validation.js';
import {createPostValidationSchema,updatePostValidationSchema,deletePostValidationSchema} from "../../validations/post.validation.js";


const router = express.Router();
router.use(protect); // Apply authentication middleware to all routes in this router
router.get('/search', searchPosts); // Search posts route should be defined before the general GET route
router.post('/', validate(createPostValidationSchema), createPost);
router.get('/', getAllPosts);
router.get('/user', getUserPosts);
router.put('/:postId', validate(updatePostValidationSchema), updatePost);
router.delete('/:postId', validate(deletePostValidationSchema,'params'), deletePost);

export default router;