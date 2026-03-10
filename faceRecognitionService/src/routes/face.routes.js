import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  activateFaceSchema,
  blacklistByRefSchema,
  compareIdWithFaceSchema,
  searchFaceSchema,
  verifyFaceSchema,
} from '../validators/face.validator.js';

export const buildFaceRoutes = ({ faceController, serviceAuthMiddleware }) => {
  const router = Router();

  router.use(serviceAuthMiddleware);

  router.post('/activate', validate(activateFaceSchema), asyncHandler(faceController.activate));
  router.post('/compare-id', validate(compareIdWithFaceSchema), asyncHandler(faceController.compareIdWithFace));
  router.post('/blacklist/debtor', validate(blacklistByRefSchema), asyncHandler(faceController.blacklistByRef));
  router.post('/search', validate(searchFaceSchema), asyncHandler(faceController.search));
  router.post('/verify', validate(verifyFaceSchema), asyncHandler(faceController.verify));

  return router;
};

