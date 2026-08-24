import Post from '../models/Post.model.js';
import User from '../models/User.model.js';
import Category from '../models/Category.model.js';

const seedPosts = async () => {
  let inserted = 0;
  let skipped = 0;

  // Users
  const user1 = await User.findOne({ username: 'user1' });
  const user2 = await User.findOne({ username: 'user2' });
  const user3 = await User.findOne({ username: 'user3' });

  if (!user1 || !user2 || !user3) {
    throw new Error('Required seed users not found');
  }

  // Categories
  const technology = await Category.findOne({ slug: 'technology' });
  const education = await Category.findOne({ slug: 'education' });
  const travel = await Category.findOne({ slug: 'travel' });
  const lifestyle = await Category.findOne({ slug: 'lifestyle' });
  const food = await Category.findOne({ slug: 'food' });
  const business = await Category.findOne({ slug: 'business' });
  const entertainment = await Category.findOne({ slug: 'entertainment' });
  const science = await Category.findOne({ slug: 'science' });

  if (
    !technology ||
    !education ||
    !travel ||
    !lifestyle ||
    !food ||
    !business ||
    !entertainment ||
    !science
  ) {
    throw new Error('Required seed categories not found');
  }

  const defaultPosts = [
    // ============================================
    // FREE POSTS
    // ============================================

    {
      title: 'Getting Started with Modern Web Development',
      slug: 'getting-started-with-modern-web-development',
      content:
        'Modern web development involves frontend development, backend development, databases, APIs, authentication, and deployment. This guide introduces the fundamental concepts every beginner should understand.',
      author: user1._id,
      categories: [technology._id, education._id],
      status: 'published',
      isPremium: false,
      price: 0,
      publishedDate: new Date('2026-07-01'),
      views: 1250,
      isDeleted: false
    },

    {
      title: 'How to Build Better Study Habits',
      slug: 'how-to-build-better-study-habits',
      content:
        'Developing good study habits requires consistency, planning, focused sessions, and regular breaks. Small improvements to your daily routine can make learning more effective.',
      author: user2._id,
      categories: [education._id, technology._id],
      status: 'published',
      isPremium: false,
      price: 0,
      publishedDate: new Date('2026-06-15'),
      views: 8700,
      isDeleted: false
    },

    {
      title: 'The Ultimate Guide to Budget Travel',
      slug: 'the-ultimate-guide-to-budget-travel',
      content:
        'Traveling does not have to be expensive. With proper planning, you can reduce transportation, accommodation, and food costs while still enjoying a memorable trip.',
      author: user2._id,
      categories: [travel._id, lifestyle._id],
      status: 'published',
      isPremium: false,
      price: 0,
      publishedDate: new Date('2026-08-01'),
      views: 320,
      isDeleted: false
    },

    {
      title: 'How Streaming Changed Entertainment',
      slug: 'how-streaming-changed-entertainment',
      content:
        'Streaming platforms have transformed how people discover movies, television shows, music, and other forms of entertainment.',
      author: user1._id,
      categories: [entertainment._id, technology._id],
      status: 'published',
      isPremium: false,
      price: 0,
      publishedDate: new Date('2026-07-25'),
      views: 1900,
      isDeleted: false
    },

    {
      title: 'The Ultimate Guide to Home Cooking',
      slug: 'the-ultimate-guide-to-home-cooking',
      content:
        'Cooking at home can save money, improve health, and be a rewarding experience. This guide covers kitchen essentials, basic techniques, and simple recipes for everyday meals.',
      author: user3._id,
      categories: [food._id, lifestyle._id],
      status: 'published',
      isPremium: false,
      price: 0,
      publishedDate: new Date('2026-08-10'),
      views: 450,
      isDeleted: false
    },

    // ============================================
    // PREMIUM POSTS (Different prices)
    // ============================================

    {
      title: 'Advanced Node.js Backend Architecture',
      slug: 'advanced-nodejs-backend-architecture',
      content:
        'Learn how to structure a scalable Node.js backend using controllers, services, middleware, models, authentication, validation, and error handling.',
      premiumContent:
        'This premium section contains advanced architecture patterns, project structure recommendations, and techniques for building maintainable Node.js applications.',
      author: user1._id,
      categories: [technology._id],
      status: 'published',
      isPremium: true,
      price: 4.99,
      publishedDate: new Date('2026-07-05'),
      views: 2450,
      isDeleted: false
    },

    {
      title: 'Building Scalable Software Systems',
      slug: 'building-scalable-software-systems',
      content:
        'Scalable software systems require careful architecture, database design, caching, monitoring, and reliable deployment strategies.',
      premiumContent:
        'This premium guide explores advanced system architecture, caching strategies, database optimization, load balancing, and distributed systems.',
      author: user1._id,
      categories: [technology._id, business._id],
      status: 'published',
      isPremium: true,
      price: 9.99,
      publishedDate: new Date('2026-07-20'),
      views: 5600,
      isDeleted: false
    },

    {
      title: 'The Complete Guide to Artificial Intelligence',
      slug: 'the-complete-guide-to-artificial-intelligence',
      content:
        'Artificial intelligence continues to change software development, education, business, and many other industries.',
      premiumContent:
        'This premium article explores upcoming AI technologies, development trends, and how businesses can prepare for the next generation of intelligent systems.',
      author: user1._id,
      categories: [technology._id, science._id],
      status: 'published',
      isPremium: true,
      price: 14.99,
      publishedDate: new Date('2026-07-28'),
      views: 1800,
      isDeleted: false
    },

    {
      title: 'Mastering System Architecture & Design Patterns',
      slug: 'mastering-system-architecture-design-patterns',
      content:
        'This comprehensive guide covers system architecture, design patterns, microservices, event-driven architecture, and best practices for building robust applications.',
      premiumContent:
        'This premium section dives deep into architectural styles, design patterns, and practical implementations with real-world case studies.',
      author: user2._id,
      categories: [technology._id, business._id],
      status: 'published',
      isPremium: true,
      price: 19.99,
      publishedDate: new Date('2026-08-15'),
      views: 3200,
      isDeleted: false
    },

    {
      title: 'Entrepreneurship: From Idea to Exit',
      slug: 'entrepreneurship-from-idea-to-exit',
      content:
        'Building a successful business requires vision, strategy, execution, and adaptability. Learn the key principles of entrepreneurship and business growth.',
      premiumContent:
        'This premium guide covers funding strategies, team building, product-market fit, scaling operations, and successful exit strategies with real examples.',
      author: user2._id,
      categories: [business._id, education._id],
      status: 'published',
      isPremium: true,
      price: 24.99,
      publishedDate: new Date('2026-08-20'),
      views: 420,
      isDeleted: false
    },

    // ============================================
    // DRAFT / SCHEDULED / PENDING
    // ============================================

    {
      title: 'Understanding Database Indexes',
      slug: 'understanding-database-indexes',
      content:
        'Database indexes improve query performance by allowing databases to find documents more efficiently.',
      author: user1._id,
      categories: [technology._id, education._id],
      status: 'draft',
      isPremium: false,
      price: 0,
      views: 0,
      isDeleted: false
    },

    {
      title: 'The Future of Artificial Intelligence in 2027',
      slug: 'the-future-of-artificial-intelligence-2027',
      content:
        'Artificial intelligence continues to change software development, education, business, and many other industries.',
      premiumContent:
        'This premium article explores upcoming AI technologies, development trends, and how businesses can prepare for the next generation of intelligent systems.',
      author: user1._id,
      categories: [technology._id, science._id],
      status: 'scheduled',
      isPremium: true,
      price: 12.99,
      publishedDate: new Date('2026-09-01'),
      views: 0,
      isDeleted: false
    },

    {
      title: 'Starting a Small Online Business',
      slug: 'starting-a-small-online-business',
      content:
        'Starting an online business requires a clear idea, understanding your audience, creating a useful product, and developing a sustainable marketing strategy.',
      author: user2._id,
      categories: [business._id],
      status: 'pending',
      isPremium: false,
      price: 0,
      views: 0,
      isDeleted: false
    },

    {
      title: 'The Science Behind Better Sleep',
      slug: 'the-science-behind-better-sleep',
      content:
        'Sleep plays an important role in productivity, learning, and overall daily performance. This article explores the science behind healthy sleep habits.',
      premiumContent:
        'The premium section provides a detailed guide to sleep schedules, sleep environments, and practical techniques for improving sleep quality.',
      author: user2._id,
      categories: [science._id, lifestyle._id],
      status: 'pending',
      isPremium: true,
      price: 7.99,
      views: 0,
      isDeleted: false
    },

    // ============================================
    // ARCHIVED / DELETED
    // ============================================

    {
      title: 'Old Web Development Trends',
      slug: 'old-web-development-trends',
      content:
        'A look at older web development trends and technologies that shaped modern web applications.',
      author: user2._id,
      categories: [technology._id],
      status: 'archived',
      isPremium: false,
      price: 0,
      publishedDate: new Date('2025-01-10'),
      views: 3400,
      isDeleted: false
    },

    {
      title: 'Legacy Database Optimization',
      slug: 'legacy-database-optimization',
      content:
        'A comprehensive look at legacy database optimization techniques for older systems.',
      premiumContent:
        'This premium content covers advanced indexing strategies, query optimization, and migration strategies for legacy databases.',
      author: user1._id,
      categories: [technology._id],
      status: 'archived',
      isPremium: true,
      price: 9.99,
      publishedDate: new Date('2026-03-15'),
      views: 1200,
      isDeleted: false
    }
  ];

  for (const postData of defaultPosts) {
    const existingPost = await Post.findOne({
      slug: postData.slug
    });

    if (existingPost) {
      skipped += 1;
      continue;
    }

    await Post.create(postData);
    inserted += 1;
  }

  return { inserted, skipped };
};

export default seedPosts;