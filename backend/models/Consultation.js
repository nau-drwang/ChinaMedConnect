const mongoose = require('mongoose');

const consultationSchema = new mongoose.Schema({
    // Basic Information
    personalInfo: {
        firstName: {
            type: String,
            required: true,
            trim: true
        },
        lastName: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
        },
        phone: {
            type: String,
            required: true
        },
        country: {
            type: String,
            required: true
        },
        age: {
            type: Number,
            min: 0,
            max: 150
        },
        preferredLanguage: {
            type: String,
            enum: ['English', 'Chinese', 'Spanish', 'Other'],
            default: 'English'
        }
    },

    // Medical Intent
    medicalIntent: {
        serviceType: {
            type: String,
            required: true,
            enum: [
                'Health Checkup',
                'Cardiology',
                'Oncology',
                'Orthopedics',
                'Cosmetic Surgery',
                'Dental Care',
                'Pediatric Care',
                'TCM/Integrative Medicine',
                'Fertility Treatment',
                'Other Specialized Treatment'
            ]
        },
        urgency: {
            type: String,
            enum: ['Immediate (within 1 month)', 'Soon (1-3 months)', 'Planning (3-6 months)', 'Research (6+ months)'],
            required: true
        },
        currentCondition: {
            type: String,
            maxlength: 1000
        },
        previousDiagnosis: {
            type: String,
            maxlength: 500
        },
        preferredRegion: {
            type: String,
            enum: ['Beijing', 'Shanghai', 'Guangdong', 'Taiwan', 'Other/Flexible'],
            default: 'Other/Flexible'
        }
    },

    // Financial Information
    financialInfo: {
        budget: {
            type: String,
            enum: ['Under $5,000', '$5,000-$10,000', '$10,000-$25,000', '$25,000-$50,000', 'Over $50,000', 'Flexible'],
            required: true
        },
        paymentMethod: {
            type: String,
            enum: ['Self-Pay', 'International Insurance', 'Travel Insurance', 'Government Program', 'Undecided'],
            required: true
        },
        insuranceProvider: {
            type: String,
            trim: true
        },
        hasCoverageVerified: {
            type: Boolean,
            default: false
        }
    },

    // Current Challenges
    currentChallenges: [{
        type: String,
        enum: [
            'High cost in home country',
            'Long waiting times',
            'Lack of specialized care',
            'Looking for second opinion',
            'Seeking alternative treatments',
            'Insurance doesn\'t cover procedure',
            'Other'
        ]
    }],

    // Travel Preferences
    travelInfo: {
        travelWithCompanion: {
            type: Boolean,
            default: false
        },
        numberOfCompanions: {
            type: Number,
            min: 0,
            max: 5,
            default: 0
        },
        needVisaAssistance: {
            type: Boolean,
            default: false
        },
        needAccommodationArrangement: {
            type: Boolean,
            default: false
        },
        estimatedStayDuration: {
            type: String,
            enum: ['Less than 1 week', '1-2 weeks', '2-4 weeks', 'Over 1 month', 'Unsure']
        }
    },

    // Additional Information
    additionalInfo: {
        medicalRecordsAvailable: {
            type: Boolean,
            default: false
        },
        howDidYouHear: {
            type: String,
            enum: ['Google Search', 'Social Media', 'Friend/Family Referral', 'Medical Professional', 'Other']
        },
        specialRequests: {
            type: String,
            maxlength: 1000
        }
    },

    // Uploaded Documents
    uploadedFiles: [{
        fileName: String,
        fileType: String,
        fileUrl: String,
        uploadDate: {
            type: Date,
            default: Date.now
        }
    }],

    // Status Tracking
    status: {
        type: String,
        enum: ['New', 'Under Review', 'Quote Sent', 'Consultation Scheduled', 'Planning', 'Confirmed', 'Completed', 'Cancelled'],
        default: 'New'
    },

    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },

    notes: [{
        author: String,
        content: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],

    // Follow-up
    followUpDate: Date,
    lastContactDate: Date,

    // Metadata
    ipAddress: String,
    userAgent: String,
    submissionSource: {
        type: String,
        default: 'Website Form'
    }

}, {
    timestamps: true
});

// Indexes for better query performance
consultationSchema.index({ 'personalInfo.email': 1 });
consultationSchema.index({ status: 1 });
consultationSchema.index({ createdAt: -1 });
consultationSchema.index({ 'medicalIntent.serviceType': 1 });

// Virtual for full name
consultationSchema.virtual('fullName').get(function() {
    return `${this.personalInfo.firstName} ${this.personalInfo.lastName}`;
});

module.exports = mongoose.model('Consultation', consultationSchema);
