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
  },
});

app.post('/create-order', async (req, res) => {
  try {
    const { title, price, quantity, customer } = req.body;

    if (!title || !price || !quantity || !customer?.email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const draftRes = await shopify.post('/draft_orders.json', {
      draft_order: {
        line_items: [
          {
            title,
            price: price.toFixed(2),
            quantity
          }
        ],
        customer,
        note: `API-generated order from ${req.customerId}`,
        use_customer_default_address: true
      }
    });

    const draftOrder = draftRes.data.draft_order;

    const completeRes = await shopify.post(`/draft_orders/${draftOrder.id}/complete.json`, {
      payment_pending: true
    });

    return res.status(200).json({
      message: 'Order created and marked as payment pending',
      orderId: completeRes.data.order.id,
      shopifyUrl: `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/orders/${completeRes.data.order.id}`
    });
  } catch (error) {
    console.error('❌ Error creating or completing order:', error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API is live on port ${PORT}`);
});