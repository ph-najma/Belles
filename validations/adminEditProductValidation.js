let productname = true;
let productStock = true;
let productPrice = true;
let productOfferPrice = true;
let productBrand = true;
let productQuantity = true;
let productDesc = true;
let productCategory = true;
let productImages = true;
function updateSubmitButton() {
  const submitButton = document.getElementById("submitButton");

  if (
    productStock &&
    productname &&
    productPrice &&
    productOfferPrice &&
    productBrand &&
    productQuantity &&
    productDesc &&
    productCategory &&
    productImages
  ) {
    submitButton.removeAttribute("disabled");
  } else {
    submitButton.setAttribute("disabled", "disabled");
  }
}

function validateName() {
  let name = document.getElementById("name").value;
  const nameRegex = /^[A-Za-z\s]+$/;
  if (!name) {
    productname = false;
    document.getElementById("nameError").innerText = "Name is required";
  } else if (!name.match(nameRegex)) {
    productname = false;
    document.getElementById("nameError").innerText =
      "Name can only contain letters and spaces";
  } else {
    productname = true;
    document.getElementById("nameError").innerText = "";
    updateSubmitButton();
  }
}

function validatePrice() {
  let price = document.getElementById("price").value;
  if (!price) {
    productPrice = false;
    document.getElementById("priceError").innerText =
      "Product price is required";
  } else if (price <= 0) {
    productPrice = false;
    document.getElementById("priceError").innerText =
      "Product price can't be a negative value or zero";
  } else {
    productPrice = true;
    document.getElementById("priceError").innerText = "";
    updateSubmitButton();
  }
}

function validateOfferPrice() {
  let price = document.getElementById("price").value;
  let offerprice = document.getElementById("offerprice").value;
  if (!offerprice) {
    productOfferPrice = false;
    document.getElementById("offerpriceError").innerText =
      "Offer price is required";
  } else if (offerprice <= 0) {
    productOfferPrice = false;
    document.getElementById("offerpriceError").innerText =
      "Product offer price can't be a negative value or zero";
  } else if (price <= offerprice) {
    productOfferPrice = false;
    document.getElementById("offerpriceError").innerText =
      "Product offer price can't be a greater than price";
  } else {
    productOfferPrice = true;
    document.getElementById("offerpriceError").innerText = "";
    updateSubmitButton();
  }
}

function validateBrand() {
  let brand = document.getElementById("brand").value;

  if (!brand) {
    productBrand = false;
    document.getElementById("brandError").innerText = "Brand is required";
  } else {
    productBrand = true;
    document.getElementById("brandError").innerText = "";
    updateSubmitButton();
  }
}
function validateProductStock() {
  let stock = document.getElementById("stock").value;
  if (!stock) {
    productStock = false;
    document.getElementById("stockError").innerText =
      "Product stock is required";
  } else if (stock <= 0) {
    productStock = false;
    document.getElementById("stockError").innerText =
      "Product stock can't be a negative value or zero";
  } else {
    productStock = true;
    document.getElementById("stockError").innerText = "";
    updateSubmitButton();
  }
}
function validateQuantity() {
  let quantity = document.getElementById("qty").value;
  if (!quantity) {
    productQuantity = false;
    document.getElementById("quantityError").innerText =
      "Product quantity is required";
  } else if (quantity <= 0) {
    productQuantity = false;
    document.getElementById("quantityError").innerText =
      "Product quantity can't be a negative value or zero";
  } else {
    productQuantity = true;
    document.getElementById("quantityError").innerText = "";
    updateSubmitButton();
  }
}

function validatedesc() {
  let desc = document.getElementById("desc").value;

  if (!desc) {
    productDesc = false;
    document.getElementById("descError").innerText = "Description is required";
  } else {
    productDesc = true;
    document.getElementById("descError").innerText = "";
    updateSubmitButton();
  }
}

function validatecategory() {
  let category = document.getElementById("category").value;

  if (!category) {
    productCategory = false;
    document.getElementById("categoryError").innerText = "category is required";
  } else {
    productCategory = true;
    document.getElementById("categoryError").innerText = "";
    updateSubmitButton();
  }
}
function validateImages() {
  let files = document.getElementById("images").files;

  if (files.length <= 1) {
    productImages = false;
    document.getElementById("imageError").innerText =
      "Please select at least two image";
  } else {
    productImages = true;
    document.getElementById("imageError").innerText = "";
    updateSubmitButton();
  }
}
