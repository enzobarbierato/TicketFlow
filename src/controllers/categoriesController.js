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

module.exports = {
  getActiveCategories,
};