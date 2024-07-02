const paypal = require("paypal-rest-sdk");

paypal.configure({
  mode: "sandbox", // change to 'live' for production
  client_id:
    "AUxlmigMu9PMstTkBV-t5sDEKVP1D1nKPGKK9Jw7wccCNIkby0QGl-SKgffnJjLr-zeAEA_FFVPrA5ZT",
  client_secret:
    "EGH3t2k9KJU4QBNpwNbi4QzbmPFZLV3NDJdVv11Kyqm7jzIscLl3SAg5-diVAvBnxADrHuHc49-9w_y8",
});

const createPaypalPayment = async (totalPrice) => {
  const create_payment_json = {
    intent: "sale",
    payer: {
      payment_method: "paypal",
    },
    redirect_urls: {
      return_url: "http://localhost:3000/success",
      cancel_url: "http://localhost:3000/cancel",
    },
    transactions: [
      {
        amount: {
          total: totalPrice.toFixed(2), // ensure total is formatted properly
          currency: "USD",
        },
      },
    ],
  };

  return new Promise((resolve, reject) => {
    paypal.payment.create(create_payment_json, function (error, payment) {
      if (error) {
        reject(error);
      } else {
        resolve(payment.links.find((link) => link.rel === "approval_url").href);
      }
    });
  });
};

module.exports = { createPaypalPayment };
