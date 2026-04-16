const Component = require('../models/Component');

// @desc    Get all components
// @route   GET /api/inventory
// @access  Private
exports.getComponents = async (req, res, next) => {
    try {
        let query;

        // Copy req.query
        const reqQuery = { ...req.query };

        // Fields to exclude
        const removeFields = ['select', 'sort', 'page', 'limit', 'search'];
        removeFields.forEach(param => delete reqQuery[param]);

        // Stringify query to create operators ($gt, $gte, etc)
        let queryStr = JSON.stringify(reqQuery);
        queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

        // Base find
        let findQuery = JSON.parse(queryStr);

        // Search logic
        if (req.query.search) {
            findQuery = {
                ...findQuery,
                $or: [
                    { name: { $regex: req.query.search, $options: 'i' } },
                    { sku: { $regex: req.query.search, $options: 'i' } }
                ]
            };
        }

        query = Component.find(findQuery);

        // Sort
        if (req.query.sort) {
            const sortBy = req.query.sort.split(',').join(' ');
            query = query.sort(sortBy);
        } else {
            query = query.sort('-createdAt');
        }

        // Pagination
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const total = await Component.countDocuments(findQuery);

        query = query.skip(startIndex).limit(limit);

        // Execute query
        const components = await query;

        // Pagination result
        const pagination = {};
        if (endIndex < total) {
            pagination.next = { page: page + 1, limit };
        }
        if (startIndex > 0) {
            pagination.prev = { page: page - 1, limit };
        }

        res.status(200).json({
            success: true,
            count: components.length,
            total,
            pagination,
            data: components
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single component
// @route   GET /api/inventory/:id
// @access  Private
exports.getComponent = async (req, res, next) => {
    try {
        const component = await Component.findById(req.params.id);
        if (!component) {
            return res.status(404).json({ success: false, error: 'Component not found' });
        }
        res.status(200).json({ success: true, data: component });
    } catch (error) {
        next(error);
    }
};

// @desc    Create new component
// @route   POST /api/inventory
// @access  Private
exports.createComponent = async (req, res, next) => {
    try {
        const component = await Component.create(req.body);
        res.status(201).json({ success: true, data: component });
    } catch (error) {
        next(error);
    }
};

// @desc    Update component
// @route   PUT /api/inventory/:id
// @access  Private
exports.updateComponent = async (req, res, next) => {
    try {
        let component = await Component.findById(req.params.id);
        if (!component) {
            return res.status(404).json({ success: false, error: 'Component not found' });
        }

        component = await Component.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({ success: true, data: component });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete component
// @route   DELETE /api/inventory/:id
// @access  Private/Admin
exports.deleteComponent = async (req, res, next) => {
    try {
        const component = await Component.findById(req.params.id);
        if (!component) {
            return res.status(404).json({ success: false, error: 'Component not found' });
        }

        await component.deleteOne();
        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        next(error);
    }
};
