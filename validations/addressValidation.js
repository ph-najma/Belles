let aNumber = false;
let pinCodeValid = false;
let countryNameValid = false;
let addressValid = false;
let cityNameValid = false;

function updateASubmitButton() {
  const submitButton = document.getElementById("aSubmitButton");

  if (
    aNumber &&
    pinCodeValid &&
    countryNameValid &&
    cityNameValid &&
    addressValid
  ) {
    submitButton.removeAttribute("disabled");
  } else {
    submitButton.setAttribute("disabled", "disabled");
  }
}

function validateAMobile() {
  let mobile = document.getElementById("aNumber").value;
  const mobileRegex = /^\d{10}$/;
  if (!mobile) {
    aNumber = false;
    document.getElementById("aNumberError").innerText =
      "Mobile number is required";
  } else if (!mobile.match(mobileRegex)) {
    aNumber = false;
    document.getElementById("aNumberError").innerText =
      "Please enter a valid 10-digit mobile number";
  } else {
    aNumber = true;
    document.getElementById("aNumberError").innerText = "";
    updateASubmitButton();
  }
}

function validatePinCode() {
  let pinCode = document.getElementById("post").value;
  const pinCodeRegex = /^\d{6}$/;

  if (!pinCode) {
    pinCodeValid = false;
    document.getElementById("pinError").innerText = "Pin code is required";
  } else if (!pinCode.match(pinCodeRegex)) {
    pinCodeValid = false;
    document.getElementById("pinError").innerText =
      "Please enter a valid 6-digit pin code";
  } else {
    pinCodeValid = true;
    document.getElementById("pinError").innerText = "";
    updateASubmitButton();
  }
}

function validateCountryName() {
  let countryName = document.getElementById("country").value.trim();
  const countryNameRegex = /^[a-zA-Z\s]+$/;
  if (!countryName) {
    countryNameValid = false;
    document.getElementById("countryNameError").innerText =
      "Country name is required";
  } else if (!countryName.match(countryNameRegex)) {
    countryNameValid = false;
    document.getElementById("countryNameError").innerText =
      "Please enter a valid country name";
  } else {
    countryNameValid = true;
    document.getElementById("countryNameError").innerText = "";
    updateASubmitButton();
  }
}

function validateCityName() {
  let cityName = document.getElementById("state").value.trim();
  const cityNameRegex = /^[a-zA-Z\s]+$/;
  if (!cityName) {
    cityNameValid = false;
    document.getElementById("cityNameError").innerText =
      "City name is required";
  } else if (!cityName.match(cityNameRegex)) {
    cityNameValid = false;
    document.getElementById("cityNameError").innerText =
      "Please enter a valid city name";
  } else {
    cityNameValid = true;
    document.getElementById("cityNameError").innerText = "";
    updateASubmitButton();
  }
}

function validateAddress() {
  let address = document.getElementById("address").value.trim();
  if (!address) {
    addressValid = false;
    document.getElementById("addressError").innerText = "Address is required";
  } else {
    addressValid = true;
    document.getElementById("addressError").innerText = "";
    updateASubmitButton();
  }
}
