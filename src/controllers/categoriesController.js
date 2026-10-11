const categoriesService = require("../services/categoriesService");
const { isNonEmptyString } = require("../utils/validators");

async function getActiveCategories(req, res, next) {
  try {
    const categories = await categoriesService.getActiveCategories();

    return res.status(200).json({
      categories,
    });
  } catch (error) {
    next(error);
  }
}

async function createCategory(req, res, next) {
  try {
    const { name } = req.body;

    if (!isNonEmptyString(name)) {
      return res.status(400).json({
        message: "O nome da categoria é obrigatório.",
      });
    }

    const normalizedName = name.trim();

    if (normalizedName.length > 100) {
      return res.status(400).json({
        message: "O nome da categoria deve ter no máximo 100 caracteres.",
      });
    }

    const category = await categoriesService.createCategory(normalizedName);

    return res.status(201).json({
      message: "Categoria criada com sucesso.",
      category,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        message: "Já existe uma categoria com este nome.",
      });
    }

    next(error);
  }
}

async function updateCategoryStatus(req, res, next) {
  try {
    const categoryId = req.params.id;
    const { active } = req.body;

    if (typeof active !== "boolean") {
      return res.status(400).json({
        message: "O campo active deve ser booleano.",
      });
    }

    const category = await categoriesService.updateCategoryStatus(
      categoryId,
      active
    );

    if (!category) {
      return res.status(404).json({
        message: "Categoria não encontrada.",
      });
    }

    return res.status(200).json({
      message: active
        ? "Categoria ativada com sucesso."
        : "Categoria desativada com sucesso.",
      category,
    });
  } catch (error) {
    next(error);
  }
}

async function updateCategoryName(req, res, next) {
  try {
    const categoryId = req.params.id;
    const { name } = req.body;

    if (!isNonEmptyString(name)) {
      return res.status(400).json({
        message: "O nome da categoria é obrigatório.",
      });
    }

    const normalizedName = name.trim();

    if (normalizedName.length > 100) {
      return res.status(400).json({
        message: "O nome da categoria deve ter no máximo 100 caracteres.",
      });
    }

    const category = await categoriesService.updateCategoryName(
      categoryId,
      normalizedName
    );

    if (!category) {
      return res.status(404).json({
        message: "Categoria não encontrada.",
      });
    }

    return res.status(200).json({
      message: "Categoria atualizada com sucesso.",
      category,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        message: "Já existe uma categoria com este nome.",
      });
    }

    next(error);
  }
}

module.exports = {
  getActiveCategories,
  createCategory,
  updateCategoryStatus,
  updateCategoryName,
};