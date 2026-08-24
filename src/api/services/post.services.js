import { generateUniqueSlug } from "../../utils/helpers.js";
import mongoose from "mongoose";
import { Post } from "../../database/models/index.js";


// Create a new post
const CreatePost = async (postData) => {
    const {
        title,
        content,
        author,
        isPremium,
        premiumContent,
        categories,
        price,
        status
    } = postData;

    let slug = title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    slug = await generateUniqueSlug(slug);

    const post = new Post({
        title,
        content,
        author,
        status,
        slug,
        isPremium,
        premiumContent: isPremium ? premiumContent : null,
        categories: categories || [],
        price: isPremium ? (price || 0) : 0,
        views: 0
    });

    await post.save();
    return post;
};

const GetAllPosts = async (limit, afterId) => {
    const query = { status: 'published' };
    if (afterId) {
        // Decode the Base64 cursor to get the actual ID
        const decodedCursor = Buffer.from(afterId, 'base64').toString('utf8');
        query._id = { $gt: new mongoose.Types.ObjectId(decodedCursor) };
    }

    const posts = await Post.find(query)
        .select('-premiumContent -views')
        .populate('author', 'username email')
        .populate('categories', 'name slug')
        .lean()
        .limit(limit + 1)
        .sort({ _id: 1 });

    const hasMore = posts.length > limit;
    const data = hasMore ? posts.slice(0, limit) : posts;

    let nextCursor = null;
    if (hasMore && data.length > 0) {
        const lastItem = data[data.length - 1];
        // Encode the _id as Base64
        nextCursor = Buffer.from(lastItem._id.toString()).toString('base64');
    }

    return {
        posts: data,
        hasMore: hasMore,
        nextCursor: nextCursor
    };
};

const UpdatePost = async (postId, updateData) => {
    const post = await Post.findById(postId);
    if (!post) {
        throw new Error('Post not found');
    }
    if (updateData.title) {
        post.slug = updateData.title
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    let existingPost = await Post.findOne({ slug: post.slug, _id: { $ne: postId } });

    let counter = 1;
    while (existingPost) {
        post.slug = `${post.slug}-${counter}`;
        existingPost = await Post.findOne({ slug: post.slug, _id: { $ne: postId } });
        counter++;
    }
    updateData.slug = post.slug;
    Object.assign(post, updateData);
    await post.save();
    return post;
};

const DeletePost = async (postId) => {
    const post = await Post.findById(postId);
    if (!post) {
        throw new Error('Post not found');
    }
    await post.deleteOne();
    return post;
};

const GetUserPosts = async (userId) => {
    const posts = await Post.find({ author: userId }).populate('categories', 'name slug').lean();
    return posts;
};

const SearchPosts = async (searchTerm, limit = 10, afterId = null) => {
    if (!searchTerm || searchTerm.trim().length < 2) {
        throw new Error('Search term must be at least 2 characters long');
    }

    const regexPattern = new RegExp(searchTerm, 'i'); // Case-insensitive regex for search

    // ✅ 1. Build query
    const query = {
        $or: [
            { title: { $regex: regexPattern } },
            { content: { $regex: regexPattern } }
        ],
        status: 'published',
        isDeleted: false
    };


    // ✅ 2. Apply cursor (if provided)
    if (afterId) {
        const decodedCursor = Buffer.from(afterId, 'base64').toString('utf8');
        // Decode the cursor to get the actual ID
        const [createdAt, _id] = decodedCursor.split('|');
        query.createdAt = { $lt: new Date(createdAt) };
        query._id = { $lt: new mongoose.Types.ObjectId(_id) };
    }

    // ✅ 3. Fetch posts
    const posts = await Post.find(
        query,
    )
        .populate('author', 'username avatar')
        .sort({
            createdAt: -1,
            _id: -1
        })
        .limit(limit + 1)
        .select('-premiumContent');

    // ✅ 4. Check if more exist
    const hasMore = posts.length > limit;
    const data = hasMore ? posts.slice(0, limit) : posts;

    // ✅ 5. Generate next cursor
    let nextCursor = null;
    if (hasMore && data.length > 0) {
        const lastItem = data[data.length - 1];
        const cursorValue = `${lastItem.createdAt.toISOString()}|${lastItem._id}`;
        nextCursor = Buffer.from(cursorValue).toString('base64');
    }

    return {
        posts: data,
        hasMore: hasMore,
        nextCursor: nextCursor
    };
};
export { CreatePost, GetAllPosts, UpdatePost, DeletePost, GetUserPosts, SearchPosts };
