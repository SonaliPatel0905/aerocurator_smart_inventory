const mongoose = require('mongoose');

const ComponentSchema = new mongoose.Schema({
    sku: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    name: {
        type: String,
        required: [true, 'Please add a component name'],
        trim: true
    },
    category: {
        type: String,
        required: [true, 'Please select a category'],
        enum: ['Motors', 'Batteries', 'ESCs', 'Sensors', 'Propellers', 'Frames', 'Electronics', 'Other'],
        default: 'Other'
    },
    quantity: {
        type: Number,
        default: 0,
        min: [0, 'Quantity cannot be below 0']
    },
    price: {
        type: Number,
        required: [true, 'Please add a default unit price']
    },
    minStockThreshold: {
        type: Number,
        default: 10
    }
}, { timestamps: true });

// Add index for fast searches
ComponentSchema.index({ name: 'text', sku: 'text' });

module.exports = mongoose.model('Component', ComponentSchema);
