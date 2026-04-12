const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const Admin = require('../models/Admin');
const Consultation = require('../models/Consultation');

// Authentication middleware
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'No authentication token provided' 
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const admin = await Admin.findById(decoded.id);

        if (!admin || !admin.isActive) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid authentication' 
            });
        }

        req.admin = admin;
        next();
    } catch (error) {
        res.status(401).json({ 
            success: false, 
            message: 'Authentication failed' 
        });
    }
};

// POST /api/admin/login - Admin login
router.post('/login', [
    body('username').trim().notEmpty(),
    body('password').notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                errors: errors.array() 
            });
        }

        const { username, password } = req.body;

        // Find admin
        const admin = await Admin.findOne({ username: username.toLowerCase() });
        if (!admin) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }

        // Check if active
        if (!admin.isActive) {
            return res.status(401).json({ 
                success: false, 
                message: 'Account is disabled' 
            });
        }

        // Verify password
        const isMatch = await admin.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }

        // Update last login
        admin.lastLogin = new Date();
        await admin.save();

        // Generate JWT
        const token = jwt.sign(
            { id: admin._id, role: admin.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            data: {
                token,
                admin: {
                    id: admin._id,
                    username: admin.username,
                    email: admin.email,
                    fullName: admin.fullName,
                    role: admin.role,
                    permissions: admin.permissions
                }
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Login failed' 
        });
    }
});

// GET /api/admin/consultations - Get all consultations with filters
router.get('/consultations', authMiddleware, async (req, res) => {
    try {
        const { 
            status, 
            serviceType, 
            region, 
            page = 1, 
            limit = 20,
            search,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Build filter
        const filter = {};
        
        if (status) filter.status = status;
        if (serviceType) filter['medicalIntent.serviceType'] = serviceType;
        if (region) filter['medicalIntent.preferredRegion'] = region;
        
        if (search) {
            filter.$or = [
                { 'personalInfo.firstName': new RegExp(search, 'i') },
                { 'personalInfo.lastName': new RegExp(search, 'i') },
                { 'personalInfo.email': new RegExp(search, 'i') }
            ];
        }

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

        // Execute query
        const consultations = await Consultation.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))
            .populate('assignedTo', 'fullName email');

        const total = await Consultation.countDocuments(filter);

        // Get statistics
        const stats = await Consultation.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                consultations,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / parseInt(limit))
                },
                stats: stats.reduce((acc, stat) => {
                    acc[stat._id] = stat.count;
                    return acc;
                }, {})
            }
        });

    } catch (error) {
        console.error('Error fetching consultations:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching consultations' 
        });
    }
});

// GET /api/admin/consultations/:id - Get single consultation
router.get('/consultations/:id', authMiddleware, async (req, res) => {
    try {
        const consultation = await Consultation.findById(req.params.id)
            .populate('assignedTo', 'fullName email');

        if (!consultation) {
            return res.status(404).json({ 
                success: false, 
                message: 'Consultation not found' 
            });
        }

        res.json({
            success: true,
            data: consultation
        });

    } catch (error) {
        console.error('Error fetching consultation:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching consultation' 
        });
    }
});

// PUT /api/admin/consultations/:id - Update consultation
router.put('/consultations/:id', authMiddleware, async (req, res) => {
    try {
        const { status, assignedTo, notes } = req.body;

        const consultation = await Consultation.findById(req.params.id);
        if (!consultation) {
            return res.status(404).json({ 
                success: false, 
                message: 'Consultation not found' 
            });
        }

        // Update fields
        if (status) consultation.status = status;
        if (assignedTo) consultation.assignedTo = assignedTo;
        
        // Add note if provided
        if (notes) {
            consultation.notes.push({
                author: req.admin.fullName,
                content: notes,
                createdAt: new Date()
            });
        }

        consultation.lastContactDate = new Date();
        await consultation.save();

        res.json({
            success: true,
            data: consultation,
            message: 'Consultation updated successfully'
        });

    } catch (error) {
        console.error('Error updating consultation:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error updating consultation' 
        });
    }
});

// GET /api/admin/analytics - Dashboard analytics
router.get('/analytics', authMiddleware, async (req, res) => {
    try {
        const { timeRange = '30d' } = req.query;

        // Calculate date range
        const now = new Date();
        let startDate = new Date();
        
        switch(timeRange) {
            case '7d':
                startDate.setDate(now.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(now.getDate() - 30);
                break;
            case '90d':
                startDate.setDate(now.getDate() - 90);
                break;
            default:
                startDate.setDate(now.getDate() - 30);
        }

        // Total consultations
        const totalConsultations = await Consultation.countDocuments({
            createdAt: { $gte: startDate }
        });

        // Status breakdown
        const statusBreakdown = await Consultation.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        // Service type popularity
        const serviceTypes = await Consultation.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            { $group: { _id: '$medicalIntent.serviceType', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Regional distribution
        const regions = await Consultation.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            { $group: { _id: '$medicalIntent.preferredRegion', count: { $sum: 1 } } }
        ]);

        // Budget distribution
        const budgets = await Consultation.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            { $group: { _id: '$financialInfo.budget', count: { $sum: 1 } } }
        ]);

        // Top countries
        const countries = await Consultation.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            { $group: { _id: '$personalInfo.country', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Daily trend
        const dailyTrend = await Consultation.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            success: true,
            data: {
                totalConsultations,
                statusBreakdown,
                serviceTypes,
                regions,
                budgets,
                countries,
                dailyTrend,
                timeRange
            }
        });

    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching analytics' 
        });
    }
});

// POST /api/admin/create - Create first admin (run once)
router.post('/create', async (req, res) => {
    try {
        // Check if any admin exists
        const existingAdmin = await Admin.findOne();
        if (existingAdmin) {
            return res.status(403).json({ 
                success: false, 
                message: 'Admin already exists. Use /login to access.' 
            });
        }

        const { username, email, password, fullName } = req.body;

        const admin = new Admin({
            username,
            email,
            password,
            fullName,
            role: 'admin',
            permissions: {
                viewConsultations: true,
                editConsultations: true,
                deleteConsultations: true,
                manageUsers: true,
                viewAnalytics: true
            }
        });

        await admin.save();

        res.status(201).json({
            success: true,
            message: 'Admin account created successfully',
            data: {
                username: admin.username,
                email: admin.email
            }
        });

    } catch (error) {
        console.error('Error creating admin:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error creating admin account' 
        });
    }
});

module.exports = router;
