require('dotenv').config();
const axios = require('axios');

// Configure your Shopify API connection
const shopify = axios.create({
  baseURL: `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2023-10`,
  headers: {
    'X-Shopify-Access-Token': process.env.SHOPIFY_API_KEY,
    'Content-Type': 'application/json',
  },
});

async function createAndCompleteDraftOrder() {
  try {
    // Step 1: Create the draft order
    const draftRes = await shopify.post('/draft_orders.json', {
      draft_order: {
        line_items: [
          {
            title: "Custom API Product",
            price: "12.34", // Replace with dynamic value if needed
            quantity: 1
          }
        ],
        customer: {
          email: "customer@example.com" // Replace with real email if needed
        },
        note: "API-generated order"
      }
    });

    const draftOrder = draftRes.data.draft_order;

    // Step 2: Complete draft as 'payment pending'
    const completeRes = await shopify.post(`/draft_orders/${draftOrder.id}/complete.json`, {
      payment_pending: true
    });

    console.log('✅ Order created and marked as payment pending:');
    console.log(completeRes.data);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Run the function
createAndCompleteDraftOrder();