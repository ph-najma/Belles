// helpers/excelHelper.js
import ExcelJS from "exceljs";

export const createDailySalesExcel = async (orders) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Daily Sales");

  worksheet.columns = [
    { header: "SL.NO", key: "slNo", width: 10 },
    { header: "USERNAME", key: "userName", width: 30 },
    { header: "PRODUCT", key: "productName", width: 30 },
    { header: "QUANTITY", key: "quantity", width: 10 },
    { header: "TOTAL PRICE", key: "totalPrice", width: 15 },
    { header: "DISCOUNT", key: "discount", width: 15 },
    { header: "COUPON DEDUCTION", key: "couponDeduction", width: 20 },
    { header: "PAYMENT TYPE", key: "paymentType", width: 20 },
    { header: "STATUS", key: "status", width: 15 },
  ];

  orders.forEach((order, index) => {
    order.productDetails.forEach((product, productIndex) => {
      worksheet.addRow({
        slNo: productIndex === 0 ? index + 1 : "",
        orderId: productIndex === 0 ? order._id : "",
        userName: productIndex === 0 ? order.user.name : "",
        productName: product.name,
        quantity: order.item[productIndex].quantity,
        totalPrice:
          order.item[productIndex].quantity * order.item[productIndex].price,
        discount: productIndex === 0 ? order.discount.toFixed(2) : "",
        couponDeduction:
          productIndex === 0 ? order.couponDeduction.toFixed(2) : "",
        paymentType: productIndex === 0 ? order.paymentType : "",
        status: productIndex === 0 ? order.status : "",
      });
    });
  });

  await workbook.xlsx.writeFile("DailySalesReport.xlsx");
};
