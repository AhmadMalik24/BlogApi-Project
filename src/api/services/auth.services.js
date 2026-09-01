import { User } from "../../database/models/index.js";
import Stripe from "stripe";
import dotenv from "dotenv";
dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});

const CreateUser = async (UserData) => {
    const { username, email, password, firstName, lastName,role ,stripeCustomerId} = UserData;
    const user = new User({
        username,
        email,
        password,
        firstName,
        lastName,
        bio: '',
        role,
        stripeCustomerId
    });
    await user.save();
    return user;
};

const GetUserByEmail = async (email) => {
    const user = await User.findOne({ email }).select('+password');
    return user;
};

const UpdateUserPassword = async (userId, newPassword) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }
    user.password = newPassword;
    await user.save();
    return user;
};

const createStripeCustomer = async (email, firstName, lastName) => {
    // Assuming you have a Stripe instance initialized as `stripe`

    const existingCustomer = await stripe.customers.list({ email });
    if (existingCustomer.data.length > 0) {
        return existingCustomer.data[0].id; // Return the existing customer ID
    }
    
    const customer = await stripe.customers.create({
        email,
        name: `${firstName} ${lastName}`,
    });
    return customer.id;
};

export { CreateUser, GetUserByEmail, UpdateUserPassword, createStripeCustomer };
