import Post from '../database/models/Post.model.js';

const getExpiryDate = (duration) => {
    const now = new Date();
    const value = parseInt(duration);
    const unit = duration.replace(String(value), '');
    
    switch(unit) {
        case 's': now.setSeconds(now.getSeconds() + value); break;
        case 'm': now.setMinutes(now.getMinutes() + value); break;
        case 'h': now.setHours(now.getHours() + value); break;
        case 'd': now.setDate(now.getDate() + value); break;
        case 'y': now.setFullYear(now.getFullYear() + value); break;
        default: now.setDate(now.getDate() + value);
    }
    return now;
};



/**
 * ✅ Generate a unique slug
 * @param {string} title - The post title
 * @param {string} excludeId - Post ID to exclude (for updates)
 * @returns {Promise<string>} - Unique slug
 */

const generateUniqueSlug = async (title, excludeId = null) => {
    // 1️⃣ Generate base slug
    let slug = title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    // 2️⃣ If slug is empty (e.g., title is special characters)
    if (!slug) {
        slug = 'post';
    }

    // 3️⃣ Check if slug exists
    const query = { slug };
    if (excludeId) {
        query._id = { $ne: excludeId };
    }

    let existingPost = await Post.findOne(query);
    let counter = 1;

    // 4️⃣ Keep checking until unique
    while (existingPost) {
        const newSlug = `${slug}-${counter}`;
        const newQuery = { slug: newSlug };
        if (excludeId) {
            newQuery._id = { $ne: excludeId };
        }
        existingPost = await Post.findOne(newQuery);
        if (!existingPost) {
            slug = newSlug;
            break;
        }
        counter++;
    }

    return slug;
};

export { getExpiryDate, generateUniqueSlug };