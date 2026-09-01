import { cors } from "./src/config/index.js";
import connectDB from "./src/database/connection/mongodb.js";
import express from "express";
import dotenv from "dotenv";
import apiRouter from "./src/api/routes/index.js";
import { notFoundHandler, errorHandler } from "./src/api/middleware/errorHandler.js";
import setupSwagger from "./src/config/swagger.js";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors);
app.use('/api', apiRouter);
setupSwagger(app);
app.use(errorHandler);
// Routes
// Define your routes here (e.g., app.use('/api/users', userRoutes);)

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});