const mongoose = require('mongoose');

const componentSchema = new mongoose.Schema({
    sku: { type: String, default: null },
    name: { type: String, required: true },
    category: { type: String, required: true },
    quantity: { type: Number, default: 0, min: 0 },
    price: { type: Number, default: 0.0 },
    low_stock_threshold: { type: Number, default: 10 }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

componentSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model('Component', componentSchema);
