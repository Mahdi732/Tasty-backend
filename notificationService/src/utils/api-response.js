export const ok = (res, data, status = 200, meta = undefined) => {
  const payload = { success: true, data };
  if (meta !== undefined) payload.meta = meta;
  return res.status(status).json(payload);
};
