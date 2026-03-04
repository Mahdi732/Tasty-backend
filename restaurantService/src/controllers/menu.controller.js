import { ok } from '../utils/api-response.js';

export class MenuController {
  constructor(menuService) {
    this.menuService = menuService;
  }

  createCategory = async (req, res) => {
    const category = await this.menuService.createCategory(req.params.id, req.auth, req.body);
    return ok(res, category, 201);
  };

  listCategories = async (req, res) => {
    const categories = await this.menuService.listCategories(req.params.id, req.auth);
    return ok(res, categories);
  };

  updateCategory = async (req, res) => {
    const category = await this.menuService.updateCategory(
      req.params.id,
      req.params.categoryId,
      req.auth,
      req.body
    );
    return ok(res, category);
  };

  deleteCategory = async (req, res) => {
    const result = await this.menuService.deleteCategory(req.params.id, req.params.categoryId, req.auth);
    return ok(res, result);
  };

  createItem = async (req, res) => {
    const item = await this.menuService.createItem(req.params.id, req.auth, req.body);
    return ok(res, item, 201);
  };

  listItems = async (req, res) => {
    const items = await this.menuService.listItems(req.params.id, req.auth);
    return ok(res, items);
  };

  updateItem = async (req, res) => {
    const item = await this.menuService.updateItem(req.params.id, req.params.itemId, req.auth, req.body);
    return ok(res, item);
  };

  deleteItem = async (req, res) => {
    const result = await this.menuService.deleteItem(req.params.id, req.params.itemId, req.auth);
    return ok(res, result);
  };

  setAvailability = async (req, res) => {
    const item = await this.menuService.setAvailability(req.params.id, req.auth, req.body.availability);
    return ok(res, item);
  };

  setPublish = async (req, res) => {
    const item = await this.menuService.setPublish(req.params.id, req.auth, req.body.isPublished);
    return ok(res, item);
  };
}
