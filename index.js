import 'dotenv/config';
import axios from 'axios';

const shopify = axios.create({
  baseURL: `https://stickershop1.myshopify.com/admin/api/2023-10`,
  headers: {
    'X-Shopify-Access-Token': process.env.SHOPIFY_API_KEY,
    'Content-Type': 'application/json',
  },
});

async function createCustomOrder() {
  try {
    const draftOrderResponse = await shopify.post('/draft_orders.json', {
      draft_order: {
        line_items: [
          {
            title: "Custom API Product",
            price: "24.99",
            quantity: 1
          }
        ],
        customer: {
          email: "customer@example.com",
          first_name: "John",
          last_name: "Doe"
        },
        note: "Created via API with payment pending",
        use_customer_default_address: true
      }
    });

    const draftOrder = draftOrderResponse.data.draft_order;
    console.log(`✅ Draft order created with ID: ${draftOrder.id}`);

    const completeResponse = await shopify.post(`/draft_orders/${draftOrder.id}/complete.json`, {
      payment_pending: true
    });

    const completedOrder = completeResponse.data;
    console.log(`✅ Draft order completed as real order with ID: ${completedOrder.order.id}`);
    console.log(`🧾 View in Shopify Admin: https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/orders/${completedOrder.order.id}`);
  } catch (error) {
    console.error('❌ Error creating or completing order:', error.response?.data || error.message);
  }
}

createCustomOrder();