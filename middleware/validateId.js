function validateQueryParam(paramName, validatorFn) {
  return function (req, res, next) {
    const paramValue = req.query[paramName];

    if (!paramValue || !validatorFn(paramValue)) {
      return res
        .status(400)
        .render("error", { message: `Invalid ${paramName}` });
    }

    next();
  };
}

function isValidProductId(productId) {
  return productId.match(/^[0-9a-fA-F]{24}$/);
}
module.exports = {
  validateQueryParam,
  isValidProductId,
};
