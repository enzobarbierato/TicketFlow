const categoriesService = require("../services/categoriesService");

async function getActiveCategories(req, res) {
  try {
    const categories = await categoriesService.getActiveCategories();

    return res.status(200).json({
      categories,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Erro interno do servidor.",
    });
  }
}

async function createCategory(req, res) {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "O nome da categoria é obrigatório.",
      });
    }

    const category = await categoriesService.createCategory(
      name.trim()
    );

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

    console.error(error);

    return res.status(500).json({
      message: "Erro interno do servidor.",
    });
  }
}

module.exports = {
  getActiveCategories,
  createCategory,
};