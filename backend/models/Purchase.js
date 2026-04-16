const mongoose = require('mongoose');

const PurchaseSchema = new mongoose.Schema({
    supplierName: {
        type: String,
        required: [true, 'Please add a supplier name'],
        trim: true
    },
    componentRef: {
        type: mongoose.Schema.ObjectId,
        ref: 'Component',
        required: true
    },
    quantity: {
        type: Number,
        required: [true, 'Please add purchased quantity'],
        min: [1, 'Must purchase at least 1']
    },
    totalCost: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Purchase', PurchaseSchema);
