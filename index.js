import express from "express";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());

app.post("/create-order", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (authHeader !== `Bearer ${process.env.API_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const orderData = {
    order: {
      line_items: req.body.line_items,
      customer: req.body.customer,
      shipping_address: req.body.shipping_address,
      billing_address: req.body.billing_address,
      financial_status: "pending"
    }
  };

  try {
    const response = await axios.post(
      `https://${process.env.SHOPIFY_STORE}/admin/api/2024-01/orders.json`,
      orderData,
      {
        headers: {
          "X-Shopify-Access-Token": process.env.SHOPIFY_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    res.status(200).json({ success: true, order: response.data.order });
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

app.get("/", (req, res) => {
  res.send("Shopify Order API is running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
