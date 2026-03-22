import { Router } from "express";

export const authRouter = Router();

authRouter.post('/register', (req, res) => {
    const { fullName, email, username, password, phone } = req.body;

    if (!fullName || fullName.length < 3) {
        return res.status(400).json({ error: 'Invalid full name.'});
    };

    if (!email || !email.includes("@")) {
        return res.status(400).json ({ error: 'Invalid email.'});
    };

    if (!username || username.length < 3) {
        return res.status(400).json({ error: 'Invalid username' });
    };

    if (!password || password.length < 8) {
        return res.status(400).json({ error: 'Password too short' });
    };

    if (!phone) {
        return res.status(400).json({ error: 'Phone required'});
    };

    return res.json({ message: 'Register successfull.'});
});

authRouter.post('/login', (req, res) => {
    const { identifier, password } = req.body;
    
    if (!identifier) {
        return res.status(400).json({ error: 'Username / Email required.'});
    };

    if (!password) {
        return res.status(400).json({ error: 'Password required.'});
    };

    return res.json({ message: 'Login successful.'});
});



