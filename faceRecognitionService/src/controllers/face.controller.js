import { ok } from '../utils/api-response.js';

export class FaceController {
  constructor(faceService) {
    this.faceService = faceService;
  }

  activate = async (req, res) => {
    const result = await this.faceService.activate(req.body, { requestId: req.requestId });
    return ok(res, result, 201);
  };

  compareIdWithFace = async (req, res) => {
    const result = await this.faceService.compareIdWithFace(req.body, { requestId: req.requestId });
    return ok(res, result);
  };

  search = async (req, res) => {
    const result = await this.faceService.search(req.body, { requestId: req.requestId });
    return ok(res, result);
  };

  verify = async (req, res) => {
    const result = await this.faceService.verify(req.body, { requestId: req.requestId });
    return ok(res, result);
  };
}
