const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');

const prisma = new PrismaClient();

// Zod Schemas
const userSchema = z.object({
    email: z.string().email(),
    name: z.string().min(2).optional(),
});

const idSchema = z.object({
    id: z.string().transform((val) => parseInt(val, 10)).refine((val) => !isNaN(val), { message: "Invalid ID" }),
});

// GET /users - Get all users
router.get('/', async (req, res) => {
    try {
        const users = await prisma.user.findMany();
        res.json(users);
    } catch (error) {
        req.log.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /users - Create a user
router.post('/', async (req, res) => {
    try {
        const validatedData = userSchema.parse(req.body);
        const user = await prisma.user.create({
            data: validatedData,
        });
        res.status(201).json(user);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ errors: error.errors });
        }
        req.log.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PUT /users/:id - Update a user
router.put('/:id', async (req, res) => {
    try {
        const { id } = idSchema.parse(req.params);
        const validatedData = userSchema.parse(req.body);

        const user = await prisma.user.update({
            where: { id },
            data: validatedData,
        });
        res.json(user);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ errors: error.errors });
        }
        req.log.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// DELETE /users/:id - Delete a user
router.delete('/:id', async (req, res) => {
    try {
        const { id } = idSchema.parse(req.params);
        await prisma.user.delete({
            where: { id },
        });
        res.status(204).send();
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ errors: error.errors });
        }
        req.log.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
