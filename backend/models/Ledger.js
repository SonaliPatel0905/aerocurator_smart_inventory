const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
    supplier: { type: String, required: true },
    component_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Component', required: true },
    quantity: { type: Number, required: true, min: 1 },
    cost_per_unit: { type: Number, required: true },
    total_cost: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    notes: { type: String, default: "" }
});

const saleSchema = new mongoose.Schema({
    customer: { type: String, required: true },
    component_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Component', required: true },
    quantity: { type: Number, required: true, min: 1 },
    price_per_unit: { type: Number, required: true },
    total_price: { type: Number, required: true },
    date: { type: Date, default: Date.now }
});

// JSON formatting mappings
purchaseSchema.set('toJSON', { transform: (doc, ret) => { ret.id = ret._id; delete ret._id; delete ret.__v; return ret; } });
saleSchema.set('toJSON', { transform: (doc, ret) => { ret.id = ret._id; delete ret._id; delete ret.__v; return ret; } });

const Purchase = mongoose.model('Purchase', purchaseSchema);
const Sale = mongoose.model('Sale', saleSchema);

module.exports = { Purchase, Sale };
