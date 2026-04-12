const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Consultation = require('../models/Consultation');
const nodemailer = require('nodemailer');

// Email configuration
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Validation middleware
const validateConsultation = [
    body('personalInfo.firstName').trim().notEmpty().withMessage('First name is required'),
    body('personalInfo.lastName').trim().notEmpty().withMessage('Last name is required'),
    body('personalInfo.email').isEmail().withMessage('Valid email is required'),
    body('personalInfo.phone').notEmpty().withMessage('Phone number is required'),
    body('personalInfo.country').notEmpty().withMessage('Country is required'),
    body('medicalIntent.serviceType').notEmpty().withMessage('Service type is required'),
    body('medicalIntent.urgency').notEmpty().withMessage('Urgency level is required'),
    body('financialInfo.budget').notEmpty().withMessage('Budget range is required'),
    body('financialInfo.paymentMethod').notEmpty().withMessage('Payment method is required')
];

// POST /api/consultations - Submit new consultation request
router.post('/', validateConsultation, async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        // Create new consultation
        const consultation = new Consultation({
            ...req.body,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        await consultation.save();

        // Send confirmation email to patient
        const patientEmailHtml = `
            <h2>Thank you for your inquiry, ${consultation.personalInfo.firstName}!</h2>
            <p>We have received your consultation request for <strong>${consultation.medicalIntent.serviceType}</strong>.</p>
            <p>Our medical coordinators will review your case and contact you within 24-48 hours.</p>
            <h3>Your Reference Number: <strong>${consultation._id}</strong></h3>
            <p>Please keep this number for your records.</p>
            <hr>
            <p>Best regards,<br>ChinaMed Connect Team</p>
        `;

        await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: consultation.personalInfo.email,
            subject: 'Consultation Request Received - ChinaMed Connect',
            html: patientEmailHtml
        });

        // Send notification email to admin
        const adminEmailHtml = `
            <h2>🆕 New Consultation Request</h2>
            <p><strong>Patient:</strong> ${consultation.fullName}</p>
            <p><strong>Email:</strong> ${consultation.personalInfo.email}</p>
            <p><strong>Phone:</strong> ${consultation.personalInfo.phone}</p>
            <p><strong>Country:</strong> ${consultation.personalInfo.country}</p>
            <hr>
            <p><strong>Service:</strong> ${consultation.medicalIntent.serviceType}</p>
            <p><strong>Urgency:</strong> ${consultation.medicalIntent.urgency}</p>
            <p><strong>Budget:</strong> ${consultation.financialInfo.budget}</p>
            <p><strong>Payment:</strong> ${consultation.financialInfo.paymentMethod}</p>
            <p><strong>Preferred Region:</strong> ${consultation.medicalIntent.preferredRegion}</p>
            <hr>
            <p><strong>Condition:</strong> ${consultation.medicalIntent.currentCondition || 'Not specified'}</p>
            <p><strong>Challenges:</strong> ${consultation.currentChallenges.join(', ') || 'None specified'}</p>
            <hr>
            <p><strong>Reference ID:</strong> ${consultation._id}</p>
            <p><a href="${process.env.ADMIN_URL}/consultations/${consultation._id}">View in Admin Panel</a></p>
        `;

        await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: process.env.ADMIN_EMAIL,
            subject: `New Consultation: ${consultation.medicalIntent.serviceType} - ${consultation.personalInfo.country}`,
            html: adminEmailHtml
        });

        res.status(201).json({
            success: true,
            message: 'Consultation request submitted successfully',
            data: {
                referenceId: consultation._id,
                email: consultation.personalInfo.email
            }
        });

    } catch (error) {
        console.error('Error creating consultation:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting consultation request'
        });
    }
});

// GET /api/consultations/:id - Get consultation by reference ID
router.get('/:id', async (req, res) => {
    try {
        const consultation = await Consultation.findById(req.params.id)
            .select('-notes -ipAddress -userAgent'); // Exclude internal fields

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
            message: 'Error retrieving consultation'
        });
    }
});

// POST /api/consultations/quick-inquiry - Simple email inquiry (from hero section)
router.post('/quick-inquiry', [
    body('email').isEmail().withMessage('Valid email is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { email } = req.body;

        // Send welcome email
        await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: email,
            subject: 'Welcome to ChinaMed Connect',
            html: `
                <h2>Thank you for your interest!</h2>
                <p>We're excited to help you explore affordable, world-class healthcare options in China and Taiwan.</p>
                <p>A medical coordinator will reach out to you within 24 hours to discuss your needs.</p>
                <p>In the meantime, feel free to browse our partner hospitals and services.</p>
                <hr>
                <p>Best regards,<br>ChinaMed Connect Team</p>
            `
        });

        // Notify admin
        await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: process.env.ADMIN_EMAIL,
            subject: 'New Quick Inquiry',
            html: `<p>New email inquiry from: <strong>${email}</strong></p>`
        });

        res.json({
            success: true,
            message: 'Thank you! We will contact you soon.'
        });

    } catch (error) {
        console.error('Error processing quick inquiry:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing inquiry'
        });
    }
});

module.exports = router;
