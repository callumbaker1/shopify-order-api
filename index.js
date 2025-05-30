import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import { apiKeys } from './keys.js';

dotenv.config();
const app = express();
app.use(express.json());

const RATE_TABLE = {
  'roll cutting': 4.5,
  'roll laminating and cutting': 6.5,
  'foiling': 5.0,
  'foiling and cutting': 7.0,
  'wide format printing': 12.0
};

function convertToM2(width, height, unit) {
  if (unit === 'mm') {
    return (width / 1000) * (height / 1000);
  } else if (unit === 'cm') {
    return (width / 100) * (height / 100);
  } else if (unit === 'in') {
    return (width * 0.0254) * (height * 0.0254);
  } else {
    throw new Error('Invalid unit provided');
  }
}

// API key middleware
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
  try {
    const { width, height, unit, quantity = 1, jobType, customer, note = '', properties = [] } = req.body;

    const area = convertToM2(width, height, unit);
    const rate = RATE_TABLE[jobType.toLowerCase()];
    if (!rate) return res.status(400).json({ error: 'Invalid jobType provided' });

    const price = parseFloat((area * rate * quantity).toFixed(2));

    const orderPayload = {
      order: {
        line_items: [
          {
            title: jobType,
            quantity: 1,
            price,
            properties: [
              { name: 'Width', value: `${width} ${unit}` },
              { name: 'Height', value: `${height} ${unit}` },
              { name: 'Area (m²)', value: area.toFixed(3) },
              ...properties
            ]
          }
        ],
        customer,
        financial_status: 'pending',
        note: `Created by ${req.customerId} via API. ${note}`
      }
    };

    const response = await shopify.post('/orders.json', orderPayload);
    const order = response.data.order;

    res.json({
      success: true,
      order_id: order.id,
      order_name: order.name,
      total_price: order.total_price,
      view_url: order.order_status_url
    });
  } catch (error) {
    console.error('❌ Order creation failed:', error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || 'Order creation failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API running on port ${PORT}`);
});
