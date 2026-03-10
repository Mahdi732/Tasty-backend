export const ok = (res, data, statusCode = 200, meta) =>
  res.status(statusCode).json({ success: true, data, meta });

export const fail = (res, statusCode, error) =>
  res.status(statusCode).json({ success: false, error });

