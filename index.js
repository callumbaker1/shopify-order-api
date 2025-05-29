import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import { apiKeys } from './keys.js';

dotenv.config();
const app = express();
app.use(express.json());

// Auth middleware using API keys
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed authorization header" });
  }

  const token = authHeader.split(" ")[1];
  const customerId = Object.keys(apiKeys).find(id => apiKeys[id] === token);

  if (!customerId) {
    return res.status(401).json({ error: "Invalid API key" });
  }

  req.customerId = customerId;
  next();
});

const shopify = axios.create({
  baseURL: `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2023-10`,
  headers: {
    'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
});

app.post('/create-order', async (req, res) => {

  const { title, price, quantity, customer, properties, note = [] } = req.body;

  try {
    const response = await shopify.post('/orders.json', {
      order: {
        line_items: [
          {
            title,
            price,
            quantity: 1,
            properties
          }
        ],
        customer,
        financial_status: "pending",
        note: note
      }
    });

    return res.status(200).json({ success: true, order: response.data.order });
  } catch (error) {
    console.error('❌ Shopify order error:', error.response?.data || error.message);
    return res.status(500).json({ error: error.response?.data || 'Order creation failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API is live on port ${PORT}`);
});