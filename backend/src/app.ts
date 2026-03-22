import express from 'express';
import { routes } from './routes';

// Swagger 
import SwaggerUi from 'swagger-ui-express';
import { openApiSpec } from './docs/openapi';


const app = express();

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// routes
app.use("/api", routes);

app.get('/api/docs.json', (_req, res) => {
    res.json(openApiSpec);
});
app.use('/api/docs', SwaggerUi.serve, SwaggerUi.setup(openApiSpec));


export default app;


