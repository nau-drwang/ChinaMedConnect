const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { body, validationResult } = require('express-validator');
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

// Payment packages configuration
const PAYMENT_PACKAGES = {
    'consultation-basic': {
        name: 'Basic Consultation',
        price: 5000, // $50.00 in cents
        currency: 'usd',
        description: 'Initial medical consultation with treatment recommendations',
        features: [
            '30-minute video consultation',
            'Medical record review',
            'Treatment plan recommendation',
            'Hospital options overview'
        ]
    },
    'consultation-premium': {
        name: 'Premium Consultation',
        price: 15000, // $150.00
        currency: 'usd',
        description: 'Comprehensive consultation with detailed planning',
        features: [
            '60-minute video consultation',
            'Detailed medical record analysis',
            'Customized treatment plan',
            'Multiple hospital options with comparison',
            'Cost breakdown and timeline',
            'Travel arrangement assistance'
        ]
    },
    'deposit-standard': {
        name: 'Treatment Deposit',
        price: 50000, // $500.00
        currency: 'usd',
        description: 'Refundable deposit to secure hospital booking',
        features: [
            'Hospital reservation',
            'Doctor appointment scheduling',
            'Medical visa invitation letter',
            'Deductible from final treatment cost'
        ]
    }
};

// POST /api/payments/create-checkout-session
// Create Stripe Checkout Session
router.post('/create-checkout-session', [
    body('packageId').isIn(Object.keys(PAYMENT_PACKAGES)),
    body('customerEmail').isEmail(),
    body('customerName').trim().notEmpty(),
    body('consultationId').optional()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                errors: errors.array() 
            });
        }

        const { packageId, customerEmail, customerName, consultationId } = req.body;
        const package = PAYMENT_PACKAGES[packageId];

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: package.currency,
                    product_data: {
                        name: package.name,
                        description: package.description,
                    },
                    unit_amount: package.price,
                },
                quantity: 1,
            }],
            mode: 'payment',
            customer_email: customerEmail,
            client_reference_id: consultationId || 'direct-payment',
            metadata: {
                packageId,
                customerName,
                consultationId: consultationId || '',
            },
            success_url: `${process.env.FRONTEND_URL}/payment-success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/payment-cancel.html`,
            billing_address_collection: 'required',
        });

        res.json({
            success: true,
            data: {
                sessionId: session.id,
                url: session.url
            }
        });

    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error creating payment session' 
        });
    }
});

// POST /api/payments/webhook
// Stripe webhook handler
const webhookHandler = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body, 
            sig, 
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            await handleSuccessfulPayment(session);
            break;

        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log('PaymentIntent succeeded:', paymentIntent.id);
            break;

        case 'payment_intent.payment_failed':
            const failedPayment = event.data.object;
            await handleFailedPayment(failedPayment);
            break;

        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.json({received: true});
};

// Export webhook separately for raw body handling
router.webhook = webhookHandler;

// Handle successful payment
async function handleSuccessfulPayment(session) {
    try {
        const { 
            customer_email, 
            amount_total, 
            currency,
            metadata 
        } = session;

        const package = PAYMENT_PACKAGES[metadata.packageId];

        // Send confirmation email to customer
        const customerEmailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1a4d2e;">Payment Confirmed! 🎉</h2>
                <p>Dear ${metadata.customerName},</p>
                <p>Thank you for your payment. Your transaction has been successfully processed.</p>
                
                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">Payment Details</h3>
                    <p><strong>Package:</strong> ${package.name}</p>
                    <p><strong>Amount Paid:</strong> $${(amount_total / 100).toFixed(2)} ${currency.toUpperCase()}</p>
                    <p><strong>Payment ID:</strong> ${session.id}</p>
                </div>

                <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">What's Included:</h3>
                    <ul>
                        ${package.features.map(f => `<li>${f}</li>`).join('')}
                    </ul>
                </div>

                <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">Next Steps</h3>
                    <p>1. Our medical coordinator will contact you within 24 hours</p>
                    <p>2. Please prepare your medical records if you haven't already</p>
                    <p>3. We'll schedule your consultation at your convenience</p>
                </div>

                <p>If you have any questions, please don't hesitate to contact us:</p>
                <p>📧 Email: ${process.env.ADMIN_EMAIL}<br>
                📱 WhatsApp: +1 (555) 123-4567</p>

                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                <p style="color: #666; font-size: 12px;">
                    ChinaMed Connect - World-Class Healthcare at Accessible Prices<br>
                    This is an automated confirmation email. Please do not reply.
                </p>
            </div>
        `;

        await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: customer_email,
            subject: '✅ Payment Confirmed - ChinaMed Connect',
            html: customerEmailHtml
        });

        // Send notification to admin
        const adminEmailHtml = `
            <h2>💳 New Payment Received</h2>
            <p><strong>Customer:</strong> ${metadata.customerName}</p>
            <p><strong>Email:</strong> ${customer_email}</p>
            <p><strong>Package:</strong> ${package.name}</p>
            <p><strong>Amount:</strong> $${(amount_total / 100).toFixed(2)}</p>
            <p><strong>Consultation ID:</strong> ${metadata.consultationId || 'Direct Payment'}</p>
            <p><strong>Payment ID:</strong> ${session.id}</p>
            <hr>
            <p><strong>Action Required:</strong> Contact customer within 24 hours to schedule consultation.</p>
        `;

        await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: process.env.ADMIN_EMAIL,
            subject: `💰 Payment: $${(amount_total / 100).toFixed(2)} - ${metadata.customerName}`,
            html: adminEmailHtml
        });

        console.log('Payment processed successfully:', session.id);

    } catch (error) {
        console.error('Error handling successful payment:', error);
    }
}

// Handle failed payment
async function handleFailedPayment(paymentIntent) {
    try {
        console.log('Payment failed:', paymentIntent.id);
        // You can add email notification or logging here
    } catch (error) {
        console.error('Error handling failed payment:', error);
    }
}

// GET /api/payments/packages
// Get available payment packages
router.get('/packages', (req, res) => {
    const packages = Object.entries(PAYMENT_PACKAGES).map(([id, pkg]) => ({
        id,
        ...pkg,
        priceDisplay: `$${(pkg.price / 100).toFixed(2)}`
    }));

    res.json({
        success: true,
        data: packages
    });
});

// GET /api/payments/session/:sessionId
// Get checkout session details
router.get('/session/:sessionId', async (req, res) => {
    try {
        const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
        
        res.json({
            success: true,
            data: {
                id: session.id,
                status: session.payment_status,
                customerEmail: session.customer_email,
                amountTotal: session.amount_total,
                currency: session.currency
            }
        });
    } catch (error) {
        console.error('Error retrieving session:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error retrieving payment session' 
        });
    }
});

// POST /api/payments/create-payment-intent
// For custom payment forms (advanced usage)
router.post('/create-payment-intent', async (req, res) => {
    try {
        const { amount, currency = 'usd', metadata } = req.body;

        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency,
            metadata,
            automatic_payment_methods: {
                enabled: true,
            },
        });

        res.json({
            success: true,
            data: {
                clientSecret: paymentIntent.client_secret
            }
        });
    } catch (error) {
        console.error('Error creating payment intent:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error creating payment intent' 
        });
    }
});

module.exports = router;
