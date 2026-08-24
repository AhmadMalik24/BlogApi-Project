import catchAsync from "../../utils/catchAsync.js";
import { CreatePost, GetAllPosts, UpdatePost, DeletePost, GetUserPosts,SearchPosts } from "../services/post.services.js";

const createPost = catchAsync(async (req, res) => {
    const {
        title,
        content,
        isPremium,
        premiumContent,
        categories,
        price,
        status
    } = req.body;

    if (!req.user || !req.user.id) {
        const error = new Error('Authentication required');
        error.statusCode = 401;
        throw error;
    }

    const post = await CreatePost({
        title,
        content,
        author: req.user.id,
        isPremium,
        premiumContent,
        categories,
        price,
        status
    });
    res.status(201).json({ message: 'Post created successfully', post });
});

const getAllPosts = catchAsync(async (req, res) => {
    const limit = parseInt(req.query.limit) || 3; // Default limit to 3 if not provided
    const afterId = req.query.afterId || null; // Get the last post ID from the query parameter
    const posts = await GetAllPosts(limit, afterId);
    res.status(200).json({ message: 'Posts retrieved successfully', posts });
});

const getUserPosts = catchAsync(async (req, res) => {
    if (!req.user || !req.user.id) {
        const error = new Error('Authentication required');
        error.statusCode = 401;
        throw error;
    }

    const posts = await GetUserPosts(req.user.id);
    res.status(200).json({ message: 'User posts retrieved successfully', posts });
});

const updatePost = catchAsync(async (req, res) => {
    const { postId } = req.params;
    console.log('Updating post with ID:', postId); // Debugging line
    const updateData = req.body;

    const updatedPost = await UpdatePost(postId, updateData);
    res.status(200).json({ message: 'Post updated successfully', post: updatedPost });
});

const deletePost = catchAsync(async (req, res) => {
    const { postId } = req.params;

    await DeletePost(postId);
    res.status(200).json({ message: 'Post deleted successfully' });
});

const searchPosts = catchAsync(async (req, res) => {
    const { query } = req.query;
    const limit = parseInt(req.query.limit) || 3; // Default limit to 3 if not provided
    const afterId = req.query.afterId || null; // Get the last post ID from the query parameter

    const posts = await SearchPosts(query, limit, afterId);
    res.status(200).json({ message: 'Search results retrieved successfully', posts });
});

export { createPost, getAllPosts, updatePost, deletePost, getUserPosts, searchPosts };
