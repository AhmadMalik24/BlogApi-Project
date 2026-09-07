import Post from '../database/models/Post.model.js';

const getExpiryDate = (duration) => {
    const now = new Date();
    const value = parseInt(duration);
    const unit = duration.replace(String(value), '');

    switch (unit) {
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


/**
 * Builds the Custom Account payload adhering to Stripe Custom Connect requirements.
 */

const PLATFORM_COUNTRY = process.env.STRIPE_PLATFORM_COUNTRY?.toUpperCase() || 'AU';

const industryToMcc = {
    software: '7372',
    'computer software': '7372'
};


const buildCustomAccountPayload = (user, isUpdate = false) => {
    const profile = user.stripeOnboardingProfile || {};
    console.log("Building Custom Account Payload for user:", user.id, "with profile:", profile);
    console.log("IsUpdate flag:", isUpdate);
    
    const address = profile.homeAddress;

    const stripeAddress = address ? {
        country: address.country || PLATFORM_COUNTRY,
        line1: address.streetAddress,
        line2: address.apartmentUnit || undefined,
        city: address.suburb,
        state: address.state,
        postal_code: address.postalCode
    } : undefined;

    const dateOfBirth = profile.dateOfBirth ? new Date(profile.dateOfBirth) : null;
    const dob = dateOfBirth ? {
        day: dateOfBirth.getUTCDate(),
        month: dateOfBirth.getUTCMonth() + 1,
        year: dateOfBirth.getUTCFullYear()
    } : undefined;

    const isCompany = profile.businessType === 'company';

    // 1. BASE PAYLOAD (Safe for both creation AND updates)
    const accountData = {
        business_profile: {
            mcc: industryToMcc[profile.industry?.toLowerCase()] || '7372',
            url: profile.website || undefined,
            product_description: profile.productDescription || 'Digital content creator'
        },
        metadata: {
            userId: user._id.toString(),
            declaredBusinessType: profile.businessType || 'individual'
        }
    };

    // 2. CREATION ONLY (Stripe will throw an error if these are sent in an update)
    if (!isUpdate) {
        accountData.type = 'custom';
        accountData.country = PLATFORM_COUNTRY;
        accountData.email = user.email;
        accountData.business_type = isCompany ? 'company' : 'individual';
        accountData.capabilities = {
            transfers: { requested: true },
            card_payments: { requested: true }
        };
        accountData.tos_acceptance = {
            date: Math.floor(Date.now() / 1000),
            ip: '127.0.0.1' 
        };
    }

    // 3. IDENTITY DATA
    if (isCompany) {
        accountData.company = {
            name: profile.legalBusinessName || `${user.firstName} ${user.lastName}`,
            phone: profile.phoneNumber,
            address: stripeAddress,
            tax_id: profile.hasABN ? profile.abnNumber : undefined
        };
    } else {
        accountData.individual = {
            first_name: profile.legalFirstName || user.firstName,
            last_name: profile.legalLastName || user.lastName,
            email: user.email,
            phone: profile.phoneNumber,
            dob: dob,
            address: stripeAddress,
            // ---------------------------------------------------------
            // AUTOMATIC TEST BYPASS: Instantly verifies the account
            // ---------------------------------------------------------
            verification: process.env.NODE_ENV !== 'production' ? {
                document: {
                    front: 'file_identity_document_success'
                }
            } : undefined
        };
    }

    return accountData;
};

export { getExpiryDate, generateUniqueSlug, buildCustomAccountPayload };