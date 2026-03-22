import express from 'express';
import { routes } from './routes';

const app = express();

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// routes
app.use("/api", routes);

export default app;


