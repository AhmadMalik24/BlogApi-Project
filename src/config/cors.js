import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
const corsOptions = {
  origin: 'http://localhost:5000', // Allow all origins (you can specify specific origins if needed)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], // Allowed HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization', 'X-XSRF-TOKEN'], // Allowed headers
};

export default cors(corsOptions);