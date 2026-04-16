const mongoose = require('mongoose');

const SaleSchema = new mongoose.Schema({
    clientName: {
        type: String,
        required: [true, 'Please add client name'],
        trim: true
    },
    componentRef: {
        type: mongoose.Schema.ObjectId,
        ref: 'Component',
        required: true
    },
    quantitySold: {
        type: Number,
        required: [true, 'Please add sales quantity'],
        min: [1, 'Must sell at least 1']
    },
    totalPrice: {
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

module.exports = mongoose.model('Sale', SaleSchema);
