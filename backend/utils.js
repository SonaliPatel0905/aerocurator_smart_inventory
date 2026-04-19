// Shared utility functions to match the Flask response format

const ok = (res, data = null, message = "success", status = 200) => {
    const body = { status: "ok", message };
    if (data !== null) body.data = data;
    return res.status(status).json(body);
};

const err = (res, message = "An error occurred", status = 400) => {
    return res.status(status).json({ status: "error", message });
};

module.exports = { ok, err };
