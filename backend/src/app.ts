import express from 'express';

const app = express();

// middleware
app.use(express.json());

// routes
app.get('/', (req, res) => {
    res.send("Secure Software Development Project");
});

app.get("/health", (req,res) => {
    res.json({ status: 'ok' });
});

export default app;


